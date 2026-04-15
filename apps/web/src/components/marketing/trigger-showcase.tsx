"use client";

import { AnimatePresence, motion } from "motion/react";
import { Calendar, Globe, Mail, MessageSquareCode } from "lucide-react";
import { useState } from "react";
import type { MarketingContent } from "@/lib/marketing-content";

interface Props {
  triggers: MarketingContent["triggers"];
}

const ICON_MAP = {
  http: Globe,
  cron: Calendar,
  email: Mail,
  mcp: MessageSquareCode,
} as const;

export function TriggerShowcase({ triggers }: Props) {
  const [active, setActive] = useState(triggers[0]?.id ?? "http");

  if (triggers.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      {/* Tabs */}
      <div className="flex flex-col gap-2">
        {triggers.map((t) => {
          const Icon = ICON_MAP[t.id];
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onMouseEnter={() => setActive(t.id)}
              onClick={() => setActive(t.id)}
              className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all ${
                isActive
                  ? "border-[var(--color-amber)]/50 bg-[var(--color-amber-soft)]"
                  : "border-[var(--color-border)] bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`grid size-9 place-items-center rounded-lg transition-all ${
                    isActive
                      ? "bg-[var(--color-amber)] text-[var(--color-ink)]"
                      : "bg-white/[0.04] text-[var(--color-bone-muted)]"
                  }`}
                >
                  <Icon className="size-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-[var(--color-bone)]">{t.title}</div>
                  <div className="text-xs text-[var(--color-bone-muted)]">
                    {t.tagline}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail */}
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]">
        <AnimatePresence mode="wait">
          {triggers
            .filter((t) => t.id === active)
            .map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="grid h-full min-h-[300px] gap-0 lg:grid-cols-2"
              >
                <div className="space-y-3 p-6 lg:p-8">
                  <h3 className="font-display text-3xl text-[var(--color-bone)]">
                    {t.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--color-bone-muted)]">
                    {t.body}
                  </p>
                </div>
                <div className="flex border-t border-[var(--color-border)] bg-[var(--color-ink)] p-5 lg:border-l lg:border-t-0">
                  <pre className="flex-1 overflow-auto font-mono text-[12px] leading-[1.7] text-[var(--color-bone)]">
                    <code>
                      {t.snippet.split("\n").map((line, lineIdx, allLines) => (
                        <span key={`${t.id}-line-${lineIdx}-${line}`} className="block">
                          {tokenizeLine(line, inferSnippetLanguage(t.snippet)).map((token, tokenIdx) => (
                            <span
                              key={`${t.id}-token-${lineIdx}-${tokenIdx}-${token.value}`}
                              style={getTokenStyle(token.className)}
                            >
                              {token.value}
                            </span>
                          ))}
                          {lineIdx < allLines.length - 1 ? "\n" : ""}
                        </span>
                      ))}
                    </code>
                  </pre>
                </div>
              </motion.div>
            ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function inferSnippetLanguage(code: string): "typescript" | "bash" | "json" {
  const trimmed = code.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return "json";
  }
  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith("curl ") ||
    trimmed.includes("hostfunc ") ||
    trimmed.includes("pnpm ")
  ) {
    return "bash";
  }
  return "typescript";
}

function tokenizeLine(
  line: string,
  language: "typescript" | "bash" | "json",
): Array<{ value: string; className?: string }> {
  const patterns: Record<typeof language, RegExp> = {
    typescript:
      /(\/\/.*$|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|`(?:\\.|[^`])*`|\b(?:import|export|default|async|await|function|return|const|let|var|if|else|try|catch|throw|new|class|interface|type|extends|implements|from|as|true|false|null|undefined)\b|\b(?:number|string|boolean|unknown|void|Record|Promise|Date)\b|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][A-Za-z0-9_$]*\s*(?=\())/g,
    bash: /(#.*$|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\$\{?[A-Za-z_][A-Za-z0-9_]*\}?|--?[A-Za-z0-9-]+|\b(?:npm|pnpm|npx|hostfunc|curl|node|export|cat|echo|cd|ls|pwd|git|docker)\b|\|\||&&|[|><])/g,
    json:
      /("(?:\\.|[^"])*"\s*:|"(?:\\.|[^"])*"|\b(?:true|false|null)\b|\b-?\d+(?:\.\d+)?\b|[{}\[\],:])/g,
  };

  const regex = patterns[language];
  const result: Array<{ value: string; className?: string }> = [];
  let lastIndex = 0;

  for (const match of line.matchAll(regex)) {
    const matched = match[0];
    const start = match.index ?? 0;
    if (start > lastIndex) {
      result.push({ value: line.slice(lastIndex, start) });
    }
    result.push({ value: matched, className: getTokenClass(language, matched) });
    lastIndex = start + matched.length;
  }

  if (lastIndex < line.length) {
    result.push({ value: line.slice(lastIndex) });
  }

  if (result.length === 0) {
    result.push({ value: line });
  }

  return result;
}

function getTokenClass(language: "typescript" | "bash" | "json", token: string): string {
  if (language === "typescript") {
    if (token.startsWith("//")) return "token comment";
    if (token.startsWith('"') || token.startsWith("'") || token.startsWith("`")) return "token string";
    if (/^[A-Za-z_$][A-Za-z0-9_$]*\s*(?=\()/.test(token)) return "token function";
    if (/^(number|string|boolean|unknown|void|Record|Promise|Date)$/.test(token)) return "token type";
    if (/^\d/.test(token)) return "token number";
    if (/^(true|false|null|undefined)$/.test(token)) return "token keyword";
    if (/^[@${}.:[\],()]+$/.test(token)) return "token punctuation";
    return "token keyword";
  }

  if (language === "bash") {
    if (token.startsWith("#")) return "token comment";
    if (token.startsWith('"') || token.startsWith("'")) return "token string";
    if (token.startsWith("$")) return "token variable";
    if (/^\|\||&&|[|><]$/.test(token)) return "token operator";
    if (token.startsWith("-")) return "token attr-name";
    return "token function";
  }

  if (token.endsWith(":")) return "token property";
  if (token.startsWith('"')) return "token string";
  if (/^(true|false|null)$/.test(token)) return "token keyword";
  if (/^-?\d/.test(token)) return "token number";
  return "token punctuation";
}

function getTokenStyle(className?: string): { color?: string } | undefined {
  if (!className) return undefined;
  if (className.includes("comment")) return { color: "var(--color-syntax-comment)" };
  if (className.includes("keyword")) return { color: "var(--color-syntax-keyword)" };
  if (className.includes("string")) return { color: "var(--color-syntax-string)" };
  if (className.includes("number")) return { color: "var(--color-syntax-number)" };
  if (className.includes("function")) return { color: "var(--color-syntax-function)" };
  if (className.includes("type")) return { color: "var(--color-syntax-type)" };
  if (className.includes("property")) return { color: "var(--color-syntax-property)" };
  if (className.includes("variable")) return { color: "var(--color-amber-hover)" };
  if (className.includes("attr-name")) return { color: "var(--color-cyan)" };
  if (className.includes("operator") || className.includes("punctuation")) {
    return { color: "var(--color-bone-faint)" };
  }
  return undefined;
}