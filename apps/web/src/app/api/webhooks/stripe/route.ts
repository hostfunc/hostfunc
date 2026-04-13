import { markWebhookEventFailed, markWebhookEventProcessed, recordWebhookEvent } from "@/server/webhook-events";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const payload = (await req.json().catch(() => null)) as
    | { id?: string; type?: string; data?: unknown }
    | null;
  if (!payload?.id || !payload.type) {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }

  const receipt = await recordWebhookEvent({
    source: "stripe",
    externalId: payload.id,
    kind: payload.type,
    payload,
  });
  if (receipt.duplicate) return Response.json({ ok: true, duplicate: true });

  try {
    // Component 6 will add real Stripe signature validation and handlers.
    await markWebhookEventProcessed(receipt.id);
    return Response.json({ ok: true });
  } catch (error) {
    await markWebhookEventFailed(
      receipt.id,
      error instanceof Error ? error.message : "stripe_processing_failed",
    );
    return Response.json({ error: "stripe_processing_failed" }, { status: 500 });
  }
}
