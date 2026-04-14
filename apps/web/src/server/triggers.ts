import "server-only";

import {
  type TriggerConfig,
  type TriggerKind,
  cronTriggerConfigSchema,
  emailTriggerConfigSchema,
  httpTriggerConfigSchema,
  mcpTriggerConfigSchema,
} from "@hostfunc/db";
import { db, genId, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";

export interface TriggerRow {
  id: string;
  fnId: string;
  orgId: string;
  kind: TriggerKind;
  config: TriggerConfig;
  enabled: boolean;
}

export async function listTriggersForFunction(orgId: string, fnId: string): Promise<TriggerRow[]> {
  const rows = await db
    .select({
      id: schema.trigger.id,
      fnId: schema.trigger.fnId,
      orgId: schema.trigger.orgId,
      kind: schema.trigger.kind,
      config: schema.trigger.config,
      enabled: schema.trigger.enabled,
    })
    .from(schema.trigger)
    .where(and(eq(schema.trigger.orgId, orgId), eq(schema.trigger.fnId, fnId)));
  return rows as TriggerRow[];
}

export async function upsertTriggerForFunction(input: {
  orgId: string;
  fnId: string;
  kind: TriggerKind;
  config: TriggerConfig;
  enabled?: boolean;
}) {
  validateConfigByKind(input.kind, input.config);
  await db
    .insert(schema.trigger)
    .values({
      id: genId("trg"),
      orgId: input.orgId,
      fnId: input.fnId,
      kind: input.kind,
      config: input.config,
      enabled: input.enabled ?? true,
    })
    .onConflictDoUpdate({
      target: [schema.trigger.fnId, schema.trigger.kind],
      set: {
        config: input.config,
        enabled: input.enabled ?? true,
        updatedAt: new Date(),
      },
    });
}

export async function toggleTriggerForFunction(input: {
  orgId: string;
  fnId: string;
  kind: TriggerKind;
  enabled: boolean;
}) {
  await db
    .update(schema.trigger)
    .set({ enabled: input.enabled, updatedAt: new Date() })
    .where(
      and(
        eq(schema.trigger.orgId, input.orgId),
        eq(schema.trigger.fnId, input.fnId),
        eq(schema.trigger.kind, input.kind),
      ),
    );
}

export async function deleteTriggerForFunction(orgId: string, fnId: string, kind: TriggerKind) {
  await db
    .delete(schema.trigger)
    .where(
      and(eq(schema.trigger.orgId, orgId), eq(schema.trigger.fnId, fnId), eq(schema.trigger.kind, kind)),
    );
}

export async function resolveFunctionDispatchTarget(orgId: string, fnId: string) {
  const rows = await db
    .select({
      fnId: schema.fn.id,
      slug: schema.fn.slug,
      owner: schema.fn.createdById,
    })
    .from(schema.fn)
    .where(and(eq(schema.fn.orgId, orgId), eq(schema.fn.id, fnId)))
    .limit(1);
  return rows[0] ?? null;
}

function validateConfigByKind(kind: TriggerKind, config: TriggerConfig) {
  if (kind === "http") httpTriggerConfigSchema.parse(config.http ?? {});
  if (kind === "cron") cronTriggerConfigSchema.parse(config.cron);
  if (kind === "email") emailTriggerConfigSchema.parse(config.email);
  if (kind === "mcp") mcpTriggerConfigSchema.parse(config.mcp);
}
