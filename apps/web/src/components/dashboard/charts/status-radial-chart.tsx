"use client";

import type { StatusMix } from "@/server/dashboard-overview";
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from "recharts";
import { chartColors, statusColors, statusLabels } from "./chart-theme";
import { ChartTooltipBox } from "./chart-tooltip";

interface Props {
  data: StatusMix;
}

export function StatusRadialChart({ data }: Props) {
  const entries = (Object.entries(data) as Array<[keyof StatusMix, number]>).map(
    ([key, value]) => ({
      key,
      label: statusLabels[key] ?? key,
      value,
      fill: statusColors[key] ?? chartColors.amberSolid,
    }),
  );
  const max = Math.max(1, ...entries.map((entry) => entry.value));
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="relative h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="35%"
          outerRadius="100%"
          data={entries}
          startAngle={90}
          endAngle={-270}
          barSize={10}
        >
          <PolarAngleAxis type="number" domain={[0, max]} tick={false} axisLine={false} />
          <RadialBar
            background={{ fill: "rgba(255,255,255,0.04)" }}
            dataKey="value"
            cornerRadius={6}
            isAnimationActive={false}
          />
          <Tooltip
            content={(props) => {
              if (!props.active || !props.payload?.length) return null;
              const point = props.payload[0]?.payload as (typeof entries)[number] | undefined;
              if (!point) return null;
              const pct = total > 0 ? ((point.value / total) * 100).toFixed(1) : "0";
              return (
                <ChartTooltipBox
                  title={point.label}
                  rows={[
                    {
                      label: "Count",
                      value: point.value.toLocaleString(),
                      color: point.fill,
                    },
                    { label: "Share", value: `${pct}%` },
                  ]}
                />
              );
            }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="-translate-x-1/2 absolute bottom-0 left-1/2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-bone-muted)]">
        {entries.map((entry) => (
          <span key={entry.key} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: entry.fill }}
            />
            {entry.label}
          </span>
        ))}
      </div>
    </div>
  );
}
