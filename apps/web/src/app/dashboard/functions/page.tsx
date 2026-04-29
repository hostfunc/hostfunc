import { Button } from "@/components/ui/button";
import { requireActiveOrg } from "@/lib/session";
import { searchFunctionsForOrgPaginated } from "@/server/functions";
import { Activity, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { FunctionsResultsClient } from "./functions-results-client";
import { FunctionsSearchBar } from "./functions-search-bar";
import { filterCount, parseFunctionFilters } from "./search-params";

export const dynamic = "force-dynamic";

export default async function FunctionsExplorerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgId } = await requireActiveOrg();
  const raw = await searchParams;

  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      for (const v of value) urlParams.append(key, v);
    } else if (typeof value === "string") {
      urlParams.set(key, value);
    }
  }
  const filters = parseFunctionFilters(urlParams);

  const initial = await searchFunctionsForOrgPaginated({
    orgId,
    limit: 10,
    ...(filters.q ? { query: filters.q } : {}),
    ...(filters.visibility ? { visibility: filters.visibility } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.lastRun ? { lastRun: filters.lastRun } : {}),
    ...(filters.github ? { github: filters.github } : {}),
    ...(filters.env ? { env: filters.env } : {}),
    ...(filters.trigger ? { triggers: filters.trigger } : {}),
    ...(filters.updatedWithin ? { updatedWithin: filters.updatedWithin } : {}),
    ...(filters.sort ? { sort: filters.sort } : {}),
  });

  const appliedCount = filterCount(filters);

  return (
    <div className="mx-auto max-w-6xl animate-in space-y-6 fade-in duration-500">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-4xl tracking-tight text-[var(--color-bone)]">
            Functions Explorer
          </h1>
          <p className="mt-1 text-sm text-[var(--color-bone-muted)]">
            Search with chips, typeahead, and property filters — plus sort, grid/list, and keyboard
            shortcuts.
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

      <FunctionsSearchBar initialFilters={filters} totalResults={initial.total} />

      {initial.items.length > 0 ? (
        <FunctionsResultsClient
          initialItems={initial.items}
          initialHasMore={initial.hasMore}
          initialNextCursor={initial.nextCursor}
          filters={filters}
        />
      ) : (
        <div className="mt-8 grid place-items-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-ink-elevated)]/60 py-24 text-center shadow-sm">
          <Activity className="mb-4 h-10 w-10 text-[var(--color-bone-faint)]/60" />
          <h2 className="text-xl font-semibold text-[var(--color-bone)]">No functions found</h2>
          <p className="mb-6 mt-2 max-w-sm text-sm text-[var(--color-bone-muted)]">
            {appliedCount > 0
              ? "No functions match the current filter set. Remove a chip, try a different value, or one of the suggestions below."
              : "You haven't deployed any functions to this workspace yet."}
          </p>
          {appliedCount > 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" asChild>
                <Link href="/dashboard/functions">Clear all filters</Link>
              </Button>
              <Button asChild variant="ghost" className="text-[var(--color-bone-muted)]">
                <Link href="/dashboard/functions?visibility=public">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Try: visibility public
                </Link>
              </Button>
              <Button asChild variant="ghost" className="text-[var(--color-bone-muted)]">
                <Link href="/dashboard/functions?lastRun=error">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Try: last run failed
                </Link>
              </Button>
              <Button asChild variant="ghost" className="text-[var(--color-bone-muted)]">
                <Link href="/dashboard/functions?github=linked">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Try: GitHub linked
                </Link>
              </Button>
            </div>
          ) : (
            <Button asChild>
              <Link href="/dashboard/new">
                <Plus className="mr-2 h-4 w-4" />
                Create your first function
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
