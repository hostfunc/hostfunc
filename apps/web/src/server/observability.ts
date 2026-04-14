import "server-only";

import { env } from "@/lib/env";
import { db, genId, schema } from "@hostfunc/db";

export async function captureServerError(input: {
  source: string;
  message: string;
  context?: Record<string, unknown>;
}) {
  const id = genId("evt");
  await db.insert(schema.webhookEvent).values({
    id,
    source: `error:${input.source}`,
    externalId: id,
    kind: "error",
    payload: {
      message: input.message,
      context: input.context ?? {},
    },
    error: input.message,
  });

  if (!env.ALERT_WEBHOOK_URL) return;
  await fetch(env.ALERT_WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: `hostfunc error [${input.source}]: ${input.message}`,
      source: input.source,
      context: input.context ?? {},
    }),
  }).catch(() => null);
}
