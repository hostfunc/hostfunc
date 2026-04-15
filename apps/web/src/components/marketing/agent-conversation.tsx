"use client";

import { motion, useInView } from "motion/react";
import { Wrench } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AgentMessage } from "@/lib/marketing-content";

interface Props {
  messages: AgentMessage[];
}

export function AgentConversation({ messages }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { margin: "-50px" });
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let i = 0;
    let canceled = false;
    const tick = () => {
      if (canceled) return;
      setShown(i + 1);
      i += 1;
      if (i < messages.length) {
        setTimeout(tick, 1400);
      } else {
        setTimeout(() => {
          if (canceled) return;
          setShown(0);
          i = 0;
          setTimeout(tick, 800);
        }, 4000);
      }
    };
    tick();
    return () => {
      canceled = true;
    };
  }, [inView, messages.length]);

  return (
    <div
      ref={containerRef}
      className="flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)] shadow-2xl shadow-black/40"
    >
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-ink)] px-4 py-2.5">
        <span className="size-2 rounded-full bg-[var(--color-amber)]" />
        <span className="font-mono text-[11px] tracking-wide text-[var(--color-bone-faint)]">
          claude · connected to hostfunc
        </span>
      </div>
      <div className="flex-1 space-y-4 overflow-hidden p-5">
        {messages.slice(0, shown).map((msg, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
<Message key={i} msg={msg} index={i} />
        ))}
      </div>
    </div>
  );
}

function Message({ msg, index }: { msg: AgentMessage; index: number }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: index * 0.05 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className="max-w-[85%] space-y-2">
        {!isUser && (
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--color-bone-faint)]">
            <span className="size-1 rounded-full bg-[var(--color-amber)]" />
            assistant
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "rounded-tr-sm bg-[var(--color-amber)] text-[var(--color-ink)]"
              : "rounded-tl-sm bg-white/[0.03] text-[var(--color-bone)] border border-[var(--color-border)]"
          }`}
        >
          {msg.content}
        </div>
        {msg.tool && <ToolCall tool={msg.tool} />}
      </div>
    </motion.div>
  );
}

function ToolCall({ tool }: { tool: NonNullable<AgentMessage["tool"]> }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.4 }}
      className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-ink)]"
    >
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2">
        <Wrench className="size-3 text-[var(--color-amber)]" />
        <span className="font-mono text-[11px] text-[var(--color-bone-muted)]">
          {tool.name}
        </span>
        <span className="ml-auto text-[10px] uppercase tracking-widest text-[var(--color-emerald)]">
          200
        </span>
      </div>
      <div className="space-y-2 p-3">
        <div className="font-mono text-[11px] text-[var(--color-bone-faint)]">
          {JSON.stringify(tool.args)}
        </div>
        <div className="rounded bg-black/40 p-2 font-mono text-[11px] text-[var(--color-syntax-string)]">
          {tool.output}
        </div>
      </div>
    </motion.div>
  );
}