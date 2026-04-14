"use client";

import { LiveLogs } from "@/components/logs/live-logs";
import { useEffect, useMemo, useState } from "react";

interface ExecutionItem {
  id: string;
  status: "ok" | "fn_error" | "limit_exceeded" | "infra_error";
  triggerKind: string;
  wallMs: number;
  startedAt: string;
}

export function EditorExecutionPane({ fnId }: { fnId: string }) {
  const [items, setItems] = useState<ExecutionItem[]>([]);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/executions?fnId=${encodeURIComponent(fnId)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const payload = (await res.json()) as { items?: ExecutionItem[] };
        if (cancelled || !payload.items) return;
        setItems(payload.items);
        if (!selectedExecutionId && payload.items[0]?.id) {
          setSelectedExecutionId(payload.items[0].id);
        }
      } catch {
        // ignore transient polling errors
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 10_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [fnId, selectedExecutionId]);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedExecutionId) ?? items[0] ?? null,
    [items, selectedExecutionId],
  );

  return (
    <div className="h-72 shrink-0 border-t border-black/50 bg-[#0a0a0a] font-mono">
      <div className="flex items-center justify-between border-b border-white/5 bg-[#111111] px-4 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Execution Logs
        </span>
        {selected ? (
          <span className="text-[10px] text-slate-400">
            {selected.status} · {selected.wallMs}ms · {selected.triggerKind}
          </span>
        ) : (
          <span className="text-[10px] text-slate-500">No executions yet</span>
        )}
      </div>

      <div className="grid h-[calc(100%-2.25rem)] grid-cols-3">
        <div className="col-span-1 overflow-y-auto border-r border-white/5">
          {items.slice(0, 30).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedExecutionId(item.id)}
              className={`w-full border-b border-white/5 px-3 py-2 text-left text-[11px] hover:bg-white/5 ${
                selected?.id === item.id ? "bg-white/10" : ""
              }`}
            >
              <div className="truncate text-slate-200">{item.id}</div>
              <div className="mt-1 text-slate-500">
                {new Date(item.startedAt).toLocaleTimeString()} · {item.status}
              </div>
            </button>
          ))}
        </div>
        <div className="col-span-2 p-2">
          {selected ? (
            <LiveLogs execId={selected.id} />
          ) : (
            <div className="p-3 text-xs text-muted-foreground">Run the function to start streaming logs.</div>
          )}
        </div>
      </div>
    </div>
  );
}
