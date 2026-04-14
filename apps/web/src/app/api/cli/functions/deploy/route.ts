import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import { requireCliActor } from "@/server/cli-auth";
import { executor } from "@/server/executor";
import { getOrgPlan } from "@/server/plan";
import { db, genId, schema } from "@hostfunc/db";
import { and, eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const actor = await requireCliActor(req.headers.get("authorization"));
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { fnId?: string } | null;
  if (!body?.fnId) return Response.json({ error: "invalid_body" }, { status: 400 });

  const fnRows = await db
    .select({
      id: schema.fn.id,
      slug: schema.fn.slug,
      owner: schema.fn.createdById,
      currentVersionId: schema.fn.currentVersionId,
    })
    .from(schema.fn)
    .where(and(eq(schema.fn.id, body.fnId), eq(schema.fn.orgId, actor.orgId)))
    .limit(1);
  const fnRow = fnRows[0];
  if (!fnRow) return Response.json({ error: "not_found" }, { status: 404 });
  const orgPlan = await getOrgPlan(actor.orgId);
  const maxActiveFunctions = orgPlan?.limits.maxFunctions ?? 3;

  const drafts = await db
    .select()
    .from(schema.fnDraft)
    .where(and(eq(schema.fnDraft.fnId, body.fnId), eq(schema.fnDraft.userId, actor.userId)))
    .limit(1);
  const code = drafts[0]?.code;
  if (!code) return Response.json({ error: "nothing_to_deploy" }, { status: 400 });

  if (!fnRow.currentVersionId) {
    const activeCountRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.fn)
      .where(and(eq(schema.fn.orgId, actor.orgId), sql`${schema.fn.currentVersionId} is not null`))
      .limit(1);
    const activeCount = activeCountRows[0]?.count ?? 0;
    if (activeCount >= maxActiveFunctions) {
      return Response.json(
        { error: `plan_limit_exceeded:max_active_functions:${maxActiveFunctions}` },
        { status: 429 },
      );
    }
  }

  const versionId = genId("ver");
  const sizeBytes = Buffer.byteLength(code, "utf8");
  const sha256 = createHash("sha256").update(code).digest("hex");

  await db.insert(schema.fnVersion).values({
    id: versionId,
    fnId: body.fnId,
    orgId: actor.orgId,
    code,
    sizeBytes,
    sha256,
    status: "deploying",
    createdById: actor.userId,
  });

  try {
    const result = await executor.deploy({
      functionId: body.fnId,
      versionId,
      orgId: actor.orgId,
      bundle: { code, sizeBytes, sha256 },
      limits: {
        wallMs: orgPlan?.limits.maxWallMs ?? 10_000,
        cpuMs: orgPlan?.limits.maxCpuMs ?? 1_000,
        memoryMb: orgPlan?.limits.maxMemoryMb ?? 128,
        egressKb: orgPlan?.limits.maxEgressKbPerExecution ?? 1024,
        subrequests: orgPlan?.limits.maxSubrequestsPerExecution ?? 20,
        maxCallDepth: orgPlan?.limits.maxCallDepth ?? 3,
      },
      secretRefs: [],
    });

    await db
      .update(schema.fnVersion)
      .set({
        status: "deployed",
        backendHandle: result.handle,
        warnings: result.warnings ?? [],
      })
      .where(eq(schema.fnVersion.id, versionId));

    await db
      .update(schema.fn)
      .set({ currentVersionId: versionId, updatedAt: new Date() })
      .where(eq(schema.fn.id, body.fnId));

    return Response.json({
      ok: true,
      versionId,
      runUrl: `${env.HOSTFUNC_RUNTIME_URL}/run/${fnRow.owner}/${fnRow.slug}`,
    });
  } catch (error) {
    await db.update(schema.fnVersion).set({ status: "failed" }).where(eq(schema.fnVersion.id, versionId));
    return Response.json(
      { error: error instanceof Error ? error.message : "deploy_failed" },
      { status: 500 },
    );
  }
}
