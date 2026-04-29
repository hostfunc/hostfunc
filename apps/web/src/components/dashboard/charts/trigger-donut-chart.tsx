"use client";

import type { TriggerBreakdown } from "@/server/dashboard-overview";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { chartColors, triggerPalette } from "./chart-theme";
import { ChartTooltipBox } from "./chart-tooltip";

interface Props {
  data: TriggerBreakdown[];
}

function titleCase(value: string): string {
  return value
    .split(/[_\s-]+/)
    .map((segment) => segment.slice(0, 1).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function TriggerDonutChart({ data }: Props) {
  const total = data.reduce((sum, point) => sum + point.count, 0);
  const chartData = data
    .filter((point) => point.count > 0)
    .map((point, index) => ({
      ...point,
      label: titleCase(point.triggerKind),
      color: triggerPalette[index % triggerPalette.length] ?? chartColors.amberSolid,
    }));

  return (
    <div className="relative h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="label"
            innerRadius={56}
            outerRadius={84}
            paddingAngle={2}
            stroke="none"
            isAnimationActive={false}
          >
            {chartData.map((entry) => (
              <Cell key={entry.triggerKind} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={(props) => {
              if (!props.active || !props.payload?.length) return null;
              const point = props.payload[0]?.payload as (typeof chartData)[number] | undefined;
              if (!point) return null;
              const pct = total > 0 ? ((point.count / total) * 100).toFixed(1) : "0";
              return (
                <ChartTooltipBox
                  title={point.label}
                  rows={[
                    {
                      label: "Executions",
                      value: point.count.toLocaleString(),
                      color: point.color,
                    },
                    {
                      label: "Errors",
                      value: point.errors.toLocaleString(),
                      color: chartColors.error,
                    },
                    { label: "Share", value: `${pct}%` },
                  ]}
                />
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-2xl text-[var(--color-bone)]">
          {total.toLocaleString()}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-bone-faint)]">
          Triggers
        </span>
      </div>
      {chartData.length > 0 ? (
        <div className="-bottom-1 -translate-x-1/2 absolute left-1/2 flex max-w-full flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-bone-muted)]">
          {chartData.map((entry) => (
            <span key={entry.triggerKind} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: entry.color }}
              />
              {entry.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
