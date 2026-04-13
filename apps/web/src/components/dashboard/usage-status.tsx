import { Badge } from "@/components/ui/badge";
import type { UsageAlert } from "@/server/usage-alerts";

export function UsageStatusBar({
  planName,
  executionsToday,
  maxExecutionsPerDay,
  alerts,
}: {
  planName: string;
  executionsToday: number;
  maxExecutionsPerDay: number | null;
  alerts: UsageAlert[];
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs">
      <Badge variant="secondary">Plan: {planName}</Badge>
      <Badge variant="outline">
        Executions today: {executionsToday}
        {maxExecutionsPerDay ? ` / ${maxExecutionsPerDay}` : ""}
      </Badge>
      {alerts.map((alert, idx) => (
        <Badge
          key={`${alert.message}-${idx}`}
          variant={alert.severity === "error" ? "destructive" : "secondary"}
        >
          {alert.message}
        </Badge>
      ))}
    </div>
  );
}
