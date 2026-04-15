"use client";

import { motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface Frame {
  command: string;
  output: string[];
  delayMs?: number;
}

interface Props {
  sequence: Frame[];
}

export function TerminalDemo({ sequence }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { margin: "-100px" });
  const [step, setStep] = useState(-1);
  const [typed, setTyped] = useState("");
  const [outputs, setOutputs] = useState<string[][]>([]);

  useEffect(() => {
    if (!inView) return;
    let canceled = false;
    let s = 0;

    const advance = () => {
      if (canceled || s >= sequence.length) {
        // Loop after pause
        if (!canceled) {
          setTimeout(() => {
            if (canceled) return;
            s = 0;
            setStep(-1);
            setTyped("");
            setOutputs([]);
            advance();
          }, 4000);
        }
        return;
      }

      const frame = sequence[s];
      if (!frame) return;
      setStep(s);
      setTyped("");

      // Type the command
      let i = 0;
      const typeTick = () => {
        if (canceled) return;
        setTyped(frame.command.slice(0, i));
        i += 1;
        if (i <= frame.command.length) {
          setTimeout(typeTick, 26 + Math.random() * 30);
        } else {
          // Pause then show output
          setTimeout(() => {
            if (canceled) return;
            setOutputs((prev) => [...prev, frame.output]);
            s += 1;
            setTimeout(advance, frame.delayMs ?? 1100);
          }, 380);
        }
      };
      typeTick();
    };

    advance();
    return () => {
      canceled = true;
    };
  }, [inView, sequence]);

  useEffect(() => {
    if (!outputRef.current) return;
    outputRef.current.scrollTop = outputRef.current.scrollHeight;
  });

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[#0a0908] shadow-2xl shadow-black/50"
    >
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-ink)] px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[var(--color-rose)]/70" />
          <span className="size-2.5 rounded-full bg-[var(--color-syntax-number)]/70" />
          <span className="size-2.5 rounded-full bg-[var(--color-emerald)]/70" />
        </div>
        <span className="ml-3 font-mono text-[11px] tracking-wide text-[var(--color-bone-faint)]">
          ~/projects/weather-digest
        </span>
      </div>
      <div
        ref={outputRef}
        className="h-[360px] space-y-3 overflow-auto p-5 font-mono text-[13px] leading-relaxed"
      >
        {sequence.slice(0, step + 1).map((frame, i) => (
          <div key={`${frame.command}-${frame.output.join("|")}`}>
            <div className="flex gap-2">
              <span className="text-[var(--color-amber)]">$</span>
              <span className="text-[var(--color-bone)]">
                {i === step ? typed : frame.command}
                {i === step && (
                  <motion.span
                    className="ml-0.5 inline-block h-[1em] w-[8px] -translate-y-[1px] bg-[var(--color-amber)]"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.9, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  />
                )}
              </span>
            </div>
            {(() => {
              const seen = new Map<string, number>();
              return outputs[i]?.map((line) => {
                const count = (seen.get(line) ?? 0) + 1;
                seen.set(line, count);
                return (
              <motion.div
                key={`${frame.command}-${line}-${count}`}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18, delay: count * 0.06 }}
                className={`pl-3 ${
                  line.startsWith("✓")
                    ? "text-[var(--color-emerald)]"
                    : line.startsWith("?")
                      ? "text-[var(--color-bone-muted)]"
                      : line.startsWith("{")
                        ? "text-[var(--color-syntax-string)]"
                        : "text-[var(--color-bone-muted)]"
                }`}
              >
                {line}
              </motion.div>
                );
              });
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}