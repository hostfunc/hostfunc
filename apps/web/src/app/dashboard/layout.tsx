import { UsageStatusBar } from "@/components/dashboard/usage-status";
import { db, schema } from "@hostfunc/db";
import { eq } from "drizzle-orm";
import { requireActiveOrg, requireSession } from "@/lib/session";
import { getSetupState } from "@/server/setup-state";
import { getUsageAlerts } from "@/server/usage-alerts";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardNavbar } from "./navbar";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const setup = getSetupState();
  if (!setup.complete) {
    redirect("/setup");
  }
  const [{ orgId }, baseSession] = await Promise.all([requireActiveOrg(), requireSession()]);
  const usage = await getUsageAlerts(orgId);
  const memberships = await db
    .select({
      role: schema.member.role,
      organization: {
        id: schema.organization.id,
        name: schema.organization.name,
        slug: schema.organization.slug,
      },
    })
    .from(schema.member)
    .innerJoin(schema.organization, eq(schema.organization.id, schema.member.organizationId))
    .where(eq(schema.member.userId, baseSession.user.id));
  const organizations = memberships.map((membership) => ({
    id: membership.organization.id,
    name: membership.organization.name,
    slug: membership.organization.slug,
    role: membership.role,
  }));

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[var(--color-ink)] text-[var(--color-bone)]">
      <div className="gradient-radial-amber pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-70" />
      <div className="border-grid pointer-events-none absolute inset-0 opacity-30" />
      <DashboardNavbar user={baseSession.user} organizations={organizations} activeOrganizationId={orgId} />
      <main className="relative mx-auto max-w-6xl px-6 py-8">
        <UsageStatusBar
          planName={usage.planName}
          executionsToday={usage.usage.executionsToday}
          maxExecutionsPerDay={usage.usage.maxExecutionsPerDay}
          alerts={usage.alerts}
          errorRateLast24h={0}
        />
        {children}
      </main>
    </div>
  );
}
