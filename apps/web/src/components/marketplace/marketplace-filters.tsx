"use client";

import { cn } from "@/lib/utils";
import {
  Boxes,
  CalendarClock,
  Check,
  ChevronDown,
  CornerDownLeft,
  Grid3X3,
  History,
  List,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_SORTS,
  type MarketplaceCategory,
  type MarketplaceSort,
  type MarketplaceView,
  type ParsedMarketplaceFilters,
  filterCount,
  parseMarketplaceFilters,
  serializeMarketplaceFilters,
} from "./search-params";

interface MarketplaceFiltersProps {
  basePath: string;
  q: string;
  category?: MarketplaceCategory | undefined;
  sort: MarketplaceSort;
  view?: MarketplaceView;
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

interface RecentEntry {
  id: string;
  label: string;
  params: string;
}

type DropdownItem = {
  id: string;
  section: "action" | "suggestion" | "category" | "sort" | "recent";
  onSelect: () => void;
  render: () => React.ReactNode;
};

interface MarketplaceSuggestion {
  id: string;
  slug: string;
  description: string;
}

const RECENTS_KEY = "hf:marketplace:recents";
const RECENTS_MAX = 6;

function loadRecents(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => x && typeof x.params === "string").slice(0, RECENTS_MAX);
  } catch {
    return [];
  }
}

function saveRecents(entries: RecentEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(entries.slice(0, RECENTS_MAX)));
  } catch {
    // ignore storage quota errors
  }
}

function titleCase(value: string): string {
  return value
    .split("-")
    .map((segment) => segment.slice(0, 1).toUpperCase() + segment.slice(1))
    .join(" ");
}

function humanFilterLabel(filters: ParsedMarketplaceFilters): string {
  const parts: string[] = [];
  if (filters.q) parts.push(`"${filters.q}"`);
  if (filters.category) parts.push(`category: ${filters.category}`);
  if (filters.sort && filters.sort !== "featured") parts.push(`sort: ${filters.sort}`);
  return parts.join(" · ") || "All marketplace functions";
}

function omitKey<T extends object, K extends keyof T>(obj: T, key: K): T {
  const { [key]: _removed, ...rest } = obj;
  void _removed;
  return rest as T;
}

export function MarketplaceFilters({
  basePath,
  q,
  category,
  sort,
  view,
  showSearch = true,
  showCategories = true,
  showSort = false,
  searchPlaceholder = "Search by function, use case, or package",
  variant = "hero",
}: MarketplaceFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recents, setRecents] = useState<RecentEntry[]>([]);
  const [text, setText] = useState(q);
  const [suggestions, setSuggestions] = useState<MarketplaceSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isHero = variant === "hero";
  const initialFilters = useMemo<ParsedMarketplaceFilters>(
    () => ({
      ...(q ? { q } : {}),
      ...(category ? { category } : {}),
      ...(sort && sort !== "featured" ? { sort } : {}),
      ...(view === "list" ? { view: "list" as const } : {}),
    }),
    [q, category, sort, view],
  );
  const [filters, setFilters] = useState<ParsedMarketplaceFilters>(initialFilters);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  useEffect(() => {
    setFilters(initialFilters);
    setText(initialFilters.q ?? "");
  }, [initialFilters]);

  useEffect(() => {
    setRecents(loadRecents());
  }, []);

  const applyFilters = useCallback(
    (next: ParsedMarketplaceFilters) => {
      setFilters(next);
      const params = serializeMarketplaceFilters(next);
      const current = new URLSearchParams(searchParams.toString());
      current.forEach((value, key) => {
        if (!["q", "category", "sort", "view"].includes(key)) params.append(key, value);
      });
      const nextQuery = params.toString();
      startTransition(() => {
        router.push(nextQuery ? `${basePath}?${nextQuery}` : basePath);
      });
    },
    [basePath, router, searchParams],
  );

  useEffect(() => {
    const trimmed = text.trim();
    const current = filtersRef.current.q ?? "";
    if (trimmed === current) return;
    const timer = setTimeout(() => {
      const next: ParsedMarketplaceFilters = { ...filtersRef.current };
      applyFilters(trimmed ? { ...next, q: trimmed } : omitKey(next, "q"));
    }, 250);
    return () => clearTimeout(timer);
  }, [text, applyFilters]);

  useEffect(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      setSuggestions([]);
      setSuggestLoading(false);
      return;
    }
    let cancelled = false;
    setSuggestLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/marketplace/suggest?q=${encodeURIComponent(trimmed)}&limit=5`,
          { credentials: "include" },
        );
        if (!response.ok) throw new Error(`marketplace_suggest_failed_${response.status}`);
        const data = (await response.json()) as { items: MarketplaceSuggestion[] };
        if (!cancelled) setSuggestions(data.items);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSuggestLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!shellRef.current) return;
      if (!shellRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  useEffect(() => {
    function handler(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTypable =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      } else if (event.key === "/" && !isTypable) {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const commitRecent = useCallback(() => {
    if (filterCount(filtersRef.current) === 0) return;
    const params = serializeMarketplaceFilters(filtersRef.current);
    params.sort();
    const sig = params.toString();
    if (!sig) return;
    const next: RecentEntry[] = [
      { id: sig, label: humanFilterLabel(filtersRef.current), params: sig },
      ...loadRecents().filter((entry) => entry.params !== sig),
    ].slice(0, RECENTS_MAX);
    saveRecents(next);
    setRecents(next);
  }, []);

  const clearAll = useCallback(() => {
    setText("");
    applyFilters({});
  }, [applyFilters]);

  const setView = useCallback(
    (nextView: MarketplaceView) => {
      const next: ParsedMarketplaceFilters =
        nextView === "grid"
          ? omitKey({ ...filtersRef.current }, "view")
          : { ...filtersRef.current, view: "list" };
      applyFilters(next);
    },
    [applyFilters],
  );

  const chips = useMemo(() => {
    const list: Array<{ id: string; label: string; remove: () => void }> = [];
    if (filters.category) {
      list.push({
        id: `category:${filters.category}`,
        label: `Category: ${titleCase(filters.category)}`,
        remove: () => {
          applyFilters(omitKey({ ...filtersRef.current }, "category"));
        },
      });
    }
    if (filters.sort && filters.sort !== "featured") {
      list.push({
        id: `sort:${filters.sort}`,
        label: `Sort: ${titleCase(filters.sort)}`,
        remove: () => {
          applyFilters(omitKey({ ...filtersRef.current }, "sort"));
        },
      });
    }
    return list;
  }, [filters.category, filters.sort, applyFilters]);

  const dropdownItems = useMemo<DropdownItem[]>(() => {
    const items: DropdownItem[] = [];
    const trimmed = text.trim();
    if (trimmed) {
      items.push({
        id: "__search",
        section: "action",
        onSelect: () => {
          const next = { ...filtersRef.current, q: trimmed };
          applyFilters(next);
          setOpen(false);
          commitRecent();
        },
        render: () => (
          <div className="flex w-full items-center gap-3">
            <Search className="h-4 w-4 text-[var(--color-bone-faint)]" />
            <span className="truncate text-sm text-[var(--color-bone)]">
              Search marketplace for{" "}
              <span className="font-mono text-[var(--color-amber)]">"{trimmed}"</span>
            </span>
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--color-bone-faint)]">
              Enter
              <CornerDownLeft className="h-3 w-3" />
            </span>
          </div>
        ),
      });
      for (const suggestion of suggestions) {
        items.push({
          id: `suggest:${suggestion.id}`,
          section: "suggestion",
          onSelect: () => {
            const next = { ...filtersRef.current, q: suggestion.slug };
            applyFilters(next);
            setText(suggestion.slug);
            setOpen(false);
            commitRecent();
          },
          render: () => (
            <div className="flex w-full items-center gap-3">
              <Sparkles className="h-4 w-4 text-[var(--color-amber)]" />
              <span className="truncate font-mono text-sm text-[var(--color-bone)]">
                {suggestion.slug}
              </span>
              {suggestion.description ? (
                <span className="ml-auto max-w-[55%] truncate text-xs text-[var(--color-bone-faint)]">
                  {suggestion.description}
                </span>
              ) : null}
            </div>
          ),
        });
      }
    }
    if (showCategories) {
      items.push({
        id: "category:all",
        section: "category",
        onSelect: () => {
          applyFilters(omitKey({ ...filtersRef.current }, "category"));
          setOpen(false);
        },
        render: () => (
          <div className="flex w-full items-center gap-3">
            <Boxes className="h-4 w-4 text-[var(--color-bone-faint)]" />
            <span className="text-sm text-[var(--color-bone)]">All categories</span>
            {!filters.category ? (
              <Check className="ml-auto h-4 w-4 text-[var(--color-amber)]" />
            ) : null}
          </div>
        ),
      });
      for (const item of MARKETPLACE_CATEGORIES) {
        items.push({
          id: `category:${item}`,
          section: "category",
          onSelect: () => {
            applyFilters({ ...filtersRef.current, category: item });
            setOpen(false);
          },
          render: () => (
            <div className="flex w-full items-center gap-3">
              <Boxes className="h-4 w-4 text-[var(--color-bone-faint)]" />
              <span className="text-sm text-[var(--color-bone)]">{titleCase(item)}</span>
              {filters.category === item ? (
                <Check className="ml-auto h-4 w-4 text-[var(--color-amber)]" />
              ) : null}
            </div>
          ),
        });
      }
    }
    if (showSort) {
      for (const item of MARKETPLACE_SORTS) {
        const effective = filters.sort ?? "featured";
        items.push({
          id: `sort:${item}`,
          section: "sort",
          onSelect: () => {
            const next = { ...filtersRef.current };
            applyFilters(item === "featured" ? omitKey(next, "sort") : { ...next, sort: item });
            setOpen(false);
          },
          render: () => (
            <div className="flex w-full items-center gap-3">
              <CalendarClock className="h-4 w-4 text-[var(--color-bone-faint)]" />
              <span className="text-sm text-[var(--color-bone)]">{titleCase(item)}</span>
              {effective === item ? (
                <Check className="ml-auto h-4 w-4 text-[var(--color-amber)]" />
              ) : null}
            </div>
          ),
        });
      }
    }
    if (!trimmed && recents.length > 0) {
      for (const recent of recents) {
        items.push({
          id: `recent:${recent.id}`,
          section: "recent",
          onSelect: () => {
            const parsed = parseMarketplaceFilters(new URLSearchParams(recent.params));
            setText(parsed.q ?? "");
            applyFilters(parsed);
            setOpen(false);
          },
          render: () => (
            <div className="flex w-full items-center gap-3">
              <History className="h-4 w-4 text-[var(--color-bone-faint)]" />
              <span className="truncate text-sm text-[var(--color-bone)]">{recent.label}</span>
            </div>
          ),
        });
      }
    }
    return items;
  }, [
    text,
    suggestions,
    showCategories,
    showSort,
    filters.category,
    filters.sort,
    applyFilters,
    recents,
    commitRecent,
  ]);

  useEffect(() => {
    if (activeIndex >= dropdownItems.length) {
      setActiveIndex(Math.max(0, dropdownItems.length - 1));
    }
  }, [activeIndex, dropdownItems.length]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLButtonElement>(`[data-idx="${activeIndex}"]`);
    if (active) active.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown") {
        if (!open) setOpen(true);
        setActiveIndex((idx) => Math.min(idx + 1, Math.max(0, dropdownItems.length - 1)));
        event.preventDefault();
        return;
      }
      if (event.key === "ArrowUp") {
        setActiveIndex((idx) => Math.max(0, idx - 1));
        event.preventDefault();
        return;
      }
      if (event.key === "Enter") {
        if (open && dropdownItems[activeIndex]) {
          dropdownItems[activeIndex]?.onSelect();
          event.preventDefault();
          return;
        }
        const trimmed = text.trim();
        const next = { ...filtersRef.current };
        applyFilters(trimmed ? { ...next, q: trimmed } : omitKey(next, "q"));
        setOpen(false);
        commitRecent();
        event.preventDefault();
        return;
      }
      if (event.key === "Escape") {
        setOpen(false);
        event.preventDefault();
        return;
      }
      if (event.key === "Backspace" && text.length === 0 && chips.length > 0) {
        chips[chips.length - 1]?.remove();
        event.preventDefault();
      }
    },
    [activeIndex, applyFilters, chips, commitRecent, dropdownItems, open, text],
  );

  if (!showSearch && showSort) {
    const currentView: MarketplaceView = filters.view === "list" ? "list" : "grid";
    return (
      <div className={cn("flex flex-wrap items-center gap-2", showCategories ? "mt-3" : "mt-4")}>
        <div className="flex flex-wrap gap-2">
          {MARKETPLACE_SORTS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                const next = { ...filtersRef.current };
                applyFilters(item === "featured" ? omitKey(next, "sort") : { ...next, sort: item });
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                (filters.sort ?? "featured") === item
                  ? "border-[var(--color-amber)]/45 bg-[var(--color-amber)]/10 text-[var(--color-amber)]"
                  : "border-[var(--color-border)] bg-white/[0.03] text-[var(--color-bone-muted)] hover:text-[var(--color-bone)]",
              )}
            >
              {titleCase(item)}
            </button>
          ))}
        </div>

        <div className="inline-flex h-9 items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => setView("grid")}
            className={cn(
              "inline-flex h-full items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium transition-colors",
              currentView === "grid"
                ? "bg-[var(--color-amber)]/20 text-[var(--color-bone)]"
                : "text-[var(--color-bone-faint)] hover:text-[var(--color-bone)]",
            )}
            title="Grid view"
          >
            <Grid3X3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "inline-flex h-full items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium transition-colors",
              currentView === "list"
                ? "bg-[var(--color-amber)]/20 text-[var(--color-bone)]"
                : "text-[var(--color-bone-faint)] hover:text-[var(--color-bone)]",
            )}
            title="List view"
          >
            <List className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={isHero ? "mx-auto w-full max-w-3xl" : "w-full"}>
      <div className="space-y-2">
        <div
          className={cn("flex w-full flex-col gap-2", isHero ? "" : "lg:flex-row lg:items-center")}
        >
          <div
            ref={shellRef}
            className={cn(
              "relative flex flex-1 items-center gap-2 rounded-xl border bg-[var(--color-ink-elevated)]/80 p-1.5 shadow-sm transition-colors",
              open
                ? "border-[var(--color-amber)]/40 ring-2 ring-[var(--color-amber)]/15"
                : "border-[var(--color-border)] hover:border-[var(--color-border)]/80",
            )}
          >
            <div className="flex shrink-0 items-center pl-2 text-[var(--color-bone-faint)]">
              {isPending || suggestLoading ? (
                <Sparkles className="h-4 w-4 animate-pulse" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              {chips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={chip.remove}
                  className="group inline-flex max-w-full items-center gap-1 rounded-md border border-[var(--color-amber)]/30 bg-[var(--color-amber)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--color-bone)] transition-colors"
                  title={`Remove ${chip.label}`}
                >
                  <span className="truncate">{chip.label}</span>
                  <X className="h-3 w-3 opacity-70 group-hover:opacity-100" />
                </button>
              ))}
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  setOpen(true);
                  setActiveIndex(0);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => commitRecent(), 120)}
                onKeyDown={handleInputKeyDown}
                placeholder={chips.length === 0 ? searchPlaceholder : "Add another filter..."}
                className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm text-[var(--color-bone)] outline-none placeholder:text-[var(--color-bone-faint)]"
              />
            </div>

            {filterCount(filters) > 0 ? (
              <button
                type="button"
                onClick={clearAll}
                className="mr-1 inline-flex shrink-0 items-center gap-1 rounded-md border border-[var(--color-border)] bg-white/[0.03] px-2 py-1 text-[11px] text-[var(--color-bone-muted)] transition-colors hover:border-red-400/40 hover:text-red-200"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            ) : null}

            <span className="mr-2 hidden shrink-0 items-center gap-1 rounded-md border border-[var(--color-border)] bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-bone-faint)] md:inline-flex">
              <span>⌘K</span>
            </span>

            {open ? (
              <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)] shadow-2xl">
                <div ref={listRef} className="max-h-[340px] overflow-y-auto p-1">
                  {dropdownItems.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-[var(--color-bone-faint)]">
                      No matching suggestions
                    </div>
                  ) : (
                    dropdownItems.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        data-idx={idx}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={item.onSelect}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors",
                          idx === activeIndex
                            ? "border-l-2 border-[var(--color-amber)] bg-white/[0.06] pl-[calc(0.5rem-2px)]"
                            : "border-l-2 border-transparent hover:bg-white/[0.03]",
                        )}
                      >
                        {item.render()}
                      </button>
                    ))
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-black/20 px-3 py-1.5 text-[10px] text-[var(--color-bone-faint)]">
                  <span>Use ↑/↓ and Enter</span>
                  <span>
                    {dropdownItems.length} item{dropdownItems.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {showSort ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 px-2.5 text-xs font-medium text-[var(--color-bone)] shadow-sm transition hover:border-[var(--color-amber)]/30"
              title="Sort results"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--color-bone-faint)]" />
              <span className="hidden sm:inline">Sort:</span>
              <span>{titleCase(filters.sort ?? "featured")}</span>
              <ChevronDown className="h-3.5 w-3.5 text-[var(--color-bone-faint)]" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
