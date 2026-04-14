"use server";

import { requireActiveOrg } from "@/lib/session";
import {
  deleteTriggerForFunction,
  listTriggersForFunction,
  toggleTriggerForFunction,
  upsertTriggerForFunction,
} from "@/server/triggers";
import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function assertOrgOwnsFunction(orgId: string, fnId: string) {
  const rows = await db
    .select({ id: schema.fn.id })
    .from(schema.fn)
    .where(and(eq(schema.fn.orgId, orgId), eq(schema.fn.id, fnId)))
    .limit(1);
  if (!rows[0]) throw new Error("not_found");
}

const httpSchema = z.object({
  fnId: z.string(),
  requireAuth: z.boolean(),
});

const cronSchema = z.object({
  fnId: z.string(),
  schedule: z.string().min(1),
  timezone: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
});

const emailSchema = z.object({
  fnId: z.string(),
  address: z.string().email(),
  allowlist: z.array(z.string().email()).optional(),
  enabled: z.boolean().optional(),
});

const mcpSchema = z.object({
  fnId: z.string(),
  toolName: z.string().min(1),
  description: z.string().max(512).default(""),
  enabled: z.boolean().optional(),
});

export async function loadTriggers(fnId: string) {
  const { orgId } = await requireActiveOrg();
  await assertOrgOwnsFunction(orgId, fnId);
  return listTriggersForFunction(orgId, fnId);
}

export async function saveHttpTrigger(input: z.infer<typeof httpSchema>) {
  const { orgId } = await requireActiveOrg();
  const parsed = httpSchema.parse(input);
  await assertOrgOwnsFunction(orgId, parsed.fnId);
  await upsertTriggerForFunction({
    orgId,
    fnId: parsed.fnId,
    kind: "http",
    enabled: true,
    config: { http: { requireAuth: parsed.requireAuth } },
  });
  revalidatePath(`/dashboard/${parsed.fnId}/settings/triggers`);
}

export async function saveCronTrigger(input: z.infer<typeof cronSchema>) {
  const { orgId } = await requireActiveOrg();
  const parsed = cronSchema.parse(input);
  await assertOrgOwnsFunction(orgId, parsed.fnId);
  await upsertTriggerForFunction({
    orgId,
    fnId: parsed.fnId,
    kind: "cron",
    enabled: parsed.enabled ?? true,
    config: { cron: { schedule: parsed.schedule, timezone: parsed.timezone } },
  });
  revalidatePath(`/dashboard/${parsed.fnId}/settings/triggers`);
}

export async function saveEmailTrigger(input: z.infer<typeof emailSchema>) {
  const { orgId } = await requireActiveOrg();
  const parsed = emailSchema.parse(input);
  await assertOrgOwnsFunction(orgId, parsed.fnId);
  await upsertTriggerForFunction({
    orgId,
    fnId: parsed.fnId,
    kind: "email",
    enabled: parsed.enabled ?? true,
    config: { email: { address: parsed.address, allowlist: parsed.allowlist ?? [] } },
  });
  revalidatePath(`/dashboard/${parsed.fnId}/settings/triggers`);
}

export async function saveMcpTrigger(input: z.infer<typeof mcpSchema>) {
  const { orgId } = await requireActiveOrg();
  const parsed = mcpSchema.parse(input);
  await assertOrgOwnsFunction(orgId, parsed.fnId);
  await upsertTriggerForFunction({
    orgId,
    fnId: parsed.fnId,
    kind: "mcp",
    enabled: parsed.enabled ?? true,
    config: { mcp: { toolName: parsed.toolName, description: parsed.description } },
  });
  revalidatePath(`/dashboard/${parsed.fnId}/settings/triggers`);
}

export async function setTriggerEnabled(fnId: string, kind: "http" | "cron" | "email" | "mcp", enabled: boolean) {
  const { orgId } = await requireActiveOrg();
  await assertOrgOwnsFunction(orgId, fnId);
  await toggleTriggerForFunction({ orgId, fnId, kind, enabled });
  revalidatePath(`/dashboard/${fnId}/settings/triggers`);
}

export async function removeTrigger(fnId: string, kind: "cron" | "email" | "mcp") {
  const { orgId } = await requireActiveOrg();
  await assertOrgOwnsFunction(orgId, fnId);
  await deleteTriggerForFunction(orgId, fnId, kind);
  revalidatePath(`/dashboard/${fnId}/settings/triggers`);
}
