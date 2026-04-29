"use client";

import type { TooltipProps } from "recharts";

interface Row {
  label: string;
  value: string | number;
  color?: string;
}

export function ChartTooltipBox({ title, rows }: { title?: string; rows: Row[] }) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      {title ? <div className="mb-1 font-medium text-[var(--color-bone)]">{title}</div> : null}
      <div className="space-y-0.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2">
            {row.color ? (
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: row.color }}
              />
            ) : null}
            <span className="text-[var(--color-bone-faint)]">{row.label}</span>
            <span className="ml-auto font-mono text-[var(--color-bone)]">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export type RechartsTooltipProps = TooltipProps<number, string>;
