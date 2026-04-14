import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { markWebhookEventFailed, markWebhookEventProcessed, recordWebhookEvent } from "@/server/webhook-events";
import { db, genId, schema } from "@hostfunc/db";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!env.STRIPE_WEBHOOK_SECRET || !signature) {
    return Response.json({ error: "missing_webhook_signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return Response.json({ error: "invalid_signature" }, { status: 400 });
  }

  const receipt = await recordWebhookEvent({
    source: "stripe",
    externalId: event.id,
    kind: event.type,
    payload: event,
  });
  if (receipt.duplicate) return Response.json({ ok: true, duplicate: true });

  try {
    await handleStripeEvent(event);
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

async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.hostfunc_org_id;
      const stripeSubscriptionId =
        typeof session.subscription === "string" ? session.subscription : null;
      const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
      if (!orgId || !stripeSubscriptionId || !stripeCustomerId) return;

      const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      const priceId = sub.items.data[0]?.price?.id ?? null;
      const planRow = priceId
        ? await db.query.plan.findFirst({ where: eq(schema.plan.stripePriceId, priceId) })
        : null;
      if (!planRow) return;

      const existing = await db.query.subscription.findFirst({
        where: eq(schema.subscription.orgId, orgId),
      });
      if (existing) {
        await db
          .update(schema.subscription)
          .set({
            planId: planRow.id,
            stripeCustomerId,
            stripeSubscriptionId,
            status: mapStripeStatus(sub.status),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            currentPeriodStart: null,
            currentPeriodEnd: null,
            updatedAt: new Date(),
          })
          .where(eq(schema.subscription.id, existing.id));
      } else {
        await db.insert(schema.subscription).values({
          id: genId("sub"),
          orgId,
          planId: planRow.id,
          stripeCustomerId,
          stripeSubscriptionId,
          status: mapStripeStatus(sub.status),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          currentPeriodStart: null,
          currentPeriodEnd: null,
        });
      }
      return;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0]?.price?.id ?? null;
      const planRow = priceId
        ? await db.query.plan.findFirst({ where: eq(schema.plan.stripePriceId, priceId) })
        : null;
      const payload = {
        status: mapStripeStatus(sub.status),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        updatedAt: new Date(),
      } as const;
      if (planRow) {
        await db
          .update(schema.subscription)
          .set({ ...payload, planId: planRow.id })
          .where(eq(schema.subscription.stripeSubscriptionId, sub.id));
      } else {
        await db
          .update(schema.subscription)
          .set(payload)
          .where(eq(schema.subscription.stripeSubscriptionId, sub.id));
      }
      return;
    }
    default:
      return;
  }
}

function mapStripeStatus(status: Stripe.Subscription.Status): (typeof schema.subscription.$inferInsert)["status"] {
  const normalized = status === "paused" ? "past_due" : status;
  if (
    normalized === "trialing" ||
    normalized === "active" ||
    normalized === "past_due" ||
    normalized === "canceled" ||
    normalized === "incomplete" ||
    normalized === "incomplete_expired" ||
    normalized === "unpaid"
  ) {
    return normalized;
  }
  return "active";
}
