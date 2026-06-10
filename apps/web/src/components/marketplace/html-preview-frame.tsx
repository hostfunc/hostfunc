"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";

interface Props {
  fnId: string;
  /** Card-sized, non-interactive thumbnail (no "open in new tab" link). */
  compact?: boolean;
}

/**
 * Renders a public function's deployed `index.html` in a sandboxed iframe.
 * `sandbox="allow-scripts"` without `allow-same-origin` runs the page at an
 * opaque origin, so user-authored scripts cannot reach hostfunc cookies or DOM.
 */
export function HtmlPreviewFrame({ fnId, compact = false }: Props) {
  const [loaded, setLoaded] = useState(false);
  const src = `/api/marketplace/${fnId}/assets/index.html`;

  if (compact) {
    return (
      <div className="relative h-full min-h-[11rem] w-full overflow-hidden rounded-lg bg-[var(--color-ink-elevated)]">
        {!loaded ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-ink-elevated)] text-xs text-[var(--color-bone-muted)]">
            <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Loading preview…
          </div>
        ) : null}
        {/* Oversized by one scrollbar-width past the overflow-hidden parent so the
            iframe document's own scrollbars are clipped out of view. */}
        <iframe
          title="Function preview"
          src={src}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          loading="lazy"
          tabIndex={-1}
          onLoad={() => setLoaded(true)}
          style={{ width: "calc(100% + 17px)", height: "calc(100% + 17px)" }}
          className="pointer-events-none absolute left-0 top-0 border-0"
        />
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div className="relative h-[460px] overflow-hidden rounded-xl bg-[var(--color-ink-elevated)]">
        {!loaded ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-ink-elevated)] text-sm text-[var(--color-bone-muted)]">
            <Loader2 className="mr-2 size-4 animate-spin" /> Loading preview…
          </div>
        ) : null}
        <iframe
          title="Function preview"
          src={src}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className="size-full border-0"
        />
      </div>
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-xs text-[var(--color-bone-muted)] transition hover:text-[var(--color-bone)]"
      >
        <ExternalLink className="size-3.5" />
        Open preview in a new tab
      </a>
    </div>
  );
}
