import assert from "node:assert/strict";
import test from "node:test";

// Integration tests against the local dev Postgres (docker-compose, port 5433).
// They skip — rather than fail — when the database is unreachable, so the
// pre-commit test run works without infra up.
process.env.DATABASE_URL ??= "postgres://hostfunc:hostfunc@127.0.0.1:5433/hostfunc-db";

const ORG_ID = "kvtest-org";
const USER_ID = "kvtest-user";
const FN_ID = "kvtest-fn";
const PLAN_ID = "kvtest-plan";

async function databaseReachable(): Promise<boolean> {
  try {
    const { db } = await import("@hostfunc/db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`select 1`);
    return true;
  } catch {
    await closeDatabase();
    return false;
  }
}

/** The client pool keeps the event loop alive — close it or the test runner hangs. */
async function closeDatabase(): Promise<void> {
  const client = (globalThis as { __hostfunc_db__?: { end(): Promise<void> } }).__hostfunc_db__;
  await client?.end();
}

test("kv-store", async (t) => {
  if (!(await databaseReachable())) {
    t.skip("local Postgres (127.0.0.1:5433) is not reachable — run `pnpm infra:up`");
    return;
  }

  const { db, schema } = await import("@hostfunc/db");
  const { eq, sql } = await import("drizzle-orm");
  const { KvError, kvDelete, kvGet, kvGetMany, kvIncr, kvList, kvSet } = await import(
    "../kv-store"
  );

  async function cleanup() {
    await db.delete(schema.subscription).where(eq(schema.subscription.orgId, ORG_ID));
    await db.delete(schema.fn).where(eq(schema.fn.id, FN_ID));
    await db.delete(schema.organization).where(eq(schema.organization.id, ORG_ID));
    await db.delete(schema.plan).where(eq(schema.plan.id, PLAN_ID));
    await db.delete(schema.user).where(eq(schema.user.id, USER_ID));
  }

  await cleanup();
  await db.insert(schema.user).values({
    id: USER_ID,
    name: "kv test",
    email: `kvtest-${Date.now()}@example.com`,
  });
  await db.insert(schema.organization).values({ id: ORG_ID, name: "kv test", slug: "kvtest" });
  await db.insert(schema.fn).values({
    id: FN_ID,
    orgId: ORG_ID,
    createdById: USER_ID,
    slug: "kvtest-fn",
  });
  // A tiny plan makes the quota and value-size paths cheap to exercise.
  await db.insert(schema.plan).values({
    id: PLAN_ID,
    name: "kv test plan",
    slug: "kvtest-plan",
    limits: {
      maxFunctions: 10,
      maxExecutionsPerDay: 1000,
      maxWallMsPerMonth: 1_000_000,
      maxWallMs: 10_000,
      maxCpuMs: 1000,
      maxMemoryMb: 128,
      maxEgressKbPerExecution: 1024,
      maxSubrequestsPerExecution: 20,
      maxCallDepth: 3,
      maxSecretsPerFunction: 10,
      maxTeamMembers: 3,
      maxKvKeysPerFunction: 3,
      maxKvValueBytes: 256,
    },
  });
  await db.insert(schema.subscription).values({
    id: "kvtest-sub",
    orgId: ORG_ID,
    planId: PLAN_ID,
  });

  t.after(async () => {
    await cleanup();
    await closeDatabase();
  });

  await t.test("set/get round-trips JSON values", async () => {
    await kvSet(FN_ID, ORG_ID, "greeting", { hello: "world" });
    assert.deepEqual(await kvGet(FN_ID, "greeting"), {
      found: true,
      value: { hello: "world" },
    });
  });

  await t.test("get returns found:false for missing keys", async () => {
    assert.deepEqual(await kvGet(FN_ID, "nope"), { found: false, value: null });
  });

  await t.test("expired keys read as missing and free their quota slot", async () => {
    await kvSet(FN_ID, ORG_ID, "ephemeral", "gone soon", 60);
    await db
      .update(schema.fnKv)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(sql`${schema.fnKv.fnId} = ${FN_ID} and ${schema.fnKv.key} = ${"ephemeral"}`);
    assert.deepEqual(await kvGet(FN_ID, "ephemeral"), { found: false, value: null });
    // The expired row must not count toward the 3-key quota: two more sets fit.
    await kvSet(FN_ID, ORG_ID, "second", 2);
    await kvSet(FN_ID, ORG_ID, "third", 3);
  });

  await t.test("quota rejects a new key but allows overwrites", async () => {
    // greeting, second, third are live — the plan allows exactly 3.
    await assert.rejects(
      () => kvSet(FN_ID, ORG_ID, "fourth", 4),
      (error: unknown) => error instanceof KvError && error.code === "kv_quota_exceeded",
    );
    await kvSet(FN_ID, ORG_ID, "greeting", { hello: "again" });
    assert.deepEqual(await kvGet(FN_ID, "greeting"), {
      found: true,
      value: { hello: "again" },
    });
  });

  await t.test("oversized values are rejected", async () => {
    await assert.rejects(
      () => kvSet(FN_ID, ORG_ID, "greeting", "x".repeat(300)),
      (error: unknown) => error instanceof KvError && error.code === "kv_value_too_large",
    );
  });

  await t.test("delete removes a key and reports whether it existed", async () => {
    assert.equal(await kvDelete(FN_ID, "third"), true);
    assert.equal(await kvDelete(FN_ID, "third"), false);
  });

  await t.test("incr creates at 0, adds deltas, and rejects non-numeric values", async () => {
    assert.equal(await kvIncr(FN_ID, ORG_ID, "counter", 1), 1);
    assert.equal(await kvIncr(FN_ID, ORG_ID, "counter", 5), 6);
    assert.equal(await kvIncr(FN_ID, ORG_ID, "counter", -2), 4);
    await assert.rejects(
      () => kvIncr(FN_ID, ORG_ID, "greeting", 1),
      (error: unknown) => error instanceof KvError && error.code === "kv_not_a_number",
    );
  });

  await t.test("concurrent increments serialize", async () => {
    await kvDelete(FN_ID, "counter");
    // Create the key first — the quota pre-check on brand-new keys is
    // deliberately approximate and would race a concurrent burst of creates.
    await kvIncr(FN_ID, ORG_ID, "counter", 0);
    await Promise.all(Array.from({ length: 10 }, () => kvIncr(FN_ID, ORG_ID, "counter", 1)));
    assert.deepEqual(await kvGet(FN_ID, "counter"), { found: true, value: 10 });
  });

  await t.test("getMany maps missing keys to absent entries", async () => {
    const values = await kvGetMany(FN_ID, ["greeting", "counter", "missing"]);
    assert.deepEqual(values, { greeting: { hello: "again" }, counter: 10 });
  });

  await t.test("list filters by prefix and paginates with a cursor", async () => {
    // Live keys now: greeting, second, counter → replace with a clean prefix set.
    await kvDelete(FN_ID, "greeting");
    await kvDelete(FN_ID, "second");
    await kvDelete(FN_ID, "counter");
    await kvSet(FN_ID, ORG_ID, "item:a", 1);
    await kvSet(FN_ID, ORG_ID, "item:b", 2);
    await kvSet(FN_ID, ORG_ID, "other", 3);

    const all = await kvList(FN_ID, { prefix: "item:" });
    assert.deepEqual(all.keys, ["item:a", "item:b"]);
    assert.equal(all.cursor, null);

    const first = await kvList(FN_ID, { prefix: "item:", limit: 1 });
    assert.deepEqual(first.keys, ["item:a"]);
    assert.equal(first.cursor, "item:a");
    const second = await kvList(FN_ID, { prefix: "item:", limit: 1, cursor: first.cursor ?? "" });
    assert.deepEqual(second.keys, ["item:b"]);
  });

  await t.test("keys are isolated per function", async () => {
    assert.deepEqual(await kvGet("some-other-fn", "item:a"), { found: false, value: null });
  });

  await t.test("invalid keys are rejected", async () => {
    await assert.rejects(
      () => kvSet(FN_ID, ORG_ID, "", 1),
      (error: unknown) => error instanceof KvError && error.code === "kv_invalid_key",
    );
    await assert.rejects(
      () => kvSet(FN_ID, ORG_ID, "x".repeat(513), 1),
      (error: unknown) => error instanceof KvError && error.code === "kv_invalid_key",
    );
  });
});
