"use server";

import { env } from "@/lib/env";
import { buildInboundAddress } from "@/lib/inbound-address";
import { requireOrgPermission } from "@/lib/session";
import { type DispatchResult, dispatchInboundEmail } from "@/server/inbound-email";
import { getEffectivePlan } from "@/server/plans";
import { ensureResendDomain, isResendInboundConfigured } from "@/server/resend-inbound";
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
  allowlist: z.array(z.string().email()).optional(),
  enabled: z.boolean().optional(),
  /** When true, assign a new platform-generated inbound address. */
  regenerateAddress: z.boolean().optional(),
});

/**
 * The mail domain for a freshly generated address: the function's active
 * custom domain when inbound email is configured for it (Resend), otherwise
 * the platform mail domain for this environment.
 */
async function resolveInboundMailDomain(fnId: string): Promise<string> {
  if (isResendInboundConfigured()) {
    const domainRow = await db.query.customDomain.findFirst({
      where: and(eq(schema.customDomain.fnId, fnId), eq(schema.customDomain.status, "active")),
      columns: { id: true, hostname: true, resendDomainId: true },
    });
    if (domainRow) {
      await ensureResendDomain(domainRow);
      return domainRow.hostname;
    }
  }
  return env.HOSTFUNC_MAIL_DOMAIN;
}

async function generateInboundEmailAddress(orgId: string, fnId: string): Promise<string> {
  const fnRow = await db.query.fn.findFirst({
    where: and(eq(schema.fn.id, fnId), eq(schema.fn.orgId, orgId)),
    columns: { slug: true },
    with: { organization: { columns: { slug: true } } },
  });
  if (!fnRow) throw new Error("not_found");
  const domain = await resolveInboundMailDomain(fnId);
  return buildInboundAddress({ fnSlug: fnRow.slug, orgSlug: fnRow.organization.slug, domain });
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

const mcpSchema = z.object({
  fnId: z.string(),
  toolName: z.string().min(1),
  description: z.string().max(512).default(""),
  enabled: z.boolean().optional(),
});

export async function loadTriggers(fnId: string) {
  const { orgId } = await requireOrgPermission("view_workspace");
  await assertOrgOwnsFunction(orgId, fnId);
  return listTriggersForFunction(orgId, fnId);
}

export async function saveHttpTrigger(input: z.infer<typeof httpSchema>) {
  const { orgId } = await requireOrgPermission("manage_triggers");
  const parsed = httpSchema.parse(input);
  await assertOrgOwnsFunction(orgId, parsed.fnId);
  const plan = await getEffectivePlan(orgId);
  if (parsed.requireAuth && plan.planSlug === "free") {
    throw new Error("http_auth_requires_upgrade");
  }
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
  const { orgId } = await requireOrgPermission("manage_triggers");
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
  const { orgId } = await requireOrgPermission("manage_triggers");
  const parsed = emailSchema.parse(input);
  await assertOrgOwnsFunction(orgId, parsed.fnId);
  const existing = await listTriggersForFunction(orgId, parsed.fnId);
  const prev = existing.find((t) => t.kind === "email")?.config.email?.address;

  const address =
    !parsed.regenerateAddress && prev
      ? prev
      : await generateInboundEmailAddress(orgId, parsed.fnId);

  const upsert = (addr: string) =>
    upsertTriggerForFunction({
      orgId,
      fnId: parsed.fnId,
      kind: "email",
      enabled: parsed.enabled ?? true,
      config: { email: { address: addr, allowlist: parsed.allowlist ?? [] } },
    });

  try {
    await upsert(address);
  } catch (error) {
    // 40-bit suffix collisions are vanishingly rare; one retry is belt-and-braces.
    if (!isUniqueViolation(error) || address === prev) throw error;
    await upsert(await generateInboundEmailAddress(orgId, parsed.fnId));
  }
  revalidatePath(`/dashboard/${parsed.fnId}/settings/triggers`);
}

/**
 * Dev-only mock: pushes a canned message through the same dispatch path real
 * inbound mail takes, so the email trigger can be exercised without DNS or a
 * mail provider. The payload is console-logged by dispatchInboundEmail.
 */
export async function sendTestInboundEmail(fnId: string): Promise<DispatchResult> {
  if (env.NODE_ENV !== "development") throw new Error("dev_only");
  const { orgId } = await requireOrgPermission("manage_triggers");
  await assertOrgOwnsFunction(orgId, fnId);
  const triggers = await listTriggersForFunction(orgId, fnId);
  const address = triggers.find((t) => t.kind === "email")?.config.email?.address;
  if (!address) throw new Error("no_email_trigger");
  const body = "This is a simulated inbound email from the local dev mock.";
  return dispatchInboundEmail(
    {
      to: address,
      from: "dev-test@localhost",
      subject: "Test email (local mock)",
      text: body,
      rawSize: body.length,
    },
    { source: "email" },
  );
}

export async function saveMcpTrigger(input: z.infer<typeof mcpSchema>) {
  const { orgId } = await requireOrgPermission("manage_triggers");
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

export async function setTriggerEnabled(
  fnId: string,
  kind: "http" | "cron" | "email" | "mcp",
  enabled: boolean,
) {
  const { orgId } = await requireOrgPermission("manage_triggers");
  await assertOrgOwnsFunction(orgId, fnId);
  await toggleTriggerForFunction({ orgId, fnId, kind, enabled });
  revalidatePath(`/dashboard/${fnId}/settings/triggers`);
}

export async function removeTrigger(fnId: string, kind: "cron" | "email" | "mcp") {
  const { orgId } = await requireOrgPermission("manage_triggers");
  await assertOrgOwnsFunction(orgId, fnId);
  await deleteTriggerForFunction(orgId, fnId, kind);
  revalidatePath(`/dashboard/${fnId}/settings/triggers`);
}
