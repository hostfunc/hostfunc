import { env } from "@/lib/env";
import { db, genId, schema } from "@hostfunc/db";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${env.TRIGGER_CONTROL_TOKEN}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    dedupeKey?: string;
    triggerId?: string;
    executionId?: string;
    ok?: boolean;
    error?: string;
  } | null;
  if (!body?.dedupeKey || !body.triggerId) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  await db
    .insert(schema.webhookEvent)
    .values({
      id: genId("evt"),
      source: "cron",
      externalId: body.dedupeKey,
      kind: "cron_trigger_ack",
      payload: {
        triggerId: body.triggerId,
        executionId: body.executionId ?? null,
      },
      processedAt: body.ok === false ? null : new Date(),
      error: body.ok === false ? (body.error ?? "cron_execution_failed") : null,
    })
    .onConflictDoNothing();

  return Response.json({ ok: true });
}
