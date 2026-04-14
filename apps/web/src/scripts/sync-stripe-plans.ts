import { db, schema } from "@hostfunc/db";
import { eq } from "drizzle-orm";
import { PLANS } from "../../../../packages/db/src/seed/plans.js";
import { stripe } from "../lib/stripe.js";

const METER_EVENT_NAME = "hostfunc_executions";

async function main() {
  console.log("syncing plans to Stripe...");
  const meter = await ensureExecutionsMeter();

  for (const planSeed of PLANS) {
    if (planSeed.priceMonthlyCents === 0) {
      await db
        .update(schema.plan)
        .set({
          stripeProductId: null,
          stripePriceId: null,
          stripeMeterId: meter.id,
          stripeMeterEventName: METER_EVENT_NAME,
        })
        .where(eq(schema.plan.slug, planSeed.slug));
      continue;
    }

    const product = await ensureProduct(planSeed.slug, planSeed.name);
    const price = await ensureBasePrice(planSeed.slug, product.id, planSeed.priceMonthlyCents);

    await db
      .update(schema.plan)
      .set({
        stripeProductId: product.id,
        stripePriceId: price.id,
        stripeMeterId: meter.id,
        stripeMeterEventName: METER_EVENT_NAME,
      })
      .where(eq(schema.plan.slug, planSeed.slug));
  }
  console.log("Stripe plan sync complete.");
}

async function ensureExecutionsMeter() {
  const meters = await stripe.billing.meters.list({ limit: 100 });
  const existing = meters.data.find((m) => m.event_name === METER_EVENT_NAME);
  if (existing) return existing;
  return stripe.billing.meters.create({
    display_name: "Hostfunc Executions",
    event_name: METER_EVENT_NAME,
    default_aggregation: { formula: "count" },
    value_settings: { event_payload_key: "value" },
    customer_mapping: { event_payload_key: "stripe_customer_id", type: "by_id" },
  });
}

async function ensureProduct(slug: string, name: string) {
  const products = await stripe.products.list({ active: true, limit: 100 });
  const existing = products.data.find((p) => p.metadata.hostfunc_plan_slug === slug);
  if (existing) {
    if (existing.name !== name) {
      return stripe.products.update(existing.id, { name });
    }
    return existing;
  }
  return stripe.products.create({
    name,
    metadata: { hostfunc_plan_slug: slug },
  });
}

async function ensureBasePrice(planSlug: string, productId: string, amountCents: number) {
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const existing = prices.data.find((p) => p.metadata.hostfunc_plan_slug === planSlug);
  if (existing && existing.unit_amount === amountCents) return existing;
  if (existing) {
    await stripe.prices.update(existing.id, { active: false });
  }
  return stripe.prices.create({
    product: productId,
    unit_amount: amountCents,
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { hostfunc_plan_slug: planSlug },
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
