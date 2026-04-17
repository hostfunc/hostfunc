import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireActiveOrg } from "@/lib/session";
import { searchFunctionsForOrg } from "@/server/functions";
import { formatDistanceToNow } from "date-fns";
import { Activity, CheckCircle2, ExternalLink, Package, Plus, Save, Settings } from "lucide-react";
import Link from "next/link";
import { CopyButton } from "./copy-button";
import { FunctionsSearchFilter } from "./search-filter";

export const dynamic = "force-dynamic";

export default async function FunctionsExplorerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; visibility?: string }>;
}) {
  const { orgId } = await requireActiveOrg();
  const params = await searchParams;

  const query = params.q;
  const visibility = params.visibility;

  const functions = await searchFunctionsForOrg(orgId, query, visibility);

  return (
    <div className="mx-auto max-w-6xl animate-in space-y-6 fade-in duration-500">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-4xl tracking-tight text-[var(--color-bone)]">
            Functions Explorer
          </h1>
          <p className="mt-1 text-sm text-[var(--color-bone-muted)]">
            Manage, filter, and discover your deployed serverless workloads.
          </p>
        </div>
        <Button
          asChild
          className="rounded-full bg-[var(--color-amber)] text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
        >
          <Link href="/dashboard/new">
            <Plus className="mr-2 h-4 w-4" />
            New Function
          </Link>
        </Button>
      </div>

      {/* Control Bar */}
      <FunctionsSearchFilter initialQuery={query} initialVisibility={visibility} />

      {/* Grid Results */}
      {functions.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {functions.map((fn) => (
            <div
              key={fn.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)] text-[var(--color-bone)] shadow-sm transition-all duration-300 hover:border-[var(--color-amber)]/40 hover:shadow-lg"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded border border-[var(--color-amber)]/30 bg-[var(--color-amber)]/10">
                      <Activity className="h-4 w-4 text-[var(--color-amber)]" />
                    </div>
                    <div>
                      <h3 className="font-mono text-sm font-semibold">{fn.slug}</h3>
                      <p className="text-[10px] text-[var(--color-bone-faint)]">
                        Deployed {formatDistanceToNow(fn.updatedAt, { addSuffix: true })}
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

              {/* Hover Actions Bar */}
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
                      <Settings className="h-3.5 w-3.5 mr-1.5" />
                      Settings
                    </Link>
                  </Button>
                  <Button size="sm" asChild className="h-8 shadow-sm">
                    <Link href={`/dashboard/${fn.id}`}>
                      Open
                      <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-8 grid place-items-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-ink-elevated)]/60 py-24 text-center shadow-sm">
          <Activity className="mb-4 h-10 w-10 text-[var(--color-bone-faint)]/60" />
          <h2 className="text-xl font-semibold text-[var(--color-bone)]">No functions found</h2>
          <p className="mb-6 mt-2 max-w-sm text-sm text-[var(--color-bone-muted)]">
            {query || visibility
              ? "We couldn't find any functions matching your current filters. Try adjusting your search query or visibility filter."
              : "You haven't deployed any functions to this workspace yet."}
          </p>
          {(query || visibility) && (
            <Button variant="outline" asChild>
              <Link href="/dashboard/functions">Clear all filters</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
