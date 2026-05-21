"use client";

import { isHttpLogo } from "@/lib/logo";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";
import { useState } from "react";

export type FunctionLogoSize = "sm" | "md" | "lg";

const SIZE_STYLES: Record<FunctionLogoSize, { box: string; icon: string }> = {
  sm: { box: "h-7 w-7 rounded", icon: "h-3.5 w-3.5" },
  md: { box: "h-8 w-8 rounded", icon: "h-4 w-4" },
  lg: { box: "h-16 w-16 rounded-xl", icon: "h-7 w-7" },
};

/**
 * Renders a function's uploaded logo, falling back to the default activity mark
 * when there is no logo or the image fails to load (stale URL, deleted object,
 * network error).
 */
export function FunctionLogo({
  logo,
  name,
  size = "md",
  className,
}: {
  logo: string | null;
  name: string;
  size?: FunctionLogoSize;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  // Re-arm the error fallback when the source changes (e.g. after an upload):
  // adjust state during render rather than in an effect.
  const [renderedLogo, setRenderedLogo] = useState(logo);
  if (renderedLogo !== logo) {
    setRenderedLogo(logo);
    setErrored(false);
  }

  const styles = SIZE_STYLES[size];
  const showImage = isHttpLogo(logo) && !errored;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden border border-[var(--color-amber)]/30 bg-[var(--color-amber)]/10",
        styles.box,
        className,
      )}
    >
      {showImage && logo ? (
        <img
          src={logo}
          alt={`${name} logo`}
          loading="lazy"
          decoding="async"
          onError={() => setErrored(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Activity className={cn(styles.icon, "text-[var(--color-amber)]")} />
      )}
    </div>
  );
}
