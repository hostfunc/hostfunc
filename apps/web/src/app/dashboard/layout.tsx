import { UsageStatusBar } from "@/components/dashboard/usage-status";
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

  return (
    <div className="min-h-dvh">
      <DashboardNavbar user={baseSession.user} />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <UsageStatusBar
          planName={usage.planName}
          executionsToday={usage.usage.executionsToday}
          maxExecutionsPerDay={usage.usage.maxExecutionsPerDay}
          alerts={usage.alerts}
        />
        {children}
      </main>
    </div>
  );
}
