import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MARKETPLACE_CATEGORIES,
  type MarketplaceCategory,
  type MarketplaceSort,
} from "@/server/functions";
import { Search } from "lucide-react";
import Link from "next/link";

const MARKETPLACE_SORTS: MarketplaceSort[] = ["featured", "trending", "recent", "stars", "forks"];

function titleCase(value: string): string {
  return value
    .split("-")
    .map((segment) => segment.slice(0, 1).toUpperCase() + segment.slice(1))
    .join(" ");
}

function buildHref(
  basePath: string,
  params: { category?: MarketplaceCategory | null; sort?: MarketplaceSort | null; q?: string },
): string {
  const search = new URLSearchParams();
  if (params.category) search.set("category", params.category);
  if (params.sort) search.set("sort", params.sort);
  if (params.q) search.set("q", params.q);
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

interface MarketplaceFiltersProps {
  basePath: string;
  q: string;
  category?: MarketplaceCategory | undefined;
  sort: MarketplaceSort;
  /** Render the hero-style search form. Defaults to true. */
  showSearch?: boolean;
  /** Render the category pill row. Defaults to true. */
  showCategories?: boolean;
  /** Render the sort pill row. Defaults to true. */
  showSort?: boolean;
  /** Custom placeholder for the search input. */
  searchPlaceholder?: string;
  /** Variant controls vertical spacing/sizing. `hero` is the marketing hero; `compact` is the dashboard variant. */
  variant?: "hero" | "compact";
}

export function MarketplaceFilters({
  basePath,
  q,
  category,
  sort,
  showSearch = true,
  showCategories = true,
  showSort = false,
  searchPlaceholder = "Search by function, use case, or package",
  variant = "hero",
}: MarketplaceFiltersProps) {
  const isHero = variant === "hero";
  return (
    <div className={isHero ? "mx-auto max-w-2xl" : "w-full"}>
      {showSearch ? (
        <form
          action={basePath}
          className={
            isHero
              ? "flex flex-col gap-3 sm:flex-row"
              : "flex flex-col gap-2 sm:flex-row sm:items-center"
          }
        >
          <div className="relative flex-1">
            <Search className="-translate-y-1/2 absolute top-1/2 left-4 size-4 text-[var(--color-bone-faint)]" />
            <Input
              name="q"
              defaultValue={q}
              placeholder={searchPlaceholder}
              className={`${isHero ? "h-12" : "h-10"} rounded-full border-[var(--color-border)] bg-[var(--color-ink-elevated)]/80 pl-11 text-[var(--color-bone)] placeholder:text-[var(--color-bone-faint)]`}
            />
          </div>
          {category ? <input type="hidden" name="category" value={category} /> : null}
          {sort && sort !== "featured" ? <input type="hidden" name="sort" value={sort} /> : null}
          <Button
            type="submit"
            size={isHero ? "lg" : "default"}
            className={`${isHero ? "h-12 px-7 text-base" : "h-10 px-5 text-sm"} rounded-full bg-[var(--color-amber)] font-medium text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]`}
          >
            Search
          </Button>
        </form>
      ) : null}

      {showCategories ? (
        <div
          className={`flex flex-wrap items-center gap-2 ${isHero ? "mt-6 justify-center" : "mt-4"}`}
        >
          <Link
            href={buildHref(basePath, { sort: sort === "featured" ? null : sort, q })}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              !category
                ? "border-[var(--color-amber)]/45 bg-[var(--color-amber)]/10 text-[var(--color-amber)]"
                : "border-[var(--color-border)] bg-white/[0.03] text-[var(--color-bone-muted)] hover:text-[var(--color-bone)]"
            }`}
          >
            All
          </Link>
          {MARKETPLACE_CATEGORIES.map((item) => (
            <Link
              key={item}
              href={buildHref(basePath, {
                category: item,
                sort: sort === "featured" ? null : sort,
                q,
              })}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                category === item
                  ? "border-[var(--color-amber)]/45 bg-[var(--color-amber)]/10 text-[var(--color-amber)]"
                  : "border-[var(--color-border)] bg-white/[0.03] text-[var(--color-bone-muted)] hover:text-[var(--color-bone)]"
              }`}
            >
              {titleCase(item)}
            </Link>
          ))}
        </div>
      ) : null}

      {showSort ? (
        <div className={`flex flex-wrap gap-2 ${showCategories ? "mt-3" : "mt-4"}`}>
          {MARKETPLACE_SORTS.map((item) => (
            <Link
              key={item}
              href={buildHref(basePath, {
                category: category ?? null,
                sort: item === "featured" ? null : item,
                q,
              })}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                (sort ?? "featured") === item
                  ? "border-[var(--color-amber)]/45 bg-[var(--color-amber)]/10 text-[var(--color-amber)]"
                  : "border-[var(--color-border)] bg-white/[0.03] text-[var(--color-bone-muted)] hover:text-[var(--color-bone)]"
              }`}
            >
              {titleCase(item)}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
