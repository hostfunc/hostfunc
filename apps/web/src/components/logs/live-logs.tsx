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
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource(`/api/logs/${execId}`);
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
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
        <span className={connected ? "text-emerald-400" : "text-[var(--color-bone-faint)]"}>
          {connected ? "connected" : "disconnected"}
        </span>
      </div>
      <div className="max-h-52 space-y-1 overflow-auto rounded border border-[var(--color-border)] bg-black/25 p-2 font-mono text-xs text-[var(--color-bone)]">
        {lines.length === 0 ? (
          <div className="text-[var(--color-bone-faint)]">Waiting for live log events...</div>
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
