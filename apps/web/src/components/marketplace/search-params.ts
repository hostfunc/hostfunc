export const MARKETPLACE_CATEGORIES = [
  "utilities",
  "ai",
  "data",
  "integrations",
  "notifications",
  "webhooks",
  "automation",
] as const;

export const MARKETPLACE_SORTS = ["featured", "trending", "recent", "stars", "forks"] as const;

export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number];
export type MarketplaceSort = (typeof MARKETPLACE_SORTS)[number];
export type MarketplaceView = "grid" | "list";

export interface ParsedMarketplaceFilters {
  q?: string;
  category?: MarketplaceCategory;
  sort?: MarketplaceSort;
  view?: MarketplaceView;
}

function isCategory(value: string | undefined): value is MarketplaceCategory {
  return Boolean(value && MARKETPLACE_CATEGORIES.includes(value as MarketplaceCategory));
}

function isSort(value: string | undefined): value is MarketplaceSort {
  return Boolean(value && MARKETPLACE_SORTS.includes(value as MarketplaceSort));
}

function isView(value: string | undefined): value is MarketplaceView {
  return value === "grid" || value === "list";
}

export function parseMarketplaceFilters(params: URLSearchParams): ParsedMarketplaceFilters {
  const q = params.get("q")?.trim();
  const categoryRaw = params.get("category") ?? undefined;
  const sortRaw = params.get("sort") ?? undefined;
  const viewRaw = params.get("view") ?? undefined;

  const parsed: ParsedMarketplaceFilters = {};
  if (q) parsed.q = q;
  if (isCategory(categoryRaw)) parsed.category = categoryRaw;
  if (isSort(sortRaw) && sortRaw !== "featured") parsed.sort = sortRaw;
  if (isView(viewRaw) && viewRaw === "list") parsed.view = "list";
  return parsed;
}

export function serializeMarketplaceFilters(filters: ParsedMarketplaceFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.category) params.set("category", filters.category);
  if (filters.sort && filters.sort !== "featured") params.set("sort", filters.sort);
  if (filters.view === "list") params.set("view", "list");
  return params;
}

export function filterCount(filters: ParsedMarketplaceFilters): number {
  let count = 0;
  if (filters.q) count++;
  if (filters.category) count++;
  if (filters.sort && filters.sort !== "featured") count++;
  return count;
}
