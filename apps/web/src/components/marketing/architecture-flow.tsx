"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import type { MarketingContent } from "@/lib/marketing-content";

interface Props {
  stages: MarketingContent["architecture"]["stages"];
}

export function ArchitectureFlow({ stages }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div ref={ref} className="relative">
      {/* Horizontal connecting line */}
      <svg
        className="absolute left-0 right-0 top-12 hidden md:block"
        height="2"
        viewBox="0 0 1000 2"
        preserveAspectRatio="none"
      >
        <line x1="0" y1="1" x2="1000" y2="1" stroke="rgba(255,255,255,0.1)" />
        {/* Travelling dot — only when in view */}
        {inView && (
          <motion.circle
            cy="1"
            r="3"
            fill="#e8a317"
            initial={{ cx: 0 }}
            animate={{ cx: 1000 }}
            transition={{
              duration: 4.5,
              repeat: Infinity,
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
            <div className="mx-auto grid size-24 place-items-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink)] font-display text-3xl italic text-[var(--color-amber)]">
              {String(i + 1).padStart(2, "0")}
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