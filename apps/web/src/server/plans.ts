import "server-only";

import { db, schema } from "@hostfunc/db";
import { eq } from "drizzle-orm";

export type PlanSlug = "free" | "pro" | "team";

export interface EffectivePlan {
  planId: string;
  planSlug: PlanSlug;
  planName: string;
  priceMonthlyCents: number;
  limits: schema.PlanLimits;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  stripeMeterEventName: string | null;
  subscriptionStatus: string;
}

export async function getEffectivePlan(orgId: string): Promise<EffectivePlan> {
  const row = await db
    .select({
      sub: schema.subscription,
      plan: schema.plan,
    })
    .from(schema.subscription)
    .innerJoin(schema.plan, eq(schema.plan.id, schema.subscription.planId))
    .where(eq(schema.subscription.orgId, orgId))
    .limit(1);

  const current = row[0];
  if (current) {
    return {
      planId: current.plan.id,
      planSlug: current.plan.slug as PlanSlug,
      planName: current.plan.name,
      priceMonthlyCents: current.plan.priceMonthlyCents,
      limits: current.plan.limits,
      stripeCustomerId: current.sub.stripeCustomerId,
      stripeSubscriptionId: current.sub.stripeSubscriptionId,
      stripePriceId: current.plan.stripePriceId,
      stripeMeterEventName: current.plan.stripeMeterEventName,
      subscriptionStatus: current.sub.status,
    };
  }

  const free = await db.query.plan.findFirst({
    where: eq(schema.plan.slug, "free"),
  });
  if (!free) {
    throw new Error("missing_free_plan");
  }

  return {
    planId: free.id,
    planSlug: "free",
    planName: free.name,
    priceMonthlyCents: free.priceMonthlyCents,
    limits: free.limits,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: free.stripePriceId,
    stripeMeterEventName: free.stripeMeterEventName,
    subscriptionStatus: "active",
  };
}
