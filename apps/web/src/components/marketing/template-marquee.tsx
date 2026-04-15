"use client";

import type { MarketingContent } from "@/lib/marketing-content";

interface Props {
  templates: MarketingContent["templates"];
}

export function TemplateMarquee({ templates }: Props) {
  // Duplicate so the loop is seamless
  const row1 = [...templates, ...templates];
  const row2 = [...templates.slice().reverse(), ...templates.slice().reverse()];

  return (
    <div className="space-y-4">
      <MarqueeRow items={row1} duration={50} direction="left" />
      <MarqueeRow items={row2} duration={60} direction="right" />

      <style jsx>{`
        @keyframes scroll-left {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes scroll-right {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

function MarqueeRow({
  items,
  duration,
  direction,
}: {
  items: MarketingContent["templates"];
  duration: number;
  direction: "left" | "right";
}) {
  return (
    <div className="group relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-[var(--color-ink)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-[var(--color-ink)] to-transparent" />
      <div
        className="flex w-max gap-3"
        style={{
          animation: `scroll-${direction} ${duration}s linear infinite`,
          animationPlayState: "running",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.animationPlayState = "paused";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.animationPlayState = "running";
        }}
      >
        {items.map((t, i) => (
          <div
            key={`${t.name}-${i}`}
            className="w-72 shrink-0 rounded-xl border border-[var(--color-border)] bg-white/[0.02] p-4 transition-colors hover:border-[var(--color-amber)]/30 hover:bg-white/[0.04]"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{t.icon}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-[var(--color-bone)]">
                    {t.name}
                  </span>
                  <span className="rounded-full bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[var(--color-bone-faint)]">
                    {t.category}
                  </span>
                </div>
                <div className="mt-1 text-xs text-[var(--color-bone-muted)]">
                  {t.description}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}