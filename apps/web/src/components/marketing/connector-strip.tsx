"use client";

import { CheckCircle2, Clock } from "lucide-react";
import type { MarketingContent } from "@/lib/marketing-content";

interface Props {
  connectors: MarketingContent["connectors"];
}

export function ConnectorStrip({ connectors }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
      {connectors.map((c) => (
        <div
          key={c.slug}
          className={`relative overflow-hidden rounded-xl border p-5 text-center transition-all ${
            c.available
              ? "border-[var(--color-amber)]/30 bg-[var(--color-amber-soft)] hover:border-[var(--color-amber)]/60"
              : "border-[var(--color-border)] bg-white/[0.02] opacity-60"
          }`}
        >
          <div
            className={`mx-auto mb-3 grid size-12 place-items-center rounded-xl font-display text-2xl italic ${
              c.available
                ? "bg-[var(--color-amber)] text-[var(--color-ink)]"
                : "bg-white/[0.04] text-[var(--color-bone-muted)]"
            }`}
          >
            {c.name[0]}
          </div>
          <div className="text-sm font-medium text-[var(--color-bone)]">{c.name}</div>
          <div className="mt-1 flex items-center justify-center gap-1 text-[10px] uppercase tracking-widest text-[var(--color-bone-faint)]">
            {c.available ? (
              <>
                <CheckCircle2 className="size-3 text-[var(--color-emerald)]" />
                live
              </>
            ) : (
              <>
                <Clock className="size-3" />
                soon
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}