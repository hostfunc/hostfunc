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
    <div className="space-y-2 rounded border border-border p-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">Live stream</span>
        <span className={connected ? "text-green-600" : "text-muted-foreground"}>
          {connected ? "connected" : "disconnected"}
        </span>
      </div>
      <div className="max-h-52 space-y-1 overflow-auto rounded bg-muted/20 p-2 font-mono text-xs">
        {lines.length === 0 ? (
          <div className="text-muted-foreground">Waiting for live log events...</div>
        ) : (
          lines.map((line, idx) => (
            <div key={`${line.ts}-${idx}`} className="space-y-0.5">
              <div className="flex gap-2">
              <span className="text-muted-foreground">{line.ts}</span>
              <span className="uppercase text-muted-foreground">{line.level}</span>
              <span>{line.message}</span>
              </div>
              {line.fields ? (
                <pre className="overflow-x-auto rounded bg-black/20 p-1 text-[10px] text-slate-300">
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
