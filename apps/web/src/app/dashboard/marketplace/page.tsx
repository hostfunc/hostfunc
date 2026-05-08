import { CommunityFunctionCard } from "@/components/marketplace/community-function-card";
import { MarketplaceFilters } from "@/components/marketplace/marketplace-filters";
import type { MarketplaceView } from "@/components/marketplace/search-params";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";
import {
  MARKETPLACE_CATEGORIES,
  type MarketplaceSort,
  searchMarketplaceFunctions,
} from "@/server/functions";
import { Boxes, Plus, Sparkles } from "lucide-react";
import Link from "next/link";

const MARKETPLACE_SORTS: MarketplaceSort[] = ["featured", "trending", "recent", "stars", "forks"];

const BASE_PATH = "/dashboard/marketplace";

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export const dynamic = "force-dynamic";

export default async function DashboardMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const category = oneOf(
    typeof params.category === "string" ? params.category : undefined,
    MARKETPLACE_CATEGORIES,
  );
  const sort =
    oneOf(typeof params.sort === "string" ? params.sort : undefined, MARKETPLACE_SORTS) ??
    "featured";
  const rawView = Array.isArray(params.view) ? params.view : [params.view];
  const view: MarketplaceView = rawView.some((value) => value === "list") ? "list" : "grid";

  const marketplace = await searchMarketplaceFunctions({
    ...(q ? { query: q } : {}),
    ...(category ? { category } : {}),
    sort,
    limit: 24,
    userId: session.user.id,
  });

  return (
    <div className="mx-auto max-w-7xl animate-in space-y-8 fade-in duration-500">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[var(--color-amber)]">
            <Sparkles className="size-3.5" />
            Marketplace
          </div>
          <h1 className="mt-2 font-display text-4xl tracking-tight text-[var(--color-bone)]">
            Discover and fork public functions
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-bone-muted)]">
            Browse public TypeScript functions from the community. Star what you love, leave a
            comment, or fork any function into your active workspace.
          </p>
        </div>
        <Button
          asChild
          variant="glass"
          className="rounded-full"
        >
          <Link href="/dashboard/new">
            <Plus className="mr-2 h-4 w-4" />
            Publish a function
          </Link>
        </Button>
      </div>

      <MarketplaceFilters
        basePath={BASE_PATH}
        q={q}
        category={category}
        sort={sort}
        view={view}
        showSearch
        showCategories
        variant="compact"
      />

      <section className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[var(--color-amber)]">
              <Boxes className="size-3.5" />
              Community Functions
            </div>
            <h2 className="mt-2 font-display text-3xl tracking-tight text-[var(--color-bone)]">
              {marketplace.total > 0
                ? `${marketplace.total} ${marketplace.total === 1 ? "function" : "functions"} ready to fork`
                : "Public functions ready to fork"}
            </h2>
          </div>
          <MarketplaceFilters
            basePath={BASE_PATH}
            q={q}
            category={category}
            sort={sort}
            view={view}
            showSearch={false}
            showCategories={false}
            showSort
            variant="compact"
          />
        </div>

        {marketplace.items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-ink-elevated)]/45 p-12 text-center">
            <p className="font-display text-2xl text-[var(--color-bone)]">
              {q || category
                ? "No public functions match those filters."
                : "No public functions yet."}
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--color-bone-muted)]">
              {q || category
                ? "Try clearing the filters or searching for something else."
                : "Public functions will appear here as the community publishes them. Be the first to publish a function from your workspace."}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {q || category ? (
                <Button asChild variant="outline">
                  <Link href={BASE_PATH}>Clear filters</Link>
                </Button>
              ) : null}
              <Button
                asChild
                variant="glass"
                className="rounded-full"
              >
                <Link href="/dashboard/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create new function
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className={view === "list" ? "space-y-4" : "grid gap-6 md:grid-cols-2 xl:grid-cols-3"}>
            {marketplace.items.map((fn) => (
              <CommunityFunctionCard
                key={fn.id}
                fn={fn}
                basePath={BASE_PATH}
                signedIn
                view={view}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
