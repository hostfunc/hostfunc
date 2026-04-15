"use client";

import { motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface Props {
  filename: string;
  code: string;
  /** Average ms per character */
  speed?: number;
  /** Auto-start, or wait for visibility */
  autoStart?: boolean;
}

export function AnimatedEditor({
  filename,
  code,
  speed = 18,
  autoStart = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLPreElement>(null);
  const inView = useInView(containerRef, { once: true, margin: "-100px" });
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!autoStart && !inView) return;

    let i = 0;
    let canceled = false;

    const tick = () => {
      if (canceled || i > code.length) return;
      setTyped(code.slice(0, i));

      // Realistic typing rhythm — pauses on newlines and periods,
      // bursts on long runs of regular characters.
      const ch = code[i];
      let delay = speed;
      if (ch === "\n") delay = speed * 6;
      else if (ch === " ") delay = speed * 0.6;
      else if (ch === "(" || ch === "{" || ch === "[") delay = speed * 1.5;
      else delay += (Math.random() - 0.5) * speed * 0.4;

      i += 1;
      setTimeout(tick, delay);
    };

    tick();
    return () => {
      canceled = true;
    };
  }, [autoStart, inView, code, speed]);

  useEffect(() => {
    if (!contentRef.current) return;
    if (typed.length === 0) return;
    contentRef.current.scrollTop = contentRef.current.scrollHeight;
  }, [typed]);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)] shadow-2xl shadow-black/40"
    >
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-ink)] px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[var(--color-rose)]/70" />
          <span className="size-2.5 rounded-full bg-[var(--color-syntax-number)]/70" />
          <span className="size-2.5 rounded-full bg-[var(--color-emerald)]/70" />
        </div>
        <span className="ml-3 font-mono text-[11px] tracking-wide text-[var(--color-bone-faint)]">
          {filename}
        </span>
      </div>
      <div className="relative flex h-[360px] font-mono text-[13px] leading-[1.7]">
        <LineNumbers code={typed} />
        <pre
          ref={contentRef}
          className="flex-1 overflow-auto p-4 pl-2 text-[var(--color-syntax-property)]"
        >
          <code>
            <Highlighted code={typed} />
            <motion.span
              className="ml-px inline-block h-[1.1em] w-[6px] -translate-y-[2px] bg-[var(--color-amber)]"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            />
          </code>
        </pre>
      </div>
    </div>
  );
}

function LineNumbers({ code }: { code: string }) {
  const lines = code.split("\n");
  return (
    <div className="select-none border-r border-[var(--color-border)] py-4 pr-3 pl-4 text-right text-[var(--color-bone-faint)]">
      {lines.map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
<div key={i}>{i + 1}</div>
      ))}
    </div>
  );
}

/* ─────────── tiny TypeScript tokenizer ─────────── */

const KEYWORDS = new Set([
  "import", "from", "export", "async", "await", "function", "const", "let", "var",
  "return", "if", "else", "for", "while", "of", "in", "new", "class", "extends",
  "interface", "type", "enum", "as", "default", "true", "false", "null", "undefined",
]);

function Highlighted({ code }: { code: string }) {
  const tokens = tokenize(code);
  let offset = 0;
  return (
    <>
      {tokens.map((t) => {
        const key = `${offset}-${t.text}`;
        offset += t.text.length;
        return (
          <span key={key} className={t.className}>
            {t.text}
          </span>
        );
      })}
    </>
  );
}

function tokenize(src: string): Array<{ text: string; className: string }> {
  const out: Array<{ text: string; className: string }> = [];
  let i = 0;

  const push = (text: string, className = "") => out.push({ text, className });

  while (i < src.length) {
    const c = src[i];

    // Line comment
    if (c === "/" && src[i + 1] === "/") {
      let j = i;
      while (j < src.length && src[j] !== "\n") {
        j++;
      }
      push(src.slice(i, j), "text-[var(--color-syntax-comment)] italic");
      i = j;
      continue;
    }

    // String (single, double, backtick)
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      let j = i + 1;
      while (j < src.length && src[j] !== q) {
        if (src[j] === "\\") j += 2;
        else j++;
      }
      j = Math.min(j + 1, src.length);
      push(src.slice(i, j), "text-[var(--color-syntax-string)]");
      i = j;
      continue;
    }

    // Number
    if (c && /[0-9]/.test(c)) {
      let j = i;
      while (j < src.length) {
        const ch = src[j];
        if (!ch || !/[0-9._]/.test(ch)) break;
        j++;
      }
      push(src.slice(i, j), "text-[var(--color-syntax-number)]");
      i = j;
      continue;
    }

    // Identifier / keyword / function call
    if (c && /[A-Za-z_$]/.test(c)) {
      let j = i;
      while (j < src.length) {
        const ch = src[j];
        if (!ch || !/[A-Za-z0-9_$]/.test(ch)) break;
        j++;
      }
      const word = src.slice(i, j);
      if (KEYWORDS.has(word)) {
        push(word, "text-[var(--color-syntax-keyword)]");
      } else if (src[j] === "(") {
        push(word, "text-[var(--color-syntax-function)]");
      } else if (/^[A-Z]/.test(word)) {
        push(word, "text-[var(--color-syntax-type)]");
      } else {
        push(word);
      }
      i = j;
      continue;
    }

    // Punctuation chunk
    let j = i;
    while (j < src.length) {
      const ch = src[j];
      if (!ch || !/[^A-Za-z0-9_$"'`/\s]/.test(ch)) break;
      // Stop if we hit something that looks like a string start
      if (ch === '"' || ch === "'" || ch === "`") break;
      // Stop if we hit a comment
      if (ch === "/" && src[j + 1] === "/") break;
      j++;
    }
    if (j > i) {
      push(src.slice(i, j), "text-[var(--color-bone-muted)]");
      i = j;
      continue;
    }

    // Whitespace fallthrough
    push(c || "");
    i++;
  }

  return out;
}