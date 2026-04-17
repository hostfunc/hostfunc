"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FunctionExplorerItem } from "@/server/functions";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Package,
  Save,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CopyButton } from "./copy-button";

interface FunctionsResultsClientProps {
  initialItems: FunctionExplorerItem[];
  initialHasMore: boolean;
  initialNextCursor: string | null;
  query?: string;
  visibility?: string;
  view: "grid" | "list";
}

const PAGE_SIZE = 10;

export function FunctionsResultsClient({
  initialItems,
  initialHasMore,
  initialNextCursor,
  query,
  visibility,
  view,
}: FunctionsResultsClientProps) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const resetKey = useMemo(() => JSON.stringify({ query, visibility, view }), [query, visibility, view]);

  useEffect(() => {
    void resetKey;
    setItems(initialItems);
    setHasMore(initialHasMore);
    setNextCursor(initialNextCursor);
    setIsLoading(false);
    setError(null);
  }, [resetKey, initialItems, initialHasMore, initialNextCursor]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (visibility) params.set("visibility", visibility);
      params.set("limit", String(PAGE_SIZE));
      params.set("cursor", nextCursor);
      const res = await fetch(`/api/functions?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`load_failed_${res.status}`);
      }
      const data = (await res.json()) as {
        items: FunctionExplorerItem[];
        hasMore: boolean;
        nextCursor: string | null;
      };
      setItems((prev) => [...prev, ...data.items]);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load more functions.");
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, isLoading, nextCursor, query, visibility]);

  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            void loadMore();
          }
        }
      },
      { rootMargin: "400px 0px 400px 0px", threshold: 0.01 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div className="space-y-4">
      {view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((fn) => (
            <div
              key={fn.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)] text-[var(--color-bone)] shadow-sm transition-all duration-300 hover:border-[var(--color-amber)]/40 hover:shadow-lg"
            >
              <div className="p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded border border-[var(--color-amber)]/30 bg-[var(--color-amber)]/10">
                      <Activity className="h-4 w-4 text-[var(--color-amber)]" />
                    </div>
                    <div>
                      <h3 className="font-mono text-sm font-semibold">{fn.slug}</h3>
                      <p className="text-[10px] text-[var(--color-bone-faint)]">
                        Deployed {formatDistanceToNow(new Date(fn.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={fn.visibility === "public" ? "default" : "secondary"}
                    className="capitalize shadow-sm"
                  >
                    {fn.visibility}
                  </Badge>
                </div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="border-[var(--color-border)] bg-white/[0.04] text-[10px] font-medium text-[var(--color-bone)]"
                  >
                    {fn.currentVersionId ? "Deployed" : "Saved"}
                  </Badge>
                  {fn.envVarCount > 0 ? (
                    <Badge
                      variant="secondary"
                      className="border-emerald-400/30 bg-emerald-500/10 text-[10px] font-medium text-emerald-300"
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Env set ({fn.envVarCount})
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="border-[var(--color-border)] bg-white/[0.02] text-[10px] font-medium text-[var(--color-bone-faint)]"
                    >
                      <Save className="mr-1 h-3 w-3" />
                      No env vars
                    </Badge>
                  )}
                  <Badge
                    variant="secondary"
                    className="border-[var(--color-border)] bg-white/[0.02] text-[10px] font-medium text-[var(--color-bone-faint)]"
                  >
                    <Package className="mr-1 h-3 w-3" />
                    npm ({fn.packageCount})
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="border-[var(--color-border)] bg-white/[0.02] text-[10px] font-medium text-[var(--color-bone-faint)]"
                  >
                    <Activity className="mr-1 h-3 w-3" />
                    exec ({fn.executionCount})
                  </Badge>
                  {fn.latestExecutionStatus ? (
                    <Badge
                      variant="secondary"
                      className={
                        fn.latestExecutionStatus === "ok"
                          ? "border-emerald-400/30 bg-emerald-500/10 text-[10px] font-medium text-emerald-300"
                          : "border-red-400/30 bg-red-500/10 text-[10px] font-medium text-red-300"
                      }
                    >
                      Last {fn.latestExecutionStatus === "ok" ? "200" : "500"}
                    </Badge>
                  ) : null}
                </div>
                <p className="h-10 line-clamp-2 text-sm text-[var(--color-bone-muted)]">
                  {fn.description?.trim() || "No description provided."}
                </p>
                {fn.deployedUrl ? (
                  <p
                    className="mt-2 truncate font-mono text-[10px] text-[var(--color-bone-faint)]"
                    title={fn.deployedUrl}
                  >
                    {fn.deployedUrl}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-white/[0.02] p-3 transition-colors group-hover:bg-white/[0.05]">
                <div className="flex items-center gap-2">
                  <CopyButton
                    value={fn.deployedUrl ?? ""}
                    disabled={!fn.deployedUrl}
                    title={fn.deployedUrl ? "Copy deployed endpoint" : "Host the function first"}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-8 border-[var(--color-border)] bg-transparent shadow-sm"
                  >
                    <Link href={`/dashboard/${fn.id}/settings`}>
                      <Settings className="mr-1.5 h-3.5 w-3.5" />
                      Settings
                    </Link>
                  </Button>
                  <Button size="sm" asChild className="h-8 shadow-sm">
                    <Link href={`/dashboard/${fn.id}`}>
                      Open
                      <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((fn) => (
            <div
              key={fn.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/90 p-4 text-[var(--color-bone)] shadow-sm transition-all duration-300 hover:border-[var(--color-amber)]/40 hover:shadow-lg"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded border border-[var(--color-amber)]/30 bg-[var(--color-amber)]/10">
                        <Activity className="h-3.5 w-3.5 text-[var(--color-amber)]" />
                      </div>
                      <h3 className="font-mono text-sm font-semibold">{fn.slug}</h3>
                    </div>
                    <Badge
                      variant={fn.visibility === "public" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {fn.visibility}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="border-[var(--color-border)] bg-white/[0.04] text-[10px] font-medium text-[var(--color-bone)]"
                    >
                      {fn.currentVersionId ? "Deployed" : "Saved"}
                    </Badge>
                    {fn.envVarCount > 0 ? (
                      <Badge
                        variant="secondary"
                        className="border-emerald-400/30 bg-emerald-500/10 text-[10px] font-medium text-emerald-300"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Env set ({fn.envVarCount})
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="border-[var(--color-border)] bg-white/[0.02] text-[10px] font-medium text-[var(--color-bone-faint)]"
                      >
                        <Save className="mr-1 h-3 w-3" />
                        No env vars
                      </Badge>
                    )}
                    <Badge
                      variant="secondary"
                      className="border-[var(--color-border)] bg-white/[0.02] text-[10px] font-medium text-[var(--color-bone-faint)]"
                    >
                      <Package className="mr-1 h-3 w-3" />
                      npm ({fn.packageCount})
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="border-[var(--color-border)] bg-white/[0.02] text-[10px] font-medium text-[var(--color-bone-faint)]"
                    >
                      <Activity className="mr-1 h-3 w-3" />
                      exec ({fn.executionCount})
                    </Badge>
                    {fn.latestExecutionStatus ? (
                      <Badge
                        variant="secondary"
                        className={
                          fn.latestExecutionStatus === "ok"
                            ? "border-emerald-400/30 bg-emerald-500/10 text-[10px] font-medium text-emerald-300"
                            : "border-red-400/30 bg-red-500/10 text-[10px] font-medium text-red-300"
                        }
                      >
                        Last {fn.latestExecutionStatus === "ok" ? "200" : "500"}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-[var(--color-bone-faint)]">
                    Deployed {formatDistanceToNow(new Date(fn.updatedAt), { addSuffix: true })}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--color-bone-muted)]">
                    {fn.description?.trim() || "No description provided."}
                  </p>
                  {fn.deployedUrl ? (
                    <p
                      className="mt-2 truncate font-mono text-[10px] text-[var(--color-bone-faint)]"
                      title={fn.deployedUrl}
                    >
                      {fn.deployedUrl}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <CopyButton
                    value={fn.deployedUrl ?? ""}
                    disabled={!fn.deployedUrl}
                    title={fn.deployedUrl ? "Copy deployed endpoint" : "Host the function first"}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-8 border-[var(--color-border)] bg-transparent shadow-sm"
                  >
                    <Link href={`/dashboard/${fn.id}/settings`}>
                      <Settings className="mr-1.5 h-3.5 w-3.5" />
                      Settings
                    </Link>
                  </Button>
                  <Button size="sm" asChild className="h-8 shadow-sm">
                    <Link href={`/dashboard/${fn.id}`}>
                      Open
                      <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-1 w-full" />

      <div className="flex flex-col items-center gap-3 pb-2">
        {isLoading ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-black/20 px-3 py-1.5 text-xs text-[var(--color-bone-faint)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading more functions...
          </div>
        ) : null}

        {error ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-red-300">Failed to load more functions: {error}</p>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone)]"
              onClick={() => void loadMore()}
              disabled={!hasMore}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {hasMore ? (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone)]",
              isLoading ? "opacity-60" : "",
            )}
            onClick={() => void loadMore()}
            disabled={isLoading}
          >
            Load more
          </Button>
        ) : (
          <p className="text-xs text-[var(--color-bone-faint)]">
            You have reached the end ({items.length} loaded).
          </p>
        )}
      </div>
    </div>
  );
}
