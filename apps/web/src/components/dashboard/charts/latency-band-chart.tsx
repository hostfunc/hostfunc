"use client";

import type { SeriesPoint } from "@/server/dashboard-overview";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
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

export function LatencyBandChart({ data, bucketKind }: Props) {
  const transformed = data.map((point) => ({
    ...point,
    band: [point.p50WallMs, point.p95WallMs] as [number, number],
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={transformed} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="latBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.cool} stopOpacity={0.45} />
              <stop offset="100%" stopColor={chartColors.cool} stopOpacity={0.05} />
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
            unit="ms"
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            width={48}
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
                      label: "p50",
                      value: `${point.p50WallMs.toLocaleString()} ms`,
                      color: chartColors.cool,
                    },
                    {
                      label: "p95",
                      value: `${point.p95WallMs.toLocaleString()} ms`,
                      color: chartColors.amberSolid,
                    },
                  ]}
                />
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="band"
            stroke="transparent"
            fill="url(#latBand)"
            isAnimationActive={false}
            activeDot={false}
          />
          <Line
            type="monotone"
            dataKey="p95WallMs"
            stroke={chartColors.amberSolid}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="p50WallMs"
            stroke={chartColors.cool}
            strokeWidth={1.5}
            strokeDasharray="3 3"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
