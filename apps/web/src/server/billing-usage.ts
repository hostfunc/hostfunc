import { db, schema } from "@hostfunc/db";
import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { stripe } from "@/lib/stripe";
import { getEffectivePlan } from "./plans";

export async function reportUnreportedExecutionUsage(windowHours = 24) {
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  const rows = await db
    .select({
      orgId: schema.usageEvent.orgId,
      qty: sql<number>`coalesce(sum(${schema.usageEvent.quantity}), 0)::int`,
    })
    .from(schema.usageEvent)
    .where(
      and(
        eq(schema.usageEvent.kind, "execution"),
        isNull(schema.usageEvent.reportedToStripeAt),
        gte(schema.usageEvent.ts, since),
      ),
    )
    .groupBy(schema.usageEvent.orgId);

  let orgsReported = 0;
  for (const row of rows) {
    const plan = await getEffectivePlan(row.orgId);
    if (!plan.stripeCustomerId || !plan.stripeMeterEventName || row.qty <= 0) {
      continue;
    }

    await stripe.billing.meterEvents.create({
      event_name: plan.stripeMeterEventName,
      payload: {
        stripe_customer_id: plan.stripeCustomerId,
        value: String(row.qty),
      },
      identifier: `${row.orgId}:${since.toISOString()}`,
    });

    await db
      .update(schema.usageEvent)
      .set({ reportedToStripeAt: new Date() })
      .where(
        and(
          eq(schema.usageEvent.orgId, row.orgId),
          eq(schema.usageEvent.kind, "execution"),
          isNull(schema.usageEvent.reportedToStripeAt),
          gte(schema.usageEvent.ts, since),
        ),
      );
    orgsReported += 1;
  }

  return { orgsReported };
}
