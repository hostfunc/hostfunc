"use client";

import type { SeriesPoint } from "@/server/dashboard-overview";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartColors } from "./chart-theme";
import { ChartTooltipBox } from "./chart-tooltip";

interface Props {
  data: SeriesPoint[];
  bucketKind: "hour" | "day";
}

function formatBucketLabel(value: string, kind: "hour" | "day"): string {
  const date = new Date(value);
  if (kind === "hour") {
    return date.toLocaleTimeString(undefined, { hour: "numeric" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ExecutionsAreaChart({ data, bucketKind }: Props) {
  const transformed = data.map((point) => ({
    ...point,
    ok: Math.max(point.total - point.errors, 0),
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={transformed} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="execOk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.amberSolid} stopOpacity={0.6} />
              <stop offset="100%" stopColor={chartColors.amberSolid} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="execErr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.error} stopOpacity={0.5} />
              <stop offset="100%" stopColor={chartColors.error} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={chartColors.border} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="bucket"
            stroke={chartColors.boneFaint}
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => formatBucketLabel(value as string, bucketKind)}
            tickMargin={8}
            minTickGap={28}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke={chartColors.boneFaint}
            tick={{ fontSize: 11 }}
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            cursor={{ stroke: chartColors.border }}
            content={(props) => {
              if (!props.active || !props.payload?.length) return null;
              const point = props.payload[0]?.payload as (typeof transformed)[number] | undefined;
              if (!point) return null;
              return (
                <ChartTooltipBox
                  title={formatBucketLabel(point.bucket, bucketKind)}
                  rows={[
                    {
                      label: "Successful",
                      value: point.ok.toLocaleString(),
                      color: chartColors.amberSolid,
                    },
                    {
                      label: "Errors",
                      value: point.errors.toLocaleString(),
                      color: chartColors.error,
                    },
                    { label: "Total", value: point.total.toLocaleString() },
                  ]}
                />
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="ok"
            stackId="1"
            stroke={chartColors.amberSolid}
            strokeWidth={2}
            fill="url(#execOk)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="errors"
            stackId="1"
            stroke={chartColors.error}
            strokeWidth={2}
            fill="url(#execErr)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
