"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type JsonTokenKind,
  formatLogsAsText,
  matchesLogFilter,
  tokenizeJson,
} from "@/lib/log-format";
import { cn } from "@/lib/utils";
import { Check, Copy, FileDown, FileJson, Search } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

export type LogLevel = "debug" | "info" | "warn" | "error";

export const LOG_LEVELS: readonly LogLevel[] = ["debug", "info", "warn", "error"];

/** Level tag colors shared with the live tail: debug slate, info sky, warn amber, error red. */
export const LEVEL_TEXT_CLASS: Record<LogLevel, string> = {
  debug: "text-slate-400",
  info: "text-sky-300",
  warn: "text-amber-300",
  error: "text-red-400",
};

export const LEVEL_CHIP_ACTIVE_CLASS: Record<LogLevel, string> = {
  debug: "border-slate-400/40 bg-slate-500/15 text-slate-300",
  info: "border-sky-400/40 bg-sky-500/10 text-sky-300",
  warn: "border-amber-400/40 bg-amber-500/10 text-amber-300",
  error: "border-red-500/40 bg-red-500/10 text-red-400",
};

export function normalizeLevel(level: string): LogLevel {
  return level === "debug" || level === "warn" || level === "error" ? level : "info";
}

const TOKEN_CLASS: Record<JsonTokenKind, string> = {
  key: "text-sky-300",
  string: "text-emerald-300",
  number: "text-amber-300",
  boolean: "text-violet-300",
  null: "text-slate-400",
  punct: "text-[var(--color-bone-faint)]",
};

export interface LogViewerLine {
  ts: string;
  level: LogLevel;
  message: string;
  fields?: Record<string, unknown> | null;
}

export function LevelChips({
  enabled,
  counts,
  onToggle,
}: {
  enabled: Record<LogLevel, boolean>;
  counts: Record<LogLevel, number>;
  onToggle: (level: LogLevel) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {LOG_LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          aria-pressed={enabled[level]}
          onClick={() => onToggle(level)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide transition",
            enabled[level]
              ? LEVEL_CHIP_ACTIVE_CLASS[level]
              : "border-[var(--color-border)] bg-transparent text-[var(--color-bone-faint)] opacity-60 hover:opacity-100",
          )}
        >
          {level}
          <span className="tabular-nums opacity-70">{counts[level]}</span>
        </button>
      ))}
    </div>
  );
}

function JsonFields({ value }: { value: Record<string, unknown> }) {
  const tokens = useMemo(() => tokenizeJson(value), [value]);
  return (
    <pre className="overflow-x-auto rounded border border-[var(--color-border)] bg-black/35 p-2 text-[10px] leading-relaxed">
      {tokens.map((token, idx) => (
        <span key={`${idx}-${token.kind}`} className={TOKEN_CLASS[token.kind]}>
          {token.text}
        </span>
      ))}
    </pre>
  );
}

function highlightMatch(message: string, query: string): ReactNode {
  const needle = query.trim().toLowerCase();
  if (!needle) return message;
  const lower = message.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let at = lower.indexOf(needle);
  while (at !== -1) {
    if (at > cursor) parts.push(message.slice(cursor, at));
    parts.push(
      <mark key={at} className="rounded-sm bg-amber-400/30 px-0.5 text-amber-100">
        {message.slice(at, at + needle.length)}
      </mark>,
    );
    cursor = at + needle.length;
    at = lower.indexOf(needle, cursor);
  }
  if (cursor < message.length) parts.push(message.slice(cursor));
  return parts;
}

function downloadBlob(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function LogViewer({
  logs,
  executionId,
}: {
  logs: LogViewerLine[];
  executionId: string;
}) {
  const [enabled, setEnabled] = useState<Record<LogLevel, boolean>>({
    debug: true,
    info: true,
    warn: true,
    error: true,
  });
  const [query, setQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const counts = useMemo(() => {
    const next: Record<LogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0 };
    for (const line of logs) next[line.level] += 1;
    return next;
  }, [logs]);

  const activeLevels = LOG_LEVELS.filter((level) => enabled[level]);
  const filtered = logs.filter((line) => matchesLogFilter(line, { levels: activeLevels, query }));

  const shortId = executionId.slice(0, 8);

  const copyText = (key: string, text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1500);
    });
  };

  if (logs.length === 0) {
    return (
      <div className="grid place-items-center rounded border border-dashed border-[var(--color-border)] bg-black/20 py-8 text-center text-sm text-[var(--color-bone-faint)]">
        No logs were recorded for this execution.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <LevelChips
          enabled={enabled}
          counts={counts}
          onToggle={(level) => setEnabled((prev) => ({ ...prev, [level]: !prev[level] }))}
        />
        <div className="relative min-w-40 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-[var(--color-bone-faint)]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search logs..."
            className="h-7 pl-7 font-mono text-xs"
          />
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="glass"
            size="xs"
            onClick={() => copyText("all", formatLogsAsText(logs))}
          >
            {copiedKey === "all" ? <Check className="text-emerald-400" /> : <Copy />}
            Copy all
          </Button>
          <Button
            type="button"
            variant="glass"
            size="xs"
            onClick={() =>
              downloadBlob(`execution-${shortId}.txt`, formatLogsAsText(logs), "text/plain")
            }
          >
            <FileDown />
            .txt
          </Button>
          <Button
            type="button"
            variant="glass"
            size="xs"
            onClick={() =>
              downloadBlob(
                `execution-${shortId}.json`,
                JSON.stringify(logs, null, 2),
                "application/json",
              )
            }
          >
            <FileJson />
            .json
          </Button>
        </div>
      </div>

      <div className="max-h-96 space-y-1 overflow-auto rounded border border-[var(--color-border)] bg-black/20 p-2 font-mono text-xs text-[var(--color-bone)]">
        {filtered.length === 0 ? (
          <div className="py-6 text-center text-[var(--color-bone-faint)]">
            No lines match your filter.
          </div>
        ) : (
          filtered.map((line, idx) => {
            const lineKey = `${line.ts}-${idx}`;
            return (
              <div
                key={lineKey}
                className="group space-y-1 rounded px-1 py-0.5 hover:bg-white/[0.03]"
              >
                <div className="flex items-start gap-2">
                  <span className="shrink-0 text-[10px] text-[var(--color-bone-faint)]">
                    {line.ts}
                  </span>
                  <span
                    className={cn(
                      "w-11 shrink-0 text-[10px] font-semibold uppercase",
                      LEVEL_TEXT_CLASS[line.level],
                    )}
                  >
                    {line.level}
                  </span>
                  <span className="min-w-0 flex-1 break-words whitespace-pre-wrap">
                    {highlightMatch(line.message, query)}
                  </span>
                  <button
                    type="button"
                    aria-label="Copy log line"
                    onClick={() => copyText(lineKey, formatLogsAsText([line]))}
                    className="shrink-0 rounded p-0.5 text-[var(--color-bone-faint)] opacity-0 transition group-hover:opacity-100 hover:text-[var(--color-bone)] focus-visible:opacity-100"
                  >
                    {copiedKey === lineKey ? (
                      <Check className="size-3 text-emerald-400" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                </div>
                {line.fields ? (
                  <details className="pl-4">
                    <summary className="cursor-pointer select-none text-[10px] text-[var(--color-bone-faint)] hover:text-[var(--color-bone)]">
                      fields ({Object.keys(line.fields).length})
                    </summary>
                    <JsonFields value={line.fields} />
                  </details>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
