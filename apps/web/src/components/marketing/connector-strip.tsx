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
            className={`mx-auto mb-3 grid size-12 place-items-center rounded-xl ${
              c.available
                ? "bg-[var(--color-amber)] text-[var(--color-ink)]"
                : "bg-white/[0.04] text-[var(--color-bone-muted)]"
            }`}
          >
            <ConnectorBrandIcon slug={c.slug} />
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

function ConnectorBrandIcon({ slug }: { slug: string }) {
  const iconClass = "size-6";
  switch (slug) {
    case "github":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={iconClass} fill="currentColor">
          <path d="M12 1.5a10.5 10.5 0 0 0-3.32 20.47c.53.1.72-.23.72-.5v-1.77c-2.96.64-3.58-1.27-3.58-1.27-.48-1.2-1.17-1.52-1.17-1.52-.96-.66.07-.65.07-.65 1.06.08 1.62 1.09 1.62 1.09.94 1.6 2.47 1.14 3.07.87.1-.69.37-1.14.67-1.4-2.36-.27-4.85-1.18-4.85-5.25 0-1.16.42-2.12 1.1-2.87-.1-.27-.48-1.37.1-2.86 0 0 .9-.29 2.95 1.1a10.2 10.2 0 0 1 5.37 0c2.05-1.39 2.95-1.1 2.95-1.1.58 1.49.2 2.59.1 2.86.68.75 1.1 1.71 1.1 2.87 0 4.08-2.5 4.98-4.88 5.24.39.33.73.97.73 1.96v2.9c0 .28.19.6.73.5A10.5 10.5 0 0 0 12 1.5Z" />
        </svg>
      );
    case "gmail":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={iconClass}>
          <path d="M3 6.5v11h3.2V10.8L12 15l5.8-4.2v6.7H21v-11h-2.8L12 11 5.8 6.5H3Z" fill="#EA4335" />
          <path d="M3 6.5 12 13l9-6.5V5H3v1.5Z" fill="#FBBC04" />
          <path d="M3 5v1.5L12 13V5H3Z" fill="#34A853" />
          <path d="M21 5v1.5L12 13V5h9Z" fill="#4285F4" />
        </svg>
      );
    case "slack":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={iconClass}>
          <rect x="2" y="9.5" width="5" height="5" rx="2.5" fill="#36C5F0" />
          <rect x="4.5" y="2" width="5" height="10" rx="2.5" fill="#36C5F0" />
          <rect x="9.5" y="17" width="10" height="5" rx="2.5" fill="#2EB67D" />
          <rect x="12" y="14.5" width="5" height="7.5" rx="2.5" fill="#2EB67D" />
          <rect x="17" y="9.5" width="5" height="5" rx="2.5" fill="#ECB22E" />
          <rect x="14.5" y="2" width="5" height="10" rx="2.5" fill="#ECB22E" />
          <rect x="2" y="2" width="10" height="5" rx="2.5" fill="#E01E5A" />
          <rect x="2" y="4.5" width="5" height="7.5" rx="2.5" fill="#E01E5A" />
        </svg>
      );
    case "linear":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={iconClass} fill="currentColor">
          <path d="M4 4h3.5v16H4V4Zm5.2 0h3.6l7.2 7.2v3.6l-7.2-7.2H9.2V4Zm0 8.8h3.6l7.2 7.2V20h-3.6l-7.2-7.2v-0Z" />
        </svg>
      );
    case "notion":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={iconClass} fill="currentColor">
          <path d="M4 5.2 9.2 4 20 4.7v13.9L14.8 20 4 19.3V5.2Zm2.6 2.1v9.3l2.5.2V9.3l5.1 7.9 2.4.2V8.1l-2.5-.2v7.2L9 7l-2.4.3Z" />
        </svg>
      );
    case "stripe":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={iconClass} fill="currentColor">
          <path d="M13.7 9.2c-1.8-.7-2.9-1.1-2.9-2 0-.7.6-1.2 1.8-1.2 1.2 0 2.5.3 3.8 1V4.2A8.3 8.3 0 0 0 12.6 3C9.3 3 7 4.8 7 7.5c0 3.2 2.8 4.2 4.8 4.9 1.9.7 2.6 1.1 2.6 1.9 0 .7-.6 1.1-1.8 1.1-1.6 0-3.2-.5-4.6-1.3v2.8c1.5.8 3 1.1 4.7 1.1 3.5 0 5.7-1.7 5.7-4.5 0-3.2-2.6-4.3-4.7-5.1Z" />
        </svg>
      );
    default:
      return <span className="font-display text-lg italic">{slug.slice(0, 1).toUpperCase()}</span>;
  }
}