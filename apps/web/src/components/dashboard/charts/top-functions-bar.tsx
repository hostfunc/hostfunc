"use client";

import type { TopFunction } from "@/server/dashboard-overview";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartColors } from "./chart-theme";
import { ChartTooltipBox } from "./chart-tooltip";

interface Props {
  data: TopFunction[];
}

export function TopFunctionsBar({ data }: Props) {
  const sorted = [...data].sort((a, b) => a.total - b.total);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
        >
          <CartesianGrid stroke={chartColors.border} strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            stroke={chartColors.boneFaint}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            dataKey="fnSlug"
            type="category"
            stroke={chartColors.boneFaint}
            tick={{ fontSize: 11, fill: chartColors.bone }}
            axisLine={false}
            tickLine={false}
            width={140}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={(props) => {
              if (!props.active || !props.payload?.length) return null;
              const point = props.payload[0]?.payload as TopFunction | undefined;
              if (!point) return null;
              return (
                <ChartTooltipBox
                  title={point.fnSlug}
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
                    {
                      label: "p95",
                      value: `${point.p95WallMs.toLocaleString()} ms`,
                      color: chartColors.cool,
                    },
                  ]}
                />
              );
            }}
          />
          <Bar
            dataKey="total"
            fill={chartColors.amberSolid}
            radius={[0, 6, 6, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
