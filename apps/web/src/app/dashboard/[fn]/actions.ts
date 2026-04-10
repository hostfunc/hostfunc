"use server";

import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveOrg } from "@/lib/session";

const saveDraftSchema = z.object({
  fnId: z.string(),
  code: z.string().max(1_000_000),
});

async function assertOrgOwnsFunction(orgId: string, fnId: string) {
  const rows = await db
    .select({ id: schema.fn.id })
    .from(schema.fn)
    .where(and(eq(schema.fn.id, fnId), eq(schema.fn.orgId, orgId)))
    .limit(1);
  if (rows.length === 0) throw new Error("not found");
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

// Fake deploy for v0 — real deploy lives in Component 4
export async function deployFunction(fnId: string) {
  const { orgId } = await requireActiveOrg();
  await assertOrgOwnsFunction(orgId, fnId);
  await new Promise((r) => setTimeout(r, 800));
  return { ok: true, versionId: `ver_${Date.now().toString(36)}` };
}