"use server";

import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { requireActiveOrg, requireSession } from "@/lib/session";
import { trackServerEvent } from "@/server/analytics";
import { getEffectivePlan } from "@/server/plans";
import { db, schema } from "@hostfunc/db";
import { and, asc, eq, gt, isNotNull } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function createCheckoutSession() {
  const { user } = await requireSession();
  const { orgId } = await requireActiveOrg();
  const currentPlan = await getEffectivePlan(orgId);
  const paidPlans = await db
    .select({
      id: schema.plan.id,
      stripePriceId: schema.plan.stripePriceId,
      slug: schema.plan.slug,
    })
    .from(schema.plan)
    .where(
      and(
        eq(schema.plan.isActive, true),
        gt(schema.plan.priceMonthlyCents, 0),
        isNotNull(schema.plan.stripePriceId),
      ),
    )
    .orderBy(asc(schema.plan.priceMonthlyCents));
  const targetPlan =
    paidPlans.find((plan) => plan.id !== currentPlan.planId) ??
    paidPlans.find((plan) => plan.slug === "pro") ??
    paidPlans[0];

  if (!targetPlan?.stripePriceId) {
    throw new Error("selected plan is not purchasable");
  }

  const existingSub = await db.query.subscription.findFirst({
    where: eq(schema.subscription.orgId, orgId),
  });
  const org = await db.query.organization.findFirst({
    where: eq(schema.organization.id, orgId),
  });

  let customerId = existingSub?.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: org?.name ?? "Hostfunc Workspace",
      metadata: {
        hostfunc_org_id: orgId,
        hostfunc_user_id: user.id,
      },
    });
    customerId = customer.id;
    if (existingSub) {
      await db
        .update(schema.subscription)
        .set({ stripeCustomerId: customerId })
        .where(eq(schema.subscription.id, existingSub.id));
    }
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: targetPlan.stripePriceId, quantity: 1 }],
    allow_promotion_codes: true,
    metadata: {
      hostfunc_org_id: orgId,
    },
    success_url: `${env.BETTER_AUTH_URL}/dashboard/settings/billing?upgraded=true`,
    cancel_url: `${env.BETTER_AUTH_URL}/dashboard/settings/billing?canceled=true`,
  });

  if (!checkout.url) {
    throw new Error("stripe returned no checkout URL");
  }
  await trackServerEvent({
    event: "billing_checkout_started",
    distinctId: user.id,
    props: {
      orgId,
      targetPlanId: targetPlan.id,
      targetPlanSlug: targetPlan.slug,
    },
  });
  redirect(checkout.url);
}

export async function openBillingPortal() {
  const { orgId } = await requireActiveOrg();
  const sub = await db.query.subscription.findFirst({
    where: eq(schema.subscription.orgId, orgId),
  });
  if (!sub?.stripeCustomerId) {
    throw new Error("no_stripe_customer");
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${env.BETTER_AUTH_URL}/dashboard/settings/billing`,
  });
  await trackServerEvent({
    event: "billing_portal_opened",
    distinctId: sub.id,
    props: { orgId },
  });
  redirect(portal.url);
}
