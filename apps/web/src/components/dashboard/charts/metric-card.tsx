import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { MetricSparkline, type SparklineKind, type SparklineTone } from "./metric-sparkline";

export interface MetricCardProps {
  label: string;
  icon?: ReactNode;
  value: string;
  hint?: string;
  /** Current period value as a number (used to compute delta with `previous`). */
  current?: number;
  previous?: number;
  /** Lower-is-better flips the delta colors (e.g. error rate, p95 latency). */
  lowerIsBetter?: boolean;
  /** Optional explicit delta string. If provided, overrides computed delta from current/previous. */
  deltaLabel?: string;
  data: number[];
  spark: SparklineKind;
  tone?: SparklineTone;
}

function formatPercent(diff: number): string {
  const sign = diff > 0 ? "+" : "";
  return `${sign}${(diff * 100).toFixed(1)}%`;
}

export function MetricCard({
  label,
  icon,
  value,
  hint,
  current,
  previous,
  lowerIsBetter = false,
  deltaLabel,
  data,
  spark,
  tone = "amber",
}: MetricCardProps) {
  let deltaText: string | null = deltaLabel ?? null;
  let deltaDirection: "up" | "down" | "flat" = "flat";
  let deltaTone: "good" | "bad" | "muted" = "muted";

  if (!deltaLabel && current != null && previous != null) {
    if (previous === 0 && current === 0) {
      deltaText = "—";
    } else if (previous === 0) {
      deltaText = "new";
      deltaDirection = "up";
      deltaTone = lowerIsBetter ? "bad" : "good";
    } else {
      const ratio = (current - previous) / previous;
      deltaText = formatPercent(ratio);
      if (Math.abs(ratio) < 0.005) {
        deltaDirection = "flat";
        deltaTone = "muted";
      } else if (ratio > 0) {
        deltaDirection = "up";
        deltaTone = lowerIsBetter ? "bad" : "good";
      } else {
        deltaDirection = "down";
        deltaTone = lowerIsBetter ? "good" : "bad";
      }
    }
  }

  const deltaColor =
    deltaTone === "good"
      ? "text-emerald-300"
      : deltaTone === "bad"
        ? "text-red-300"
        : "text-[var(--color-bone-faint)]";
  const DeltaIcon =
    deltaDirection === "up"
      ? ArrowUpRight
      : deltaDirection === "down"
        ? ArrowDownRight
        : ArrowRight;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/75 p-5 text-[var(--color-bone)] shadow-sm transition-colors hover:border-[var(--color-amber)]/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-bone-faint)]">
            {label}
          </p>
          <p className="mt-2 font-display text-3xl tracking-tight text-[var(--color-bone)]">
            {value}
          </p>
        </div>
        {icon ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-white/[0.04] text-[var(--color-bone-faint)]">
            {icon}
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs">
        {deltaText ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-white/[0.03] px-2 py-0.5 font-medium ${deltaColor}`}
          >
            <DeltaIcon className="size-3" />
            {deltaText}
          </span>
        ) : null}
        {hint ? <span className="text-[var(--color-bone-faint)]">{hint}</span> : null}
      </div>

      <div className="mt-4">
        <MetricSparkline kind={spark} data={data} tone={tone} />
      </div>
    </div>
  );
}
