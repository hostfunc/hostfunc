"use server";

import { env } from "@/lib/env";
import { requireActiveOrg } from "@/lib/session";
import { executor } from "@/server/executor";
import { db, genId, schema, sql } from "@hostfunc/db";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

function compatWhere<T>(value: T): T {
  return value;
}

const saveDraftSchema = z.object({
  fnId: z.string(),
  code: z.string().max(1_000_000),
});

async function assertOrgOwnsFunction(orgId: string, fnId: string) {
  const rows = await db
    .select({ id: schema.fn.id, slug: schema.fn.slug })
    .from(schema.fn)
    .where(compatWhere(sql`${schema.fn.id} = ${fnId} and ${schema.fn.orgId} = ${orgId}`) as never)
    .limit(1);
  if (rows.length === 0) throw new Error("not found");
  const row = rows[0];
  if (!row) throw new Error("not found");
  return row;
}

export async function saveDraft(input: z.infer<typeof saveDraftSchema>) {
  const { session, orgId } = await requireActiveOrg();
  const parsed = saveDraftSchema.parse(input);

  await assertOrgOwnsFunction(orgId, parsed.fnId);

  await db
    .insert(schema.fnDraft)
    .values({
      fnId: parsed.fnId,
      userId: session.user.id,
      code: parsed.code,
    })
    .onConflictDoUpdate({
      target: [schema.fnDraft.fnId, schema.fnDraft.userId],
      set: { code: parsed.code, updatedAt: new Date() },
    });

  revalidatePath(`/dashboard/${parsed.fnId}`);
  return { ok: true };
}

export interface DeployResultUi {
  ok: boolean;
  versionId: string;
  runUrl: string;
}

export async function deployFunction(fnId: string): Promise<DeployResultUi> {
  const { session, orgId } = await requireActiveOrg();
  const fnRow = await assertOrgOwnsFunction(orgId, fnId);

  const drafts = await db
    .select()
    .from(schema.fnDraft)
    .where(
      compatWhere(sql`${schema.fnDraft.fnId} = ${fnId} and ${schema.fnDraft.userId} = ${session.user.id}`) as never,
    )
    .limit(1);

  const code = drafts[0]?.code;
  if (!code) throw new Error("nothing to deploy");

  const versionId = genId("ver");
  const sizeBytes = Buffer.byteLength(code, "utf8");
  const sha256 = createHash("sha256").update(code).digest("hex");

  await db.insert(schema.fnVersion).values({
    id: versionId,
    fnId,
    orgId,
    code,
    sizeBytes,
    sha256,
    status: "deploying",
    createdById: session.user.id,
  });

  try {
    const result = await executor.deploy({
      functionId: fnId,
      versionId,
      orgId,
      bundle: { code, sizeBytes, sha256 },
      limits: {
        wallMs: 10_000,
        cpuMs: 1_000,
        memoryMb: 128,
        egressKb: 1024,
        subrequests: 20,
        maxCallDepth: 3,
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
      .where(compatWhere(sql`${schema.fnVersion.id} = ${versionId}`) as never);

    await db
      .update(schema.fn)
      .set({ currentVersionId: versionId, updatedAt: new Date() })
      .where(compatWhere(sql`${schema.fn.id} = ${fnId}`) as never);

    revalidatePath(`/dashboard/${fnId}`);

    const runUrl = `${env.HOSTFUNC_RUNTIME_URL}/run/${session.user.id}/${fnRow.slug}`;
    return { ok: true, versionId, runUrl };
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    await db
      .update(schema.fnVersion)
      .set({ status: "failed" })
      .where(compatWhere(sql`${schema.fnVersion.id} = ${versionId}`) as never);
    throw new Error(message);
  }
}
