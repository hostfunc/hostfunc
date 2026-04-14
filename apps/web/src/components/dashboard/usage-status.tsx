"use client";

import { Badge } from "@/components/ui/badge";
import type { UsageAlert } from "@/server/usage-alerts";
import { AlertTriangle, ShieldCheck, TrendingUp, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function UsageStatusBar({
  planName,
  executionsToday,
  maxExecutionsPerDay,
  errorRateLast24h,
  alerts,
}: {
  planName: string;
  executionsToday: number;
  maxExecutionsPerDay: number | null;
  errorRateLast24h: number;
  alerts: UsageAlert[];
}) {
  const pathname = usePathname();
  const storageKey = useMemo(() => `hostfunc:usagebar:dismissed:${pathname ?? "dashboard"}`, [pathname]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(storageKey) === "1");
    } catch {
      setDismissed(false);
    }
  }, [storageKey]);

  const dismissForPage = () => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // ignore storage errors
    }
    setDismissed(true);
  };

  if (dismissed) return null;

  const executionRatio = maxExecutionsPerDay ? executionsToday / maxExecutionsPerDay : 0;
  const executionPercent = Math.max(0, Math.min(100, Math.round(executionRatio * 100)));
  const highestSeverity = alerts.some((alert) => alert.severity === "error")
    ? "error"
    : alerts.some((alert) => alert.severity === "warn")
      ? "warn"
      : "info";

  const tone =
    highestSeverity === "error"
      ? "border-red-500/40 bg-red-500/10"
      : highestSeverity === "warn"
        ? "border-amber-500/40 bg-amber-500/10"
        : "border-emerald-500/30 bg-emerald-500/10";

  const progressTone =
    highestSeverity === "error"
      ? "bg-red-500"
      : highestSeverity === "warn"
        ? "bg-amber-500"
        : "bg-emerald-500";

  const alertTone = (severity: UsageAlert["severity"]) =>
    severity === "error"
      ? "border-red-500/30 bg-red-500/15 text-red-200"
      : severity === "warn"
        ? "border-amber-500/30 bg-amber-500/15 text-amber-200"
        : "border-emerald-500/30 bg-emerald-500/15 text-emerald-200";

  return (
    <div className={`relative mb-6 w-full rounded-xl border p-4 ${tone}`}>
      <button
        type="button"
        onClick={dismissForPage}
        aria-label="Dismiss usage alerts for this page"
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-black/20 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Plan: {planName}</Badge>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              Executions today: {executionsToday.toLocaleString()}
              {maxExecutionsPerDay ? ` / ${maxExecutionsPerDay.toLocaleString()}` : ""}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/20 lg:w-[420px]">
            <div className={`h-full ${progressTone}`} style={{ width: `${executionPercent}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-muted-foreground">
          {highestSeverity === "error" ? (
            <AlertTriangle className="h-4 w-4 text-red-300" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
          )}
          Failure rate 24h: {(errorRateLast24h * 100).toFixed(2)}%
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {alerts.map((alert, idx) => (
          <span
            key={`${alert.message}-${idx}`}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium ${alertTone(alert.severity)}`}
          >
            {alert.message}
          </span>
        ))}
      </div>
    </div>
  );
}
