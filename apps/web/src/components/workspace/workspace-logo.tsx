"use client";

import { isHttpLogo } from "@/lib/logo";
import { cn } from "@/lib/utils";
import { Hexagon } from "lucide-react";
import { useState } from "react";

export type WorkspaceLogoSize = "sm" | "md" | "lg";

const SIZE_STYLES: Record<WorkspaceLogoSize, { wrapper: string; inner: string; radius: string }> = {
  // Navbar workspace-switcher trigger.
  sm: {
    wrapper: "rounded-md bg-[var(--color-amber)]/20 p-1 text-[var(--color-amber)]",
    inner: "h-4 w-4",
    radius: "rounded-[3px]",
  },
  // Navbar workspace-switcher dropdown row.
  md: {
    wrapper:
      "flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-amber)]/15 p-1 text-[var(--color-amber)]",
    inner: "h-3 w-3",
    radius: "rounded-[3px]",
  },
  // Settings preview.
  lg: {
    wrapper:
      "flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-amber)]/15 p-1.5 text-[var(--color-amber)]",
    inner: "h-full w-full",
    radius: "rounded-lg",
  },
};

/**
 * Renders a workspace's uploaded logo, falling back to the default hexagon mark
 * when there is no logo, the value is a legacy preset id, or the image fails to
 * load (stale URL, deleted object, network error).
 */
export function WorkspaceLogo({
  logo,
  name,
  size = "sm",
  className,
}: {
  logo: string | null;
  name: string;
  size?: WorkspaceLogoSize;
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
    <div className={cn(styles.wrapper, className)}>
      {showImage && logo ? (
        <img
          src={logo}
          alt={`${name} logo`}
          loading="lazy"
          decoding="async"
          onError={() => setErrored(true)}
          className={cn(styles.inner, styles.radius, "block object-cover")}
        />
      ) : (
        <Hexagon className={cn(styles.inner, "fill-[var(--color-amber)]/20")} />
      )}
    </div>
  );
}
