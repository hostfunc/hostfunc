"use client";

import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

interface ExecutionItem {
  id: string;
  status: string;
  triggerKind: string;
  wallMs: number;
  startedAt: string;
}

export function LoadMoreButton({
  fnId,
  initialCursor,
}: {
  fnId: string;
  initialCursor: string | null;
}) {
  const searchParams = useSearchParams();
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [rows, setRows] = useState<ExecutionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const canLoad = Boolean(cursor);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    const params = new URLSearchParams(searchParams);
    params.set("fnId", fnId);
    params.set("cursor", cursor);
    const res = await fetch(`/api/executions?${params.toString()}`);
    if (res.ok) {
      const json = (await res.json()) as { items: ExecutionItem[]; nextCursor: string | null };
      setRows((prev) => [...prev, ...json.items]);
      setCursor(json.nextCursor);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      {rows.length > 0 ? (
        <div className="rounded-lg border border-border">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between border-t px-4 py-3 text-sm first:border-t-0">
              <div className="font-mono text-xs text-muted-foreground">{row.triggerKind}</div>
              <div>{row.status}</div>
              <div className="tabular-nums">{row.wallMs}ms</div>
              <div className="text-xs text-muted-foreground">{new Date(row.startedAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex justify-center">
        <Button variant="outline" size="sm" disabled={!canLoad || loading} onClick={loadMore}>
          {loading ? "Loading..." : canLoad ? "Load more" : "No more executions"}
        </Button>
      </div>
    </div>
  );
}
