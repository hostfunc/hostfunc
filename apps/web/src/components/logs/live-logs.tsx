"use client";

import {
  LEVEL_TEXT_CLASS,
  LevelChips,
  type LogLevel,
  normalizeLevel,
} from "@/components/logs/log-viewer";
import { Button } from "@/components/ui/button";
import { ArrowDown, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface StreamLine {
  ts: string;
  level: string;
  message: string;
  fields?: Record<string, unknown>;
}

const WINDOW_SIZE = 200;
const BOTTOM_THRESHOLD_PX = 40;

export function LiveLogs({ execId }: { execId: string }) {
  const [lines, setLines] = useState<StreamLine[]>([]);
  const [connectionState, setConnectionState] = useState<
    "connecting" | "connected" | "reconnecting" | "disconnected"
  >("connecting");
  const [snapshotCount, setSnapshotCount] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [bufferedCount, setBufferedCount] = useState(0);
  const [showJump, setShowJump] = useState(false);
  const [enabled, setEnabled] = useState<Record<LogLevel, boolean>>({
    debug: true,
    info: true,
    warn: true,
    error: true,
  });

  const pausedRef = useRef(false);
  const bufferRef = useRef<StreamLine[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const atBottomRef = useRef(true);

  useEffect(() => {
    setLines([]);
    setSnapshotCount(null);
    setConnectionState("connecting");
    bufferRef.current = [];
    setBufferedCount(0);
    const source = new EventSource(`/api/logs/${execId}`);
    source.onopen = () => setConnectionState("connected");
    source.onerror = () =>
      setConnectionState((current) => (current === "connected" ? "reconnecting" : "disconnected"));
    source.addEventListener("snapshot", (event) => {
      try {
        const parsed = JSON.parse((event as MessageEvent).data) as { count?: number };
        setSnapshotCount(typeof parsed.count === "number" ? parsed.count : 0);
      } catch {
        setSnapshotCount(0);
      }
    });
    source.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as StreamLine;
        if (pausedRef.current) {
          bufferRef.current = [...bufferRef.current.slice(-(WINDOW_SIZE - 1)), parsed];
          setBufferedCount(bufferRef.current.length);
          return;
        }
        setLines((prev) => [...prev.slice(-(WINDOW_SIZE - 1)), parsed]);
      } catch {
        // Ignore malformed events.
      }
    };
    return () => source.close();
  }, [execId]);

  // Auto-scroll only when the user is already at/near the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || lines.length === 0) return;
    if (atBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    } else {
      setShowJump(true);
    }
  }, [lines]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD_PX;
    atBottomRef.current = atBottom;
    if (atBottom) setShowJump(false);
  };

  const jumpToLatest = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    atBottomRef.current = true;
    setShowJump(false);
  };

  const togglePause = () => {
    if (pausedRef.current) {
      const buffered = bufferRef.current;
      bufferRef.current = [];
      setBufferedCount(0);
      if (buffered.length > 0) {
        setLines((prev) => [...prev, ...buffered].slice(-WINDOW_SIZE));
      }
      pausedRef.current = false;
      setPaused(false);
    } else {
      pausedRef.current = true;
      setPaused(true);
    }
  };

  const counts: Record<LogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0 };
  for (const line of lines) counts[normalizeLevel(line.level)] += 1;
  const visible = lines.filter((line) => enabled[normalizeLevel(line.level)]);

  return (
    <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/65 p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-[var(--color-bone)]">Live stream</span>
        <Button type="button" variant="glass" size="xs" onClick={togglePause}>
          {paused ? <Play /> : <Pause />}
          {paused
            ? bufferedCount > 0
              ? `Resume (+${bufferedCount} buffered)`
              : "Resume"
            : "Pause"}
        </Button>
        <span
          className={
            connectionState === "connected"
              ? "ml-auto text-emerald-400"
              : connectionState === "reconnecting"
                ? "ml-auto text-amber-300"
                : "ml-auto text-[var(--color-bone-faint)]"
          }
        >
          {connectionState}
        </span>
      </div>
      <LevelChips
        enabled={enabled}
        counts={counts}
        onToggle={(level) => setEnabled((prev) => ({ ...prev, [level]: !prev[level] }))}
      />
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="max-h-52 space-y-1 overflow-auto rounded border border-[var(--color-border)] bg-black/25 p-2 font-mono text-xs text-[var(--color-bone)]"
        >
          {lines.length === 0 ? (
            <div className="text-[var(--color-bone-faint)]">
              {snapshotCount === 0
                ? "No logs yet for this execution."
                : connectionState === "connected"
                  ? "Connected. Waiting for new live events..."
                  : "Waiting for live log events..."}
            </div>
          ) : visible.length === 0 ? (
            <div className="text-[var(--color-bone-faint)]">No lines match the level filter.</div>
          ) : (
            visible.map((line, idx) => (
              <div key={`${line.ts}-${idx}`} className="space-y-0.5">
                <div className="flex gap-2">
                  <span className="text-[var(--color-bone-faint)]">{line.ts}</span>
                  <span
                    className={`font-semibold uppercase ${LEVEL_TEXT_CLASS[normalizeLevel(line.level)]}`}
                  >
                    {line.level}
                  </span>
                  <span>{line.message}</span>
                </div>
                {line.fields ? (
                  <pre className="overflow-x-auto rounded border border-[var(--color-border)] bg-black/40 p-1 text-[10px] text-[var(--color-bone-muted)]">
                    {JSON.stringify(line.fields, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))
          )}
        </div>
        {showJump ? (
          <button
            type="button"
            onClick={jumpToLatest}
            className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/95 px-2.5 py-1 text-[10px] text-[var(--color-bone)] shadow-lg transition hover:border-[var(--color-amber)]/45"
          >
            <ArrowDown className="size-3" />
            Jump to latest
          </button>
        ) : null}
      </div>
    </div>
  );
}
