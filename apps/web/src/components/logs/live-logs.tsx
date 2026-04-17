"use client";

import { useEffect, useState } from "react";

interface StreamLine {
  ts: string;
  level: string;
  message: string;
  fields?: Record<string, unknown>;
}

export function LiveLogs({ execId }: { execId: string }) {
  const [lines, setLines] = useState<StreamLine[]>([]);
  const [connectionState, setConnectionState] = useState<
    "connecting" | "connected" | "reconnecting" | "disconnected"
  >("connecting");
  const [snapshotCount, setSnapshotCount] = useState<number | null>(null);

  useEffect(() => {
    setLines([]);
    setSnapshotCount(null);
    setConnectionState("connecting");
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
        setLines((prev) => [...prev.slice(-199), parsed]);
      } catch {
        // Ignore malformed events.
      }
    };
    return () => source.close();
  }, [execId]);

  return (
    <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/65 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-[var(--color-bone)]">Live stream</span>
        <span
          className={
            connectionState === "connected"
              ? "text-emerald-400"
              : connectionState === "reconnecting"
                ? "text-amber-300"
                : "text-[var(--color-bone-faint)]"
          }
        >
          {connectionState}
        </span>
      </div>
      <div className="max-h-52 space-y-1 overflow-auto rounded border border-[var(--color-border)] bg-black/25 p-2 font-mono text-xs text-[var(--color-bone)]">
        {lines.length === 0 ? (
          <div className="text-[var(--color-bone-faint)]">
            {snapshotCount === 0
              ? "No logs yet for this execution."
              : connectionState === "connected"
                ? "Connected. Waiting for new live events..."
                : "Waiting for live log events..."}
          </div>
        ) : (
          lines.map((line, idx) => (
            <div key={`${line.ts}-${idx}`} className="space-y-0.5">
              <div className="flex gap-2">
                <span className="text-[var(--color-bone-faint)]">{line.ts}</span>
                <span className="uppercase text-[var(--color-bone-faint)]">{line.level}</span>
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
    </div>
  );
}
