import { requireActiveOrg } from "@/lib/session";
import { getEffectivePlan } from "@/server/plans";
import { db, schema } from "@hostfunc/db";
import { and, eq, gte, sql } from "drizzle-orm";
import { createCheckoutSession, openBillingPortal } from "./actions";

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export default async function BillingSettingsPage() {
  const { orgId } = await requireActiveOrg();
  const plan = await getEffectivePlan(orgId);
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
      <div className="border-b border-border pb-6">
        <h3 className="text-3xl font-semibold tracking-tight">Billing & Usage</h3>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Usage is tracked for the active workspace. Upgrade to unlock higher limits and manage your
          subscription in Stripe.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h4 className="mb-6 text-lg font-semibold">Current Cycle Usage</h4>

            <div className="mb-8">
              <div className="mb-2 flex items-end justify-between">
                <span className="text-sm font-medium">Executions</span>
                <span className="font-mono text-sm">
                  {executionCount.toLocaleString()} / {plan.limits.maxExecutionsPerDay.toLocaleString()}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${executionPercent}%` }} />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-end justify-between">
                <span className="text-sm font-medium">Wall Time (ms)</span>
                <span className="font-mono text-sm">
                  {wallMs.toLocaleString()} / {plan.limits.maxWallMs.toLocaleString()}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${wallPercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Current Plan
            </span>
            <h4 className="mt-2 text-2xl font-bold">{plan.planName}</h4>
            <p className="mt-2 text-sm text-muted-foreground">
              Status: <span className="font-medium text-foreground">{plan.subscriptionStatus}</span>
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              {plan.priceMonthlyCents === 0
                ? "Free tier"
                : `$${(plan.priceMonthlyCents / 100).toFixed(2)} / month`}
            </p>
          </div>

          <form action={createCheckoutSession}>
            <button
              type="submit"
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Upgrade / Change Plan
            </button>
          </form>

          {plan.stripeCustomerId ? (
            <form action={openBillingPortal}>
              <button
                type="submit"
                className="w-full rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-muted"
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
