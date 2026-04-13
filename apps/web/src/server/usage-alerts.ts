import "server-only";

import { getUsageSummary } from "./executions";
import { getOrgPlan } from "./plan";

export interface UsageAlert {
  severity: "info" | "warn" | "error";
  message: string;
}

export async function getUsageAlerts(orgId: string): Promise<{
  alerts: UsageAlert[];
  planName: string;
  usage: {
    executionsToday: number;
    maxExecutionsPerDay: number | null;
    errorRateLast24h: number;
  };
}> {
  const [plan, usageSummary] = await Promise.all([getOrgPlan(orgId), getUsageSummary(orgId)]);
  const maxDaily = plan?.limits.maxExecutionsPerDay ?? null;
  const ratio = maxDaily ? usageSummary.executionsToday / maxDaily : 0;
  const errorRate = usageSummary.executionsLast24h
    ? usageSummary.errorsLast24h / usageSummary.executionsLast24h
    : 0;
  const alerts: UsageAlert[] = [];

  if (maxDaily && ratio >= 0.95) {
    alerts.push({ severity: "error", message: "Daily execution quota is almost exhausted." });
  } else if (maxDaily && ratio >= 0.8) {
    alerts.push({ severity: "warn", message: "Daily execution quota is above 80%." });
  }
  if (errorRate >= 0.2) {
    alerts.push({ severity: "warn", message: "Failure rate in the last 24h is elevated." });
  }
  if (alerts.length === 0) {
    alerts.push({ severity: "info", message: "Usage is healthy." });
  }

  return {
    alerts,
    planName: plan?.name ?? "Unknown",
    usage: {
      executionsToday: usageSummary.executionsToday,
      maxExecutionsPerDay: maxDaily,
      errorRateLast24h: errorRate,
    },
  };
}
