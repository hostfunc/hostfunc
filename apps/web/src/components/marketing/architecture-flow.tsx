"use client";

import { motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { MarketingContent } from "@/lib/marketing-content";

interface Props {
  stages: MarketingContent["architecture"]["stages"];
}

export function ArchitectureFlow({ stages }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [activeStage, setActiveStage] = useState(0);
  const [pulseTick, setPulseTick] = useState(0);

  const stageCount = Math.max(stages.length, 1);
  const travelPoints = Math.max(stageCount - 1, 1);
  const cycleDuration = 14;
  const stageDurationMs = (cycleDuration * 1000) / travelPoints;

  useEffect(() => {
    if (!inView || stages.length === 0) return;
    setActiveStage(0);
    setPulseTick((prev) => prev + 1);

    const interval = window.setInterval(() => {
      setActiveStage((prev) => {
        const next = (prev + 1) % stageCount;
        setPulseTick((tick) => tick + 1);
        return next;
      });
    }, stageDurationMs);

    return () => window.clearInterval(interval);
  }, [inView, stageCount, stageDurationMs, stages.length]);

  return (
    <div ref={ref} className="relative">
      {/* Horizontal connecting line */}
      <svg
        className="absolute left-[10%] right-[10%] top-12 hidden md:block"
        height="2"
        viewBox="0 0 1000 2"
        preserveAspectRatio="none"
      >
        <title>Architecture stage connector</title>
        <line x1="0" y1="1" x2="1000" y2="1" stroke="rgba(255,255,255,0.1)" />
        {/* Travelling dot — only when in view */}
        {inView && (
          <motion.circle
            cy="1"
            r="3"
            fill="#e8a317"
            initial={{ cx: 0 }}
            animate={{
              cx: Array.from({ length: stageCount }, (_, i) =>
                stageCount <= 1 ? 500 : (i / (stageCount - 1)) * 1000,
              ),
            }}
            transition={{
              duration: cycleDuration,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        )}
      </svg>

      <div className="grid gap-6 md:grid-cols-5">
        {stages.map((stage, i) => (
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="relative text-center"
          >
            <div className="relative mx-auto size-24">
              <motion.svg
                className="pointer-events-none absolute inset-0"
                viewBox="0 0 96 96"
                aria-hidden="true"
                key={`${stage.id}-${pulseTick}-${activeStage === i ? "active" : "idle"}`}
              >
                <motion.rect
                  x="2"
                  y="2"
                  width="92"
                  height="92"
                  rx="16"
                  fill="none"
                  stroke="#e8a317"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeDasharray="320"
                  initial={{ strokeDashoffset: 320, opacity: 0 }}
                  animate={
                    activeStage === i
                      ? { strokeDashoffset: 0, opacity: [0, 0.75, 0.18] }
                      : { strokeDashoffset: 320, opacity: 0 }
                  }
                  transition={{ duration: 1.1, ease: "easeOut" }}
                />
              </motion.svg>
              <div className="grid size-24 place-items-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink)] font-display text-3xl italic text-[var(--color-amber)]">
                {String(i + 1).padStart(2, "0")}
              </div>
            </div>
            <h3 className="mt-4 font-medium text-[var(--color-bone)]">
              {stage.label}
            </h3>
            <p className="mx-auto mt-1 max-w-[14ch] text-pretty text-xs leading-relaxed text-[var(--color-bone-muted)]">
              {stage.detail}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}