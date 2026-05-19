"use client";

import type { MarketingContent } from "@/lib/marketing-content";
import { motion, useInView } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface Props {
  stages: MarketingContent["architecture"]["stages"];
}

export function ArchitectureFlow({ stages }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const firstBadgeRef = useRef<HTMLDivElement>(null);
  const lastBadgeRef = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [activeStage, setActiveStage] = useState(0);
  const [pulseTick, setPulseTick] = useState(0);
  const [trackInsets, setTrackInsets] = useState<{ left: number; right: number } | null>(null);

  const stageCount = Math.max(stages.length, 1);
  const travelPoints = Math.max(stageCount - 1, 1);
  const cycleDuration = 14;
  const stageDurationMs = (cycleDuration * 1000) / travelPoints;

  useLayoutEffect(() => {
    const container = ref.current;
    const first = firstBadgeRef.current;
    const last = lastBadgeRef.current;
    if (!container || !first || !last) return;

    const measure = () => {
      const containerRect = container.getBoundingClientRect();
      const firstRect = first.getBoundingClientRect();
      const lastRect = last.getBoundingClientRect();
      const left = firstRect.left + firstRect.width / 2 - containerRect.left;
      const right = containerRect.right - (lastRect.left + lastRect.width / 2);
      setTrackInsets({ left, right });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(first);
    observer.observe(last);
    return () => observer.disconnect();
  }, []);

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
      {/* Horizontal connecting line from node 1 centre to node N centre */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-12 hidden h-px md:block"
        style={{
          left: trackInsets ? `${trackInsets.left}px` : undefined,
          right: trackInsets ? `${trackInsets.right}px` : undefined,
          visibility: trackInsets ? "visible" : "hidden",
          background: "rgba(255,255,255,0.1)",
        }}
      >
        {/* Travelling dot — only when in view */}
        {inView && (
          <motion.div
            className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e8a317]"
            style={{ top: "50%" }}
            initial={{ left: "0%" }}
            animate={{
              left: Array.from({ length: stageCount }, (_, i) =>
                stageCount <= 1 ? "50%" : `${(i / (stageCount - 1)) * 100}%`,
              ),
            }}
            transition={{
              duration: cycleDuration,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        {stages.map((stage, i) => (
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="relative text-center"
          >
            <div
              ref={i === 0 ? firstBadgeRef : i === stages.length - 1 ? lastBadgeRef : null}
              className="relative mx-auto size-24"
            >
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
              <div className="grid size-24 place-items-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink)] font-display text-3xl text-[var(--color-amber)]">
                {String(i + 1).padStart(2, "0")}
              </div>
            </div>
            <h3 className="mt-4 font-medium text-[var(--color-bone)]">{stage.label}</h3>
            <p className="mx-auto mt-1 max-w-[14ch] text-pretty text-xs leading-relaxed text-[var(--color-bone-muted)]">
              {stage.detail}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
