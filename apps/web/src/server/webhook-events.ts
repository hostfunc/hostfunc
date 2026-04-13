import "server-only";

import { db, genId, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";

export async function recordWebhookEvent(input: {
  source: string;
  externalId: string;
  kind: string;
  payload?: unknown;
}): Promise<{ id: string; duplicate: boolean }> {
  const existing = await db
    .select({ id: schema.webhookEvent.id })
    .from(schema.webhookEvent)
    .where(
      and(
        eq(schema.webhookEvent.source, input.source),
        eq(schema.webhookEvent.externalId, input.externalId),
      ),
    )
    .limit(1);
  if (existing[0]) return { id: existing[0].id, duplicate: true };

  const id = genId("evt");
  await db.insert(schema.webhookEvent).values({
    id,
    source: input.source,
    externalId: input.externalId,
    kind: input.kind,
    payload: input.payload as Record<string, unknown> | undefined,
  });
  return { id, duplicate: false };
}

export async function markWebhookEventProcessed(id: string) {
  await db
    .update(schema.webhookEvent)
    .set({ processedAt: new Date(), error: null })
    .where(eq(schema.webhookEvent.id, id));
}

export async function markWebhookEventFailed(id: string, error: string) {
  await db
    .update(schema.webhookEvent)
    .set({ error, processedAt: null })
    .where(eq(schema.webhookEvent.id, id));
}
