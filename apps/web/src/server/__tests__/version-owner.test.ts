import assert from "node:assert/strict";
import test from "node:test";

// DB-backed: verifies the version→owner lookup that the internal asset route
// uses to scope exec tokens and API tokens to their own org. Skips when the
// local dev Postgres (127.0.0.1:5433) is unreachable.
process.env.DATABASE_URL ??= "postgres://hostfunc:hostfunc@127.0.0.1:5433/hostfunc-db";

const ORG_A = "vowner-org-a";
const ORG_B = "vowner-org-b";
const USER_ID = "vowner-user";
const FN_A = "vowner-fn-a";
const FN_B = "vowner-fn-b";
const VERSION_A = "vowner-ver-a";
const VERSION_B = "vowner-ver-b";

async function closeDatabase(): Promise<void> {
  const client = (globalThis as { __hostfunc_db__?: { end(): Promise<void> } }).__hostfunc_db__;
  await client?.end();
}

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

test("getVersionOwner", async (t) => {
  if (!(await databaseReachable())) {
    t.skip("local Postgres (127.0.0.1:5433) is not reachable — run `pnpm infra:up`");
    return;
  }

  const { db, schema } = await import("@hostfunc/db");
  const { eq, inArray } = await import("drizzle-orm");
  const { getVersionOwner } = await import("../fn-assets");

  async function cleanup() {
    await db.delete(schema.fnVersion).where(inArray(schema.fnVersion.orgId, [ORG_A, ORG_B]));
    await db.delete(schema.fn).where(inArray(schema.fn.id, [FN_A, FN_B]));
    await db.delete(schema.organization).where(inArray(schema.organization.id, [ORG_A, ORG_B]));
    await db.delete(schema.user).where(eq(schema.user.id, USER_ID));
  }

  await cleanup();
  await db
    .insert(schema.user)
    .values({ id: USER_ID, name: "vowner", email: `vowner-${Date.now()}@example.com` });
  await db.insert(schema.organization).values([
    { id: ORG_A, name: "A", slug: "vowner-a" },
    { id: ORG_B, name: "B", slug: "vowner-b" },
  ]);
  await db.insert(schema.fn).values([
    { id: FN_A, orgId: ORG_A, createdById: USER_ID, slug: "fn-a" },
    { id: FN_B, orgId: ORG_B, createdById: USER_ID, slug: "fn-b" },
  ]);
  await db.insert(schema.fnVersion).values([
    {
      id: VERSION_A,
      fnId: FN_A,
      orgId: ORG_A,
      code: "x",
      sizeBytes: 1,
      sha256: "a",
      createdById: USER_ID,
    },
    {
      id: VERSION_B,
      fnId: FN_B,
      orgId: ORG_B,
      code: "x",
      sizeBytes: 1,
      sha256: "b",
      createdById: USER_ID,
    },
  ]);

  t.after(async () => {
    await cleanup();
    await closeDatabase();
  });

  await t.test("returns the owning fn and org for a version", async () => {
    assert.deepEqual(await getVersionOwner(VERSION_A), { fnId: FN_A, orgId: ORG_A });
    assert.deepEqual(await getVersionOwner(VERSION_B), { fnId: FN_B, orgId: ORG_B });
  });

  await t.test("returns null for an unknown version", async () => {
    assert.equal(await getVersionOwner("vowner-nope"), null);
  });

  await t.test("org B's version resolves to org B, never org A (cross-org scoping)", async () => {
    // The asset route rejects when the caller's org != this owner's org, so a
    // token for ORG_A requesting VERSION_B is denied.
    const owner = await getVersionOwner(VERSION_B);
    assert.notEqual(owner?.orgId, ORG_A);
  });
});
