"use client";

import type { SeriesPoint } from "@/server/dashboard-overview";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartColors } from "./chart-theme";
import { ChartTooltipBox } from "./chart-tooltip";

interface Props {
  data: SeriesPoint[];
}

export function HourlyMiniBar({ data }: Props) {
  const transformed = data.map((point) => ({
    label: new Date(point.bucket).toLocaleTimeString(undefined, { hour: "numeric" }),
    total: point.total,
    errors: point.errors,
  }));

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={transformed} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid stroke={chartColors.border} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            stroke={chartColors.boneFaint}
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={2}
          />
          <YAxis
            stroke={chartColors.boneFaint}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={32}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={(props) => {
              if (!props.active || !props.payload?.length) return null;
              const point = props.payload[0]?.payload as (typeof transformed)[number] | undefined;
              if (!point) return null;
              return (
                <ChartTooltipBox
                  title={point.label}
                  rows={[
                    {
                      label: "Executions",
                      value: point.total.toLocaleString(),
                      color: chartColors.amberSolid,
                    },
                    {
                      label: "Errors",
                      value: point.errors.toLocaleString(),
                      color: chartColors.error,
                    },
                  ]}
                />
              );
            }}
          />
          <Bar
            dataKey="total"
            fill={chartColors.amberSolid}
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
