import assert from "node:assert/strict";
import test from "node:test";

// `@hostfunc/db` reads DATABASE_URL at import time. Point it at the local dev
// Postgres (port 5433 — see docker-compose.yml); when that's unreachable the
// whole suite skips rather than fails so CI without infra stays green.
process.env.DATABASE_URL ??= "postgres://hostfunc:hostfunc@127.0.0.1:5433/hostfunc-db";

const { db, genId, schema } = await import("@hostfunc/db");
const { eq, sql } = await import("drizzle-orm");
const { getOnboardingState } = await import("../onboarding");

async function closePool() {
  await (globalThis as { __hostfunc_db__?: { end(): Promise<void> } }).__hostfunc_db__?.end();
}

let reachable = true;
try {
  await db.execute(sql`select 1`);
} catch {
  reachable = false;
}

if (!reachable) {
  test("getOnboardingState (skipped: local Postgres unreachable)", { skip: true }, () => {});
  await closePool();
} else {
  test("getOnboardingState flips steps as onboarding rows are added", async (t) => {
    const userId = genId("usr");
    const orgId = genId("org");
    const fnId = genId("fn");
    const versionId = genId("ver");

    t.after(async () => {
      try {
        // Executions first: execution.version_id references fn_version with
        // ON DELETE RESTRICT, so the org cascade alone can trip it.
        await db.delete(schema.execution).where(eq(schema.execution.orgId, orgId));
        // Org cascade removes fn, fn_version, secret, and trigger rows.
        await db.delete(schema.organization).where(eq(schema.organization.id, orgId));
        await db.delete(schema.user).where(eq(schema.user.id, userId));
      } finally {
        await closePool();
      }
    });

    await db.insert(schema.user).values({
      id: userId,
      name: "Onboarding Test",
      email: `${userId.toLowerCase()}@example.test`,
    });
    await db.insert(schema.organization).values({
      id: orgId,
      name: "Onboarding Test Org",
      slug: `onboarding-test-${userId.toLowerCase()}`,
    });

    // Fresh org: nothing exists yet.
    let state = await getOnboardingState(orgId);
    assert.deepEqual(state, {
      hasFunction: false,
      hasDeployedFn: false,
      hasExecution: false,
      hasSecret: false,
      hasTrigger: false,
      completedCount: 0,
      totalCount: 5,
      complete: false,
    });

    // A saved (undeployed) function — createFunction also inserts the default
    // HTTP trigger, which must NOT count towards the trigger step.
    await db.insert(schema.fn).values({
      id: fnId,
      orgId,
      createdById: userId,
      slug: "onboarding-test-fn",
    });
    await db.insert(schema.trigger).values({
      id: genId("trg"),
      fnId,
      orgId,
      kind: "http",
      config: { http: { requireAuth: false } },
    });
    state = await getOnboardingState(orgId);
    assert.equal(state.hasFunction, true);
    assert.equal(state.hasDeployedFn, false);
    assert.equal(state.hasTrigger, false, "default http trigger must not count");
    assert.equal(state.completedCount, 0);
    assert.equal(state.complete, false);

    // Deploy: version row + currentVersionId pointer.
    await db.insert(schema.fnVersion).values({
      id: versionId,
      fnId,
      orgId,
      code: "export function main() {}",
      sizeBytes: 25,
      sha256: "0".repeat(64),
      status: "deployed",
      createdById: userId,
    });
    await db.update(schema.fn).set({ currentVersionId: versionId }).where(eq(schema.fn.id, fnId));
    state = await getOnboardingState(orgId);
    assert.equal(state.hasDeployedFn, true);
    assert.equal(state.completedCount, 1);

    // First execution completes both "run it" and "see the logs".
    await db.insert(schema.execution).values({
      id: genId("exe"),
      fnId,
      versionId,
      orgId,
      triggerKind: "http",
      status: "ok",
      requestId: genId("exe"),
      startedAt: new Date(),
      endedAt: new Date(),
    });
    state = await getOnboardingState(orgId);
    assert.equal(state.hasExecution, true);
    assert.equal(state.completedCount, 3);

    // A secret on the function.
    await db.insert(schema.secret).values({
      id: genId("sec"),
      fnId,
      orgId,
      key: "API_KEY",
      ciphertext: "dGVzdC1jaXBoZXJ0ZXh0",
      createdById: userId,
    });
    state = await getOnboardingState(orgId);
    assert.equal(state.hasSecret, true);
    assert.equal(state.completedCount, 4);

    // A cron trigger is a user-configured (non-default) trigger.
    await db.insert(schema.trigger).values({
      id: genId("trg"),
      fnId,
      orgId,
      kind: "cron",
      config: { cron: { schedule: "*/5 * * * *" } },
    });
    state = await getOnboardingState(orgId);
    assert.equal(state.hasTrigger, true);
    assert.equal(state.completedCount, 5);
    assert.equal(state.totalCount, 5);
    assert.equal(state.complete, true);
  });
}
