import { env } from "@/lib/env";
import { verifySvixSignature } from "@/lib/svix-verify";
import { dispatchInboundEmail } from "@/server/inbound-email";
import { enforceRateLimit } from "@/server/rate-limit";
import { getReceivedEmail, isResendInboundConfigured } from "@/server/resend-inbound";
import {
  markWebhookEventFailed,
  markWebhookEventProcessed,
  recordWebhookEvent,
} from "@/server/webhook-events";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * Resend Inbound webhook — inbound mail for customer custom domains. Platform
 * domains arrive via the Cloudflare email worker instead; both paths converge
 * on dispatchInboundEmail.
 */
export async function POST(req: NextRequest) {
  if (!isResendInboundConfigured()) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }

  const limit = await enforceRateLimit({
    key: "resend_inbound_webhook",
    limit: 300,
    windowSeconds: 60,
  });
  if (!limit.ok) return Response.json({ error: "rate_limited" }, { status: 429 });

  const payload = await req.text();
  const svixId = req.headers.get("svix-id") ?? "";
  const verified = verifySvixSignature({
    secret: env.RESEND_INBOUND_WEBHOOK_SECRET ?? "",
    payload,
    id: svixId,
    timestamp: req.headers.get("svix-timestamp") ?? "",
    signature: req.headers.get("svix-signature") ?? "",
  });
  if (!verified) return Response.json({ error: "invalid_signature" }, { status: 401 });

  let event: { type?: string; data?: { email_id?: string } };
  try {
    event = JSON.parse(payload) as typeof event;
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  if (event.type !== "email.received" || !event.data?.email_id) {
    return Response.json({ ok: true, ignored: true });
  }

  const recorded = await recordWebhookEvent({
    source: "resend",
    externalId: svixId,
    kind: "email_received",
    payload: { emailId: event.data.email_id },
  });
  if (recorded.duplicate) return Response.json({ ok: true, duplicate: true });

  try {
    const email = await getReceivedEmail(event.data.email_id);
    const text = email.text ?? email.html ?? "";

    // An inbound message can address several recipients; dispatch each match.
    let matchedAny = false;
    for (const recipient of email.to) {
      const result = await dispatchInboundEmail(
        {
          to: recipient,
          from: email.from,
          ...(email.subject ? { subject: email.subject } : {}),
          text,
          rawSize: payload.length,
        },
        { source: "resend", externalId: `${svixId}:${recipient.toLowerCase()}` },
      );
      matchedAny ||= result.matched;
    }

    await markWebhookEventProcessed(recorded.id);
    // Never reveal whether an address exists.
    return Response.json({ ok: true, matched: matchedAny });
  } catch (error) {
    const message = error instanceof Error ? error.message : "resend_inbound_failed";
    await markWebhookEventFailed(recorded.id, message);
    return Response.json({ error: "processing_failed" }, { status: 500 });
  }
}
