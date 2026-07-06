import assert from "node:assert/strict";
import test from "node:test";

// Integration tests against the local dev Postgres (docker-compose, port 5433).
// They skip — rather than fail — when the database is unreachable, so the
// pre-commit test run works without infra up.
process.env.DATABASE_URL ??= "postgres://hostfunc:hostfunc@127.0.0.1:5433/hostfunc-db";

const ORG_ID = "exectest-org";
const USER_ID = "exectest-user";
const FN_ID = "exectest-fn";
const VERSION_ID = "exectest-version";

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

test("execution filters", async (t) => {
  if (!(await databaseReachable())) {
    t.skip("local Postgres (127.0.0.1:5433) is not reachable — run `pnpm infra:up`");
    return;
  }

  const { db, schema } = await import("@hostfunc/db");
  const { eq } = await import("drizzle-orm");
  const { getChildExecutions, listExecutions } = await import("../executions");

  async function cleanup() {
    await db.delete(schema.execution).where(eq(schema.execution.orgId, ORG_ID));
    await db.delete(schema.fnVersion).where(eq(schema.fnVersion.orgId, ORG_ID));
    await db.delete(schema.fn).where(eq(schema.fn.id, FN_ID));
    await db.delete(schema.organization).where(eq(schema.organization.id, ORG_ID));
    await db.delete(schema.user).where(eq(schema.user.id, USER_ID));
  }

  await cleanup();
  await db.insert(schema.user).values({
    id: USER_ID,
    name: "exec test",
    email: `exectest-${Date.now()}@example.com`,
  });
  await db
    .insert(schema.organization)
    .values({ id: ORG_ID, name: "exec test", slug: "exectest" });
  await db.insert(schema.fn).values({
    id: FN_ID,
    orgId: ORG_ID,
    createdById: USER_ID,
    slug: "exectest-fn",
  });
  await db.insert(schema.fnVersion).values({
    id: VERSION_ID,
    fnId: FN_ID,
    orgId: ORG_ID,
    code: "export async function main() {}",
    sizeBytes: 32,
    sha256: "exectest",
    createdById: USER_ID,
  });

  const base = {
    fnId: FN_ID,
    versionId: VERSION_ID,
    orgId: ORG_ID,
    triggerKind: "http",
    requestId: "req-exectest",
  } as const;
  const now = Date.now();
  await db.insert(schema.execution).values([
    {
      ...base,
      id: "exectest-ok",
      status: "ok",
      wallMs: 12,
      startedAt: new Date(now - 3000),
      endedAt: new Date(now - 2988),
    },
    {
      ...base,
      id: "exectest-err",
      status: "fn_error",
      wallMs: 40,
      errorCode: "FN_THREW",
      errorMessage: "database timeout while connecting",
      startedAt: new Date(now - 2000),
      endedAt: new Date(now - 1960),
    },
    {
      ...base,
      id: "exectest-child",
      status: "ok",
      triggerKind: "fn_call",
      wallMs: 8,
      parentExecutionId: "exectest-ok",
      callDepth: 1,
      startedAt: new Date(now - 2995),
      endedAt: new Date(now - 2987),
    },
  ]);
  await db.insert(schema.executionLog).values([
    {
      id: "exectest-log-1",
      executionId: "exectest-ok",
      orgId: ORG_ID,
      ts: new Date(now - 2999),
      level: "info",
      message: "payment.processed successfully",
    },
    {
      id: "exectest-log-2",
      executionId: "exectest-err",
      orgId: ORG_ID,
      ts: new Date(now - 1999),
      level: "error",
      message: "upstream 100% failure rate",
    },
  ]);

  t.after(async () => {
    await cleanup();
    await closeDatabase();
  });

  await t.test("q matches log messages case-insensitively", async () => {
    const { items } = await listExecutions({ orgId: ORG_ID, filters: { q: "PAYMENT.processed" } });
    assert.deepEqual(
      items.map((i) => i.id),
      ["exectest-ok"],
    );
  });

  await t.test("q matches the execution error message", async () => {
    const { items } = await listExecutions({ orgId: ORG_ID, filters: { q: "database timeout" } });
    assert.deepEqual(
      items.map((i) => i.id),
      ["exectest-err"],
    );
  });

  await t.test("q escapes LIKE wildcards", async () => {
    // "100%" must match literally, not as "100" + any-suffix.
    const hit = await listExecutions({ orgId: ORG_ID, filters: { q: "100% failure" } });
    assert.deepEqual(
      hit.items.map((i) => i.id),
      ["exectest-err"],
    );
    const miss = await listExecutions({ orgId: ORG_ID, filters: { q: "100%iss" } });
    assert.equal(miss.items.length, 0);
  });

  await t.test("q with no match returns nothing", async () => {
    const { items } = await listExecutions({ orgId: ORG_ID, filters: { q: "zzz-not-there" } });
    assert.equal(items.length, 0);
  });

  await t.test("logLevel filters to executions that logged at that level", async () => {
    const { items } = await listExecutions({ orgId: ORG_ID, filters: { logLevel: ["error"] } });
    assert.deepEqual(
      items.map((i) => i.id),
      ["exectest-err"],
    );
  });

  await t.test("q and logLevel combine", async () => {
    const { items } = await listExecutions({
      orgId: ORG_ID,
      filters: { q: "payment", logLevel: ["error"] },
    });
    assert.equal(items.length, 0);
  });

  await t.test("plain filters still work alongside", async () => {
    const { items } = await listExecutions({
      orgId: ORG_ID,
      filters: { status: ["fn_error"], q: "failure" },
    });
    assert.deepEqual(
      items.map((i) => i.id),
      ["exectest-err"],
    );
  });

  await t.test("getChildExecutions returns direct children in start order", async () => {
    const children = await getChildExecutions(ORG_ID, "exectest-ok");
    assert.equal(children.length, 1);
    assert.equal(children[0]?.id, "exectest-child");
    assert.equal(children[0]?.fnSlug, "exectest-fn");
    assert.equal(children[0]?.callDepth, 1);
    assert.equal((await getChildExecutions(ORG_ID, "exectest-err")).length, 0);
    // Cross-org isolation.
    assert.equal((await getChildExecutions("some-other-org", "exectest-ok")).length, 0);
  });
});
