"use client";

import { Area, AreaChart, Bar, BarChart, Line, LineChart, ResponsiveContainer } from "recharts";
import { chartColors } from "./chart-theme";

export type SparklineKind = "area" | "line" | "bar" | "dots";
export type SparklineTone = "amber" | "ok" | "error" | "cool";

const TONES: Record<SparklineTone, string> = {
  amber: chartColors.amberSolid,
  ok: chartColors.ok,
  error: chartColors.error,
  cool: chartColors.cool,
};

interface MetricSparklineProps {
  kind: SparklineKind;
  data: number[];
  tone?: SparklineTone;
  height?: number;
}

export function MetricSparkline({ kind, data, tone = "amber", height = 56 }: MetricSparklineProps) {
  const color = TONES[tone];
  const points =
    data.length > 0 ? data.map((value, index) => ({ x: index, value })) : [{ x: 0, value: 0 }];
  const gradientId = `sparkline-${tone}-${kind}`;

  if (kind === "bar") {
    return (
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (kind === "dots") {
    return (
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 6, right: 2, left: 2, bottom: 2 }}>
            <Line
              type="linear"
              dataKey="value"
              stroke="transparent"
              dot={{ r: 2.5, fill: color, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (kind === "line") {
    return (
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 4, right: 2, left: 2, bottom: 2 }}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.55} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
