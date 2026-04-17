import { Button } from "@/components/ui/button";
import { requireActiveOrg } from "@/lib/session";
import { searchFunctionsForOrgPaginated } from "@/server/functions";
import { Activity, Plus } from "lucide-react";
import Link from "next/link";
import { FunctionsResultsClient } from "./functions-results-client";
import { FunctionsSearchFilter } from "./search-filter";

export const dynamic = "force-dynamic";

export default async function FunctionsExplorerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; visibility?: string; view?: string }>;
}) {
  const { orgId } = await requireActiveOrg();
  const params = await searchParams;

  const query = params.q;
  const visibility = params.visibility;
  const view: "grid" | "list" = params.view === "list" ? "list" : "grid";

  const initial = await searchFunctionsForOrgPaginated({
    orgId,
    limit: 10,
    ...(query ? { query } : {}),
    ...(visibility ? { visibility } : {}),
  });

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
      <FunctionsSearchFilter initialQuery={query} initialVisibility={visibility} initialView={view} />

      {/* Grid Results */}
      {initial.items.length > 0 ? (
        <FunctionsResultsClient
          initialItems={initial.items}
          initialHasMore={initial.hasMore}
          initialNextCursor={initial.nextCursor}
          view={view}
          {...(query ? { query } : {})}
          {...(visibility ? { visibility } : {})}
        />
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
