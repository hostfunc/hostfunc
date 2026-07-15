"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

interface FlowPath {
  d: string;
  hue: "amber" | "cyan";
  /** seconds for one pulse to travel the full path */
  duration: number;
  /** seconds before the first pulse departs */
  delay: number;
}

/**
 * Request-paths sweeping in from both edges of the hero, converging behind
 * the headline. Geometry is fixed to the 1440x720 viewBox; `slice` cropping
 * handles every breakpoint.
 */
const PATHS: FlowPath[] = [
  { d: "M 0 80 C 320 120, 520 200, 700 268", hue: "amber", duration: 10, delay: 0 },
  { d: "M 0 200 C 300 220, 500 260, 690 292", hue: "cyan", duration: 13, delay: 2.2 },
  { d: "M 0 340 C 280 330, 520 310, 688 306", hue: "amber", duration: 9, delay: 4.6 },
  { d: "M 0 480 C 300 460, 540 380, 700 330", hue: "amber", duration: 12, delay: 1.4 },
  { d: "M 0 620 C 340 600, 560 460, 706 352", hue: "amber", duration: 14, delay: 6.8 },
  { d: "M 1440 80 C 1120 120, 920 200, 740 268", hue: "amber", duration: 11, delay: 3.1 },
  { d: "M 1440 200 C 1140 220, 940 260, 750 292", hue: "amber", duration: 9.5, delay: 7.4 },
  { d: "M 1440 340 C 1160 330, 920 310, 752 306", hue: "cyan", duration: 13.5, delay: 0.9 },
  { d: "M 1440 480 C 1140 460, 900 380, 740 330", hue: "amber", duration: 10.5, delay: 5.3 },
  { d: "M 1440 620 C 1100 600, 880 460, 734 352", hue: "amber", duration: 12.5, delay: 8.6 },
];

const STROKE: Record<FlowPath["hue"], string> = {
  amber: "#e8a317",
  cyan: "#22d3ee",
};

export function HeroFlowField() {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref);
  const reducedMotion = useReducedMotion();

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <svg
        ref={ref}
        viewBox="0 0 1440 720"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        aria-hidden="true"
      >
        <defs>
          {/* Fade the field out before it reaches the trust line */}
          <linearGradient id="hero-flow-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="1" />
            <stop offset="0.55" stopColor="#fff" stopOpacity="1" />
            <stop offset="0.82" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id="hero-flow-mask">
            <rect width="1440" height="720" fill="url(#hero-flow-fade)" />
          </mask>
          <radialGradient id="hero-flow-glow">
            <stop offset="0" stopColor="#e8a317" stopOpacity="0.08" />
            <stop offset="1" stopColor="#e8a317" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g mask="url(#hero-flow-mask)">
          {/* Convergence glow behind the headline */}
          <circle cx="720" cy="300" r="200" fill="url(#hero-flow-glow)" />

          {/* Rails — markup is identical with and without reduced motion (SSR renders the
              non-reduced branch, so diverging elements would be a hydration mismatch);
              reduced motion just makes the draw-in instant. */}
          {PATHS.map((p, i) => (
            <motion.path
              key={p.d}
              d={p.d}
              fill="none"
              stroke={STROKE[p.hue]}
              strokeWidth="1"
              strokeOpacity="0.12"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { duration: 1.4, delay: i * 0.12, ease: "easeOut" }
              }
            />
          ))}

          {/* Travelling pulses — one comet per rail, staggered so only a few are visible at once */}
          {inView &&
            !reducedMotion &&
            PATHS.map((p) => (
              <motion.path
                key={p.d}
                d={p.d}
                pathLength={1}
                fill="none"
                stroke={STROKE[p.hue]}
                strokeWidth="2"
                strokeOpacity="0.65"
                strokeLinecap="round"
                strokeDasharray="0.05 0.95"
                initial={{ strokeDashoffset: 1 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
              />
            ))}
        </g>
      </svg>
    </div>
  );
}
