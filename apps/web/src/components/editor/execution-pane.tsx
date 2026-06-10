"use client";

import { LiveLogs } from "@/components/logs/live-logs";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
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
  const [isCollapsed, setIsCollapsed] = useState(true);

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
    <div className={`${isCollapsed ? "shrink-0" : "h-72"} border-t border-border bg-ink font-mono`}>
      <div className="flex items-center justify-between border-b border-border bg-ink-elevated px-4 py-2">
        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground transition hover:text-bone"
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "Expand execution logs" : "Collapse execution logs"}
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
          />
          Execution Logs
        </button>
        {selected ? (
          <span className="text-[10px] text-bone-muted">
            {selected.status} · {selected.wallMs}ms · {selected.triggerKind}
          </span>
        ) : (
          <span className="text-[10px] text-bone-faint">No executions yet</span>
        )}
      </div>

      {!isCollapsed ? (
        <div className="grid h-[calc(100%-2.25rem)] grid-cols-3">
          <div className="col-span-1 overflow-y-auto border-r border-border">
            {items.slice(0, 30).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedExecutionId(item.id)}
                className={`w-full border-b border-border px-3 py-2 text-left text-[11px] hover:bg-white/5 ${
                  selected?.id === item.id ? "bg-amber-soft" : ""
                }`}
              >
                <div className="truncate text-bone">{item.id}</div>
                <div className="mt-1 text-bone-faint">
                  {new Date(item.startedAt).toLocaleTimeString()} · {item.status}
                </div>
              </button>
            ))}
          </div>
          <div className="col-span-2 p-2">
            {selected ? (
              <LiveLogs execId={selected.id} />
            ) : (
              <div className="p-3 text-xs text-muted-foreground">
                Run the function to start streaming logs.{" "}
                <Link
                  href="/docs/functions"
                  className="text-bone-muted underline underline-offset-2 hover:text-white"
                >
                  View run + chaining examples
                </Link>
                .
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
