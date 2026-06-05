"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Rendering tier for the hero scene.
 * - `full`    — nodes, edges, pulses, transmission-glass terminals, bloom, parallax.
 * - `reduced` — nodes, edges, pulses, slow drift. No bloom / no glass / no terminals.
 * - `static`  — no `<Canvas>` at all; render the CSS/SVG fallback.
 */
export type DeviceTier = "full" | "reduced" | "static";

/**
 * Synchronous capability heuristic — deliberately avoids drei's `useDetectGPU`,
 * which fetches a remote benchmark JSON. Defaults to `static` so nothing heavy
 * ships on the first client frame (the scene is dynamically imported with
 * `ssr: false`, so this hook only ever runs in the browser).
 */
export function useDeviceTier(): DeviceTier {
  const reducedMotion = useReducedMotion();
  const [tier, setTier] = useState<DeviceTier>("static");

  useEffect(() => {
    if (reducedMotion) {
      setTier("static");
      return;
    }

    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const narrow = window.matchMedia("(max-width: 768px)").matches;
    if (coarsePointer || narrow) {
      setTier("static");
      return;
    }

    const cores = navigator.hardwareConcurrency ?? 4;
    const dpr = window.devicePixelRatio ?? 1;
    if (cores <= 4 || dpr > 2.5) {
      setTier("reduced");
      return;
    }

    setTier("full");
  }, [reducedMotion]);

  return tier;
}
