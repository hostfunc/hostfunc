import { requireOrgPermission } from "@/lib/session";
import { getEffectivePlan } from "@/server/plans";
import { db, schema } from "@hostfunc/db";
import { and, asc, eq, gt, gte, isNotNull, sql } from "drizzle-orm";
import { createCheckoutSession, openBillingPortal } from "./actions";

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export default async function BillingSettingsPage() {
  const { orgId } = await requireOrgPermission("manage_billing");
  const plan = await getEffectivePlan(orgId);
  const purchasablePlans = await db
    .select({
      id: schema.plan.id,
      name: schema.plan.name,
      slug: schema.plan.slug,
      priceMonthlyCents: schema.plan.priceMonthlyCents,
      stripeProductId: schema.plan.stripeProductId,
      stripePriceId: schema.plan.stripePriceId,
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
  const cycleStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const usage = await db
    .select({
      executions: sql<number>`count(*)::int`,
      wallMs: sql<number>`coalesce(sum(${schema.execution.wallMs}), 0)::int`,
    })
    .from(schema.execution)
    .where(and(eq(schema.execution.orgId, orgId), gte(schema.execution.startedAt, cycleStart)));

  const executionCount = usage[0]?.executions ?? 0;
  const wallMs = usage[0]?.wallMs ?? 0;
  const executionPercent = clampPercent(
    (executionCount / Math.max(plan.limits.maxExecutionsPerDay, 1)) * 100,
  );
  const wallPercent = clampPercent((wallMs / Math.max(plan.limits.maxWallMs, 1)) * 100);

  return (
    <div className="space-y-10 pb-10">
      <div className="border-b border-[var(--color-border)] pb-6">
        <h3 className="font-display text-4xl tracking-tight text-[var(--color-bone)]">
          Billing & Usage
        </h3>
        <p className="mt-2 max-w-xl text-[var(--color-bone-muted)]">
          Usage is tracked for the active workspace. Upgrade to unlock higher limits and manage your
          subscription in Stripe.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/75 p-6">
            <h4 className="mb-3 text-lg font-semibold">Available Plans</h4>
            {purchasablePlans.length > 0 ? (
              <div className="space-y-3">
                {purchasablePlans.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-white/[0.02] px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{candidate.name}</p>
                      <p className="text-xs text-[var(--color-bone-faint)]">{candidate.slug}</p>
                    </div>
                    <p className="font-mono text-sm">
                      ${(candidate.priceMonthlyCents / 100).toFixed(2)} / month
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                <p className="font-medium text-amber-200">No purchasable Stripe plans found.</p>
                <p className="mt-1 text-amber-100/90">
                  Seed plans and sync Stripe prices, then reload this page:
                </p>
                <pre className="mt-3 overflow-x-auto rounded-md bg-black/40 p-3 text-xs text-amber-100">
                  pnpm db:seed{"\n"}pnpm --filter @hostfunc/web stripe:sync
                </pre>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/75 p-6">
            <h4 className="mb-6 text-lg font-semibold">Current Cycle Usage</h4>

            <div className="mb-8">
              <div className="mb-2 flex items-end justify-between">
                <span className="text-sm font-medium">Executions</span>
                <span className="font-mono text-sm">
                  {executionCount.toLocaleString()} /{" "}
                  {plan.limits.maxExecutionsPerDay.toLocaleString()}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/30">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${executionPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-end justify-between">
                <span className="text-sm font-medium">Wall Time (ms)</span>
                <span className="font-mono text-sm">
                  {wallMs.toLocaleString()} / {plan.limits.maxWallMs.toLocaleString()}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/30">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${wallPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/75 p-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-bone-faint)]">
              Current Plan
            </span>
            <h4 className="mt-2 text-2xl font-bold">{plan.planName}</h4>
            <p className="mt-2 text-sm text-[var(--color-bone-muted)]">
              Status:{" "}
              <span className="font-medium text-[var(--color-bone)]">
                {plan.subscriptionStatus}
              </span>
            </p>
            <p className="mt-4 text-sm text-[var(--color-bone-muted)]">
              {plan.priceMonthlyCents === 0
                ? "Free tier"
                : `$${(plan.priceMonthlyCents / 100).toFixed(2)} / month`}
            </p>
          </div>

          <form action={createCheckoutSession}>
            <button
              type="submit"
              className="w-full rounded-xl bg-[var(--color-amber)] px-4 py-3 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
            >
              Upgrade / Change Plan
            </button>
          </form>

          {plan.stripeCustomerId ? (
            <form action={openBillingPortal}>
              <button
                type="submit"
                className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm font-medium hover:bg-white/[0.04]"
              >
                Manage Subscription
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
