import type { HeatPoint } from "@/server/dashboard-overview";

interface Props {
  data: HeatPoint[];
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function ActivityHeatmap({ data }: Props) {
  const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  let max = 0;
  let total = 0;
  for (const point of data) {
    if (point.dow < 0 || point.dow > 6 || point.hour < 0 || point.hour > 23) continue;
    const row = grid[point.dow];
    if (!row) continue;
    row[point.hour] = point.count;
    total += point.count;
    if (point.count > max) max = point.count;
  }
  const safeMax = Math.max(1, max);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-[var(--color-bone-faint)]">
        <span>{total.toLocaleString()} executions</span>
        <span className="inline-flex items-center gap-1.5">
          Less
          <span className="flex items-center gap-0.5">
            {[0.05, 0.2, 0.45, 0.7, 0.95].map((opacity) => (
              <span
                key={opacity}
                className="block h-2 w-2 rounded-[2px]"
                style={{ background: `rgba(245,158,11,${opacity})` }}
              />
            ))}
          </span>
          More
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex min-w-full flex-col gap-1">
          <div className="flex items-center gap-1 pl-10 text-[10px] text-[var(--color-bone-faint)]">
            {HOURS.map((hour) => (
              <span
                key={`hour-${hour}`}
                className="flex w-3 justify-center"
                style={{ visibility: hour % 4 === 0 ? "visible" : "hidden" }}
              >
                {hour}
              </span>
            ))}
          </div>
          {grid.map((row, dow) => (
            <div key={DAY_LABELS[dow]} className="flex items-center gap-1">
              <span className="w-9 text-right text-[10px] text-[var(--color-bone-faint)]">
                {DAY_LABELS[dow]}
              </span>
              <div className="flex gap-1">
                {HOURS.map((hour) => {
                  const count = row[hour] ?? 0;
                  const intensity = count === 0 ? 0 : 0.1 + (count / safeMax) * 0.85;
                  return (
                    <span
                      key={`${DAY_LABELS[dow]}-${hour}`}
                      title={`${DAY_LABELS[dow]} ${hour.toString().padStart(2, "0")}:00 — ${count.toLocaleString()} runs`}
                      className="block h-3 w-3 rounded-[3px] border border-[var(--color-border)]"
                      style={{
                        background:
                          intensity === 0
                            ? "rgba(255,255,255,0.02)"
                            : `rgba(245,158,11,${intensity})`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
