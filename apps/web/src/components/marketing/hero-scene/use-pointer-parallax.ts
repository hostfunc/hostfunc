"use client";

import { useEffect, useRef } from "react";

export interface PointerTarget {
  x: number;
  y: number;
}

/**
 * Tracks the pointer at the window level (normalized to -1..1) into a ref.
 *
 * Read from `useFrame` for parallax. A window listener (not the canvas) is used
 * because the hero headline covers most of the canvas, so `state.pointer` would
 * rarely update. The listener is `passive` — zero scroll cost, no scroll hijack.
 */
export function usePointerParallax(): { current: PointerTarget } {
  const target = useRef<PointerTarget>({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return target;
}
