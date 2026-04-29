"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { FunctionSlugSuggestion, FunctionSort } from "@/server/functions";
import {
  ArrowDownAZ,
  ArrowUpDown,
  CalendarClock,
  Check,
  ChevronDown,
  Clock,
  CornerDownLeft,
  Eye,
  Flame,
  GitBranch,
  Grid3X3,
  History,
  KeyRound,
  Layers,
  List,
  Loader2,
  Rocket,
  Search,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  type ParsedFunctionFilters,
  filterCount,
  parseFunctionFilters,
  serializeFunctionFilters,
} from "./search-params";

type CategoryId =
  | "visibility"
  | "status"
  | "lastRun"
  | "github"
  | "env"
  | "trigger"
  | "updatedWithin";

interface OptionDef {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  tone?: "amber" | "emerald" | "red" | "sky" | "slate" | "violet";
}

interface CategoryDef {
  id: CategoryId;
  label: string;
  hint: string;
  icon: ReactNode;
  multi: boolean;
  options: OptionDef[];
}

const CATEGORIES: CategoryDef[] = [
  {
    id: "visibility",
    label: "Visibility",
    hint: "marketplace or private",
    icon: <Eye className="h-4 w-4" />,
    multi: false,
    options: [
      {
        value: "public",
        label: "Marketplace",
        description: "Publicly discoverable and forkable",
        tone: "emerald",
      },
      {
        value: "private",
        label: "Private",
        description: "Workspace-only, Pro or Team",
        tone: "slate",
      },
    ],
  },
  {
    id: "status",
    label: "Deploy status",
    hint: "deployed or draft",
    icon: <Rocket className="h-4 w-4" />,
    multi: false,
    options: [
      {
        value: "deployed",
        label: "Deployed",
        description: "Has an active version",
        tone: "emerald",
      },
      { value: "draft", label: "Draft only", description: "No active version yet", tone: "amber" },
    ],
  },
  {
    id: "lastRun",
    label: "Last run",
    hint: "filter by most recent execution outcome",
    icon: <Flame className="h-4 w-4" />,
    multi: true,
    options: [
      {
        value: "ok",
        label: "Succeeded",
        description: "Last execution returned 200",
        tone: "emerald",
      },
      {
        value: "error",
        label: "Failed",
        description: "Last execution errored or hit a limit",
        tone: "red",
      },
      { value: "none", label: "Never run", description: "No executions yet", tone: "slate" },
    ],
  },
  {
    id: "github",
    label: "GitHub binding",
    hint: "linked or unlinked",
    icon: <GitBranch className="h-4 w-4" />,
    multi: false,
    options: [
      {
        value: "linked",
        label: "Linked",
        description: "Connected to a GitHub repo",
        tone: "violet",
      },
      {
        value: "unlinked",
        label: "Unlinked",
        description: "Not connected to any repo",
        tone: "slate",
      },
    ],
  },
  {
    id: "env",
    label: "Environment variables",
    hint: "any set or none",
    icon: <KeyRound className="h-4 w-4" />,
    multi: false,
    options: [
      { value: "any", label: "Has env vars", tone: "emerald" },
      { value: "none", label: "No env vars", tone: "slate" },
    ],
  },
  {
    id: "trigger",
    label: "Trigger kind",
    hint: "http, cron, email, or mcp",
    icon: <Zap className="h-4 w-4" />,
    multi: true,
    options: [
      { value: "http", label: "HTTP", description: "Web endpoint", tone: "sky" },
      { value: "cron", label: "Cron", description: "Scheduled invocation", tone: "amber" },
      { value: "email", label: "Email", description: "Inbound email trigger", tone: "violet" },
      {
        value: "mcp",
        label: "MCP tool",
        description: "Model context protocol tool",
        tone: "emerald",
      },
    ],
  },
  {
    id: "updatedWithin",
    label: "Updated within",
    hint: "last 24h / 7d / 30d / 90d",
    icon: <Clock className="h-4 w-4" />,
    multi: false,
    options: [
      { value: "24h", label: "Last 24 hours", tone: "amber" },
      { value: "7d", label: "Last 7 days", tone: "amber" },
      { value: "30d", label: "Last 30 days", tone: "amber" },
      { value: "90d", label: "Last 90 days", tone: "amber" },
    ],
  },
];

const CATEGORY_BY_ID = new Map<CategoryId, CategoryDef>(CATEGORIES.map((c) => [c.id, c]));

const TONE_CLASSES: Record<NonNullable<OptionDef["tone"]>, string> = {
  amber: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  emerald: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  red: "border-red-400/30 bg-red-500/10 text-red-200",
  sky: "border-sky-400/30 bg-sky-500/10 text-sky-200",
  slate: "border-slate-400/30 bg-slate-500/15 text-slate-200",
  violet: "border-violet-400/30 bg-violet-500/10 text-violet-200",
};

const SORT_OPTIONS: { value: string; label: string; icon: ReactNode }[] = [
  {
    value: "updated_desc",
    label: "Recently updated",
    icon: <CalendarClock className="h-3.5 w-3.5" />,
  },
  { value: "name_asc", label: "Name A → Z", icon: <ArrowDownAZ className="h-3.5 w-3.5" /> },
  { value: "execs_desc", label: "Most executions", icon: <Flame className="h-3.5 w-3.5" /> },
  {
    value: "failures_desc",
    label: "Most failures",
    icon: <TriangleAlert className="h-3.5 w-3.5" />,
  },
];

const SORT_LABEL_BY_VALUE = new Map(SORT_OPTIONS.map((s) => [s.value, s.label]));

interface DropdownItem {
  id: string;
  /** What happens when user hits Enter on this item */
  onSelect: () => void;
  render: () => ReactNode;
  /** Optional: when true, the item is a "quick add" chip suggestion. */
  section: "category" | "value" | "suggestion" | "recent" | "action";
}

interface RecentEntry {
  id: string;
  label: string;
  params: string;
  at: number;
}

const RECENTS_KEY = "hf:functions:recents";
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
    // ignore quota errors
  }
}

function chipLabel(categoryId: CategoryId, value: string): string {
  const cat = CATEGORY_BY_ID.get(categoryId);
  const opt = cat?.options.find((o) => o.value === value);
  return opt?.label ?? value;
}

function chipTone(categoryId: CategoryId, value: string): OptionDef["tone"] | undefined {
  const cat = CATEGORY_BY_ID.get(categoryId);
  const opt = cat?.options.find((o) => o.value === value);
  return opt?.tone;
}

function omitKey<T extends object, K extends keyof T>(obj: T, key: K): T {
  const { [key]: _removed, ...rest } = obj;
  void _removed;
  return rest as T;
}

function humanFilterLabel(filters: ParsedFunctionFilters): string {
  const parts: string[] = [];
  if (filters.q) parts.push(`"${filters.q}"`);
  if (filters.visibility) parts.push(`visibility: ${filters.visibility}`);
  if (filters.status) parts.push(`status: ${filters.status}`);
  if (filters.lastRun && filters.lastRun.length > 0) {
    parts.push(`lastRun: ${filters.lastRun.join("/")}`);
  }
  if (filters.github) parts.push(`github: ${filters.github}`);
  if (filters.env) parts.push(`env: ${filters.env}`);
  if (filters.trigger && filters.trigger.length > 0) {
    parts.push(`trigger: ${filters.trigger.join("/")}`);
  }
  if (filters.updatedWithin) parts.push(`updated: ${filters.updatedWithin}`);
  if (filters.sort && filters.sort !== "updated_desc") parts.push(`sort: ${filters.sort}`);
  return parts.join(" · ") || "All functions";
}

export function FunctionsSearchBar({
  initialFilters,
  totalResults,
}: {
  initialFilters: ParsedFunctionFilters;
  totalResults: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useState<ParsedFunctionFilters>(initialFilters);
  const [text, setText] = useState(initialFilters.q ?? "");
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<FunctionSlugSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [recents, setRecents] = useState<RecentEntry[]>([]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
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
    (next: ParsedFunctionFilters) => {
      setFilters(next);
      const params = serializeFunctionFilters(next);
      const existing = new URLSearchParams(searchParams.toString());
      // Preserve unrelated params (none today, but future-proof).
      const preserved = new URLSearchParams();
      const managed = new Set([
        "q",
        "visibility",
        "status",
        "lastRun",
        "github",
        "env",
        "trigger",
        "updatedWithin",
        "sort",
        "view",
      ]);
      existing.forEach((value, key) => {
        if (!managed.has(key)) preserved.append(key, value);
      });
      preserved.forEach((value, key) => params.append(key, value));
      const nextStr = params.toString();
      const currStr = new URLSearchParams(searchParams.toString()).toString();
      if (nextStr !== currStr) {
        startTransition(() => {
          router.push(nextStr ? `${pathname}?${nextStr}` : pathname);
        });
      }
    },
    [pathname, router, searchParams],
  );

  // Sync free-text query with a short debounce.
  useEffect(() => {
    const trimmed = text.trim();
    const current = filtersRef.current.q ?? "";
    if (trimmed === current) return;
    const timer = setTimeout(() => {
      const base: ParsedFunctionFilters = { ...filtersRef.current };
      const next = trimmed ? { ...base, q: trimmed } : omitKey(base, "q");
      applyFilters(next);
    }, 250);
    return () => clearTimeout(timer);
  }, [text, applyFilters]);

  // Fetch typeahead suggestions for free-text.
  useEffect(() => {
    const trimmed = text.trim();
    if (!trimmed || activeCategory) {
      setSuggestions([]);
      setSuggestLoading(false);
      return;
    }
    let cancelled = false;
    setSuggestLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/functions/suggest?q=${encodeURIComponent(trimmed)}&limit=5`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`suggest_failed_${res.status}`);
        const data = (await res.json()) as { items: FunctionSlugSuggestion[] };
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
  }, [text, activeCategory]);

  // Global shortcuts: Cmd+K / Ctrl+K / "/" focuses the search input.
  useEffect(() => {
    function handler(e: globalThis.KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTypable =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      } else if (e.key === "/" && !isTypable) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Close dropdown when clicking outside the shell.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!shellRef.current) return;
      if (!shellRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveCategory(null);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const commitChip = useCallback(
    (categoryId: CategoryId, value: string) => {
      const cat = CATEGORY_BY_ID.get(categoryId);
      if (!cat) return;
      let next: ParsedFunctionFilters = { ...filtersRef.current };
      if (cat.multi) {
        const key = categoryId as "lastRun" | "trigger";
        const existing = next[key] ?? [];
        const has = existing.includes(value as never);
        const updated = has
          ? existing.filter((v) => v !== value)
          : ([...existing, value] as typeof existing);
        if (updated.length === 0) next = omitKey(next, key);
        else (next[key] as string[]) = updated;
      } else {
        const key = categoryId as "visibility" | "status" | "github" | "env" | "updatedWithin";
        const existing = next[key];
        if (existing === value) next = omitKey(next, key);
        else (next[key] as string) = value;
      }
      applyFilters(next);
    },
    [applyFilters],
  );

  const removeChip = useCallback(
    (categoryId: CategoryId, value?: string) => {
      let next: ParsedFunctionFilters = { ...filtersRef.current };
      const cat = CATEGORY_BY_ID.get(categoryId);
      if (!cat) return;
      if (cat.multi && value) {
        const key = categoryId as "lastRun" | "trigger";
        const existing = next[key] ?? [];
        const updated = existing.filter((v) => v !== value);
        if (updated.length === 0) next = omitKey(next, key);
        else (next[key] as string[]) = updated;
      } else {
        next = omitKey(next, categoryId as keyof ParsedFunctionFilters);
      }
      applyFilters(next);
    },
    [applyFilters],
  );

  const clearAll = useCallback(() => {
    setText("");
    applyFilters({});
  }, [applyFilters]);

  const setView = useCallback(
    (view: "grid" | "list") => {
      const base = { ...filtersRef.current };
      const next: ParsedFunctionFilters =
        view === "grid" ? omitKey(base, "view") : { ...base, view: "list" };
      applyFilters(next);
    },
    [applyFilters],
  );

  const setSort = useCallback(
    (sort: string) => {
      const base = { ...filtersRef.current };
      const next: ParsedFunctionFilters =
        sort === "updated_desc" ? omitKey(base, "sort") : { ...base, sort: sort as FunctionSort };
      applyFilters(next);
    },
    [applyFilters],
  );

  const saveToRecents = useCallback(() => {
    const current = filtersRef.current;
    if (filterCount(current) === 0) return;
    const params = serializeFunctionFilters(current);
    params.sort();
    const sig = params.toString();
    if (!sig) return;
    const entry: RecentEntry = {
      id: sig,
      label: humanFilterLabel(current),
      params: sig,
      at: Date.now(),
    };
    const filtered = loadRecents().filter((r) => r.params !== sig);
    const next = [entry, ...filtered].slice(0, RECENTS_MAX);
    saveRecents(next);
    setRecents(next);
  }, []);

  // Save recents when user blurs the search (a natural "commit" moment).
  const handleInputBlur = useCallback(() => {
    // Delay so click inside dropdown still works.
    setTimeout(() => {
      saveToRecents();
    }, 150);
  }, [saveToRecents]);

  /* ---------------- chip rendering ---------------- */

  const chips = useMemo(() => {
    const list: {
      id: string;
      categoryId: CategoryId;
      value?: string;
      label: string;
      tone?: OptionDef["tone"];
    }[] = [];
    if (filters.visibility) {
      list.push({
        id: `visibility:${filters.visibility}`,
        categoryId: "visibility",
        label: `Visibility: ${chipLabel("visibility", filters.visibility)}`,
        tone: chipTone("visibility", filters.visibility),
      });
    }
    if (filters.status) {
      list.push({
        id: `status:${filters.status}`,
        categoryId: "status",
        label: `Status: ${chipLabel("status", filters.status)}`,
        tone: chipTone("status", filters.status),
      });
    }
    if (filters.lastRun) {
      for (const v of filters.lastRun) {
        list.push({
          id: `lastRun:${v}`,
          categoryId: "lastRun",
          value: v,
          label: `Last run: ${chipLabel("lastRun", v)}`,
          tone: chipTone("lastRun", v),
        });
      }
    }
    if (filters.github) {
      list.push({
        id: `github:${filters.github}`,
        categoryId: "github",
        label: `GitHub: ${chipLabel("github", filters.github)}`,
        tone: chipTone("github", filters.github),
      });
    }
    if (filters.env) {
      list.push({
        id: `env:${filters.env}`,
        categoryId: "env",
        label: `Env: ${chipLabel("env", filters.env)}`,
        tone: chipTone("env", filters.env),
      });
    }
    if (filters.trigger) {
      for (const v of filters.trigger) {
        list.push({
          id: `trigger:${v}`,
          categoryId: "trigger",
          value: v,
          label: `Trigger: ${chipLabel("trigger", v)}`,
          tone: chipTone("trigger", v),
        });
      }
    }
    if (filters.updatedWithin) {
      list.push({
        id: `updatedWithin:${filters.updatedWithin}`,
        categoryId: "updatedWithin",
        label: `Updated: ${chipLabel("updatedWithin", filters.updatedWithin)}`,
        tone: chipTone("updatedWithin", filters.updatedWithin),
      });
    }
    return list;
  }, [filters]);

  /* ---------------- dropdown items (keyboard-navigable) ---------------- */

  const dropdownItems = useMemo<DropdownItem[]>(() => {
    const items: DropdownItem[] = [];
    const trimmed = text.trim();

    if (activeCategory) {
      const cat = CATEGORY_BY_ID.get(activeCategory);
      if (cat) {
        for (const opt of cat.options) {
          const selected = cat.multi
            ? ((filters[cat.id as "lastRun" | "trigger"] ?? []) as string[]).includes(opt.value)
            : filters[cat.id as "visibility"] === opt.value;
          items.push({
            id: `${cat.id}:${opt.value}`,
            section: "value",
            onSelect: () => {
              commitChip(cat.id, opt.value);
              if (!cat.multi) {
                setActiveCategory(null);
              }
            },
            render: () => (
              <div className="flex w-full items-center gap-3">
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1.5 text-[10px] font-medium",
                    opt.tone
                      ? TONE_CLASSES[opt.tone]
                      : "border-[var(--color-border)] bg-white/[0.04] text-[var(--color-bone)]",
                  )}
                >
                  {opt.label}
                </span>
                {opt.description ? (
                  <span className="truncate text-xs text-[var(--color-bone-faint)]">
                    {opt.description}
                  </span>
                ) : null}
                {selected ? <Check className="ml-auto h-4 w-4 text-[var(--color-amber)]" /> : null}
              </div>
            ),
          });
        }
      }
      return items;
    }

    // Typeahead section: matching function names (when there's free text)
    if (trimmed) {
      items.push({
        id: `__search:${trimmed}`,
        section: "action",
        onSelect: () => {
          const next: ParsedFunctionFilters = { ...filtersRef.current, q: trimmed };
          applyFilters(next);
          setOpen(false);
          saveToRecents();
        },
        render: () => (
          <div className="flex w-full items-center gap-3">
            <Search className="h-4 w-4 text-[var(--color-bone-faint)]" />
            <span className="truncate text-sm text-[var(--color-bone)]">
              Search for <span className="font-mono text-[var(--color-amber)]">"{trimmed}"</span>
            </span>
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--color-bone-faint)]">
              Enter
              <CornerDownLeft className="h-3 w-3" />
            </span>
          </div>
        ),
      });
      for (const s of suggestions) {
        items.push({
          id: `suggest:${s.id}`,
          section: "suggestion",
          onSelect: () => {
            const next: ParsedFunctionFilters = { ...filtersRef.current, q: s.slug };
            applyFilters(next);
            setText(s.slug);
            setOpen(false);
            saveToRecents();
          },
          render: () => (
            <div className="flex w-full items-center gap-3">
              <Sparkles className="h-4 w-4 text-[var(--color-amber)]" />
              <span className="truncate font-mono text-sm text-[var(--color-bone)]">{s.slug}</span>
              {s.description ? (
                <span className="ml-auto max-w-[55%] truncate text-xs text-[var(--color-bone-faint)]">
                  {s.description}
                </span>
              ) : null}
            </div>
          ),
        });
      }
    }

    // Categories section
    for (const cat of CATEGORIES) {
      items.push({
        id: `cat:${cat.id}`,
        section: "category",
        onSelect: () => {
          setActiveCategory(cat.id);
          setActiveIndex(0);
        },
        render: () => (
          <div className="flex w-full items-center gap-3">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] bg-white/[0.05] text-[var(--color-amber)]">
              {cat.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-[var(--color-bone)]">
                {cat.label}
              </div>
              <div className="truncate text-[11px] text-[var(--color-bone-faint)]">{cat.hint}</div>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-bone-faint)]">
              {cat.multi ? "multi" : "pick"}
            </span>
          </div>
        ),
      });
    }

    // Recents section
    if (!trimmed && recents.length > 0) {
      for (const r of recents) {
        items.push({
          id: `recent:${r.id}`,
          section: "recent",
          onSelect: () => {
            const params = new URLSearchParams(r.params);
            const parsed = parseFunctionFilters(params);
            setText(parsed.q ?? "");
            applyFilters(parsed);
            setOpen(false);
          },
          render: () => (
            <div className="flex w-full items-center gap-3">
              <History className="h-4 w-4 text-[var(--color-bone-faint)]" />
              <span className="truncate text-sm text-[var(--color-bone)]">{r.label}</span>
            </div>
          ),
        });
      }
    }

    return items;
  }, [
    activeCategory,
    text,
    suggestions,
    recents,
    filters,
    applyFilters,
    commitChip,
    saveToRecents,
  ]);

  // Keep activeIndex in range whenever items change.
  useLayoutEffect(() => {
    if (activeIndex >= dropdownItems.length) setActiveIndex(Math.max(0, dropdownItems.length - 1));
  }, [dropdownItems.length, activeIndex]);

  // Scroll active item into view inside the list.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLButtonElement>(`[data-idx="${activeIndex}"]`);
    if (active) active.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        if (!open) setOpen(true);
        setActiveIndex((i) => Math.min(i + 1, Math.max(0, dropdownItems.length - 1)));
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowUp") {
        setActiveIndex((i) => Math.max(0, i - 1));
        e.preventDefault();
        return;
      }
      if (e.key === "Enter") {
        if (open && dropdownItems[activeIndex]) {
          dropdownItems[activeIndex]?.onSelect();
          e.preventDefault();
          return;
        }
        // No open menu: commit text as filter q
        const trimmed = text.trim();
        const base: ParsedFunctionFilters = { ...filtersRef.current };
        const next: ParsedFunctionFilters = trimmed ? { ...base, q: trimmed } : omitKey(base, "q");
        applyFilters(next);
        saveToRecents();
        setOpen(false);
        e.preventDefault();
        return;
      }
      if (e.key === "Escape") {
        if (activeCategory) {
          setActiveCategory(null);
          e.preventDefault();
        } else if (open) {
          setOpen(false);
          e.preventDefault();
        }
        return;
      }
      if (e.key === "Backspace" && text.length === 0 && chips.length > 0) {
        const last = chips[chips.length - 1];
        if (last) removeChip(last.categoryId, last.value);
        e.preventDefault();
        return;
      }
      if (e.key === "Tab" && open && dropdownItems[activeIndex]) {
        const item = dropdownItems[activeIndex];
        if (item?.section === "suggestion") {
          item.onSelect();
          e.preventDefault();
        }
      }
    },
    [
      activeCategory,
      activeIndex,
      applyFilters,
      chips,
      dropdownItems,
      open,
      removeChip,
      saveToRecents,
      text,
    ],
  );

  const activeCategoryDef = activeCategory ? CATEGORY_BY_ID.get(activeCategory) : null;
  const totalApplied = filterCount(filters);
  const currentView: "grid" | "list" = filters.view === "list" ? "list" : "grid";
  const currentSort = filters.sort ?? "updated_desc";

  return (
    <div className="space-y-2">
      <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center">
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
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => removeChip(chip.categoryId, chip.value)}
                className={cn(
                  "group inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
                  chip.tone
                    ? TONE_CLASSES[chip.tone]
                    : "border-[var(--color-amber)]/30 bg-[var(--color-amber)]/10 text-[var(--color-bone)]",
                )}
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
              onChange={(e) => {
                setText(e.target.value);
                setOpen(true);
                setActiveIndex(0);
              }}
              onKeyDown={handleInputKeyDown}
              onFocus={() => setOpen(true)}
              onBlur={handleInputBlur}
              placeholder={
                chips.length === 0
                  ? "Search functions by name or description, or filter by property..."
                  : "Add another filter..."
              }
              className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm text-[var(--color-bone)] outline-none placeholder:text-[var(--color-bone-faint)]"
              aria-expanded={open}
              aria-controls="functions-search-dropdown"
              aria-autocomplete="list"
              role="combobox"
            />
          </div>

          {totalApplied > 0 ? (
            <button
              type="button"
              onClick={clearAll}
              className="mr-1 inline-flex shrink-0 items-center gap-1 rounded-md border border-[var(--color-border)] bg-white/[0.03] px-2 py-1 text-[11px] text-[var(--color-bone-muted)] transition-colors hover:border-red-400/40 hover:text-red-200"
              title="Clear all filters"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          ) : null}

          <span className="mr-2 hidden shrink-0 items-center gap-1 rounded-md border border-[var(--color-border)] bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-bone-faint)] md:inline-flex">
            <span>⌘K</span>
          </span>

          {open ? (
            <div
              id="functions-search-dropdown"
              className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/95 shadow-2xl backdrop-blur-sm"
            >
              {activeCategoryDef ? (
                <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-white/[0.03] px-3 py-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveCategory(null)}
                    className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-[var(--color-bone-faint)] hover:text-[var(--color-bone)]"
                  >
                    <ChevronDown className="h-3 w-3 rotate-90" />
                    Back
                  </button>
                  <span className="text-[var(--color-bone-muted)]">Filter by</span>
                  <span className="font-medium text-[var(--color-bone)]">
                    {activeCategoryDef.label}
                  </span>
                  <span className="text-[var(--color-bone-faint)]">· {activeCategoryDef.hint}</span>
                </div>
              ) : null}

              <div
                ref={listRef}
                className="max-h-[360px] overflow-y-auto p-1"
                aria-label="Filter suggestions"
              >
                {dropdownItems.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-[var(--color-bone-faint)]">
                    No matching suggestions
                  </div>
                ) : (
                  <DropdownSections
                    items={dropdownItems}
                    activeIndex={activeIndex}
                    setActiveIndex={setActiveIndex}
                  />
                )}
              </div>

              <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-black/20 px-3 py-1.5 text-[10px] text-[var(--color-bone-faint)]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <kbd className="rounded border border-[var(--color-border)] bg-white/[0.04] px-1">
                      ↑
                    </kbd>
                    <kbd className="rounded border border-[var(--color-border)] bg-white/[0.04] px-1">
                      ↓
                    </kbd>
                    navigate
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <kbd className="rounded border border-[var(--color-border)] bg-white/[0.04] px-1">
                      ↵
                    </kbd>
                    select
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <kbd className="rounded border border-[var(--color-border)] bg-white/[0.04] px-1">
                      esc
                    </kbd>
                    close
                  </span>
                </div>
                <div>
                  {totalResults.toLocaleString()} match{totalResults === 1 ? "" : "es"}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 px-2.5 text-xs font-medium text-[var(--color-bone)] shadow-sm transition hover:border-[var(--color-amber)]/30"
                title="Sort results"
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-[var(--color-bone-faint)]" />
                <span className="hidden sm:inline">Sort:</span>
                <span className="text-[var(--color-bone)]">
                  {SORT_LABEL_BY_VALUE.get(currentSort) ?? "Recently updated"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-[var(--color-bone-faint)]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 border-[var(--color-border)] bg-[var(--color-ink-elevated)] text-[var(--color-bone)]"
            >
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-[var(--color-bone-faint)]">
                Order results by
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[var(--color-border)]" />
              <DropdownMenuRadioGroup value={currentSort} onValueChange={setSort}>
                {SORT_OPTIONS.map((opt) => (
                  <DropdownMenuRadioItem
                    key={opt.value}
                    value={opt.value}
                    className="gap-2 focus:bg-white/[0.06]"
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

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
      </div>

      {/* Active filters rail */}
      {totalApplied > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/50 px-2.5 py-1.5">
          <div className="flex items-center gap-1.5 pr-1 text-[10px] uppercase tracking-wider text-[var(--color-bone-faint)]">
            <SlidersHorizontal className="h-3 w-3" />
            Active filters
          </div>
          {chips.map((chip) => (
            <button
              key={`rail-${chip.id}`}
              type="button"
              onClick={() => removeChip(chip.categoryId, chip.value)}
              className={cn(
                "group inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                chip.tone
                  ? TONE_CLASSES[chip.tone]
                  : "border-[var(--color-amber)]/30 bg-[var(--color-amber)]/10 text-[var(--color-bone)]",
              )}
            >
              <span>{chip.label}</span>
              <X className="h-3 w-3 opacity-70 group-hover:opacity-100" />
            </button>
          ))}
          {filters.q ? (
            <button
              type="button"
              onClick={() => {
                setText("");
                applyFilters(omitKey({ ...filtersRef.current }, "q"));
              }}
              className="group inline-flex items-center gap-1 rounded-full border border-[var(--color-amber)]/30 bg-[var(--color-amber)]/10 px-2 py-0.5 text-[11px] text-[var(--color-bone)] transition-colors"
            >
              <span>
                Name: <span className="font-mono text-[var(--color-amber)]">"{filters.q}"</span>
              </span>
              <X className="h-3 w-3 opacity-70 group-hover:opacity-100" />
            </button>
          ) : null}
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="ml-auto h-6 px-2 text-[11px] text-[var(--color-bone-muted)] hover:text-[var(--color-bone)]"
          >
            <Link href={pathname}>Clear all</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function DropdownSections({
  items,
  activeIndex,
  setActiveIndex,
}: {
  items: DropdownItem[];
  activeIndex: number;
  setActiveIndex: (n: number) => void;
}) {
  const grouped = useMemo(() => {
    const order: DropdownItem["section"][] = [
      "action",
      "suggestion",
      "value",
      "category",
      "recent",
    ];
    const map = new Map<DropdownItem["section"], { item: DropdownItem; index: number }[]>();
    items.forEach((item, index) => {
      const bucket = map.get(item.section) ?? [];
      bucket.push({ item, index });
      map.set(item.section, bucket);
    });
    return order
      .filter((s) => map.has(s))
      .map((section) => ({ section, entries: map.get(section) ?? [] }));
  }, [items]);

  const HEADING: Record<DropdownItem["section"], string> = {
    action: "Search",
    suggestion: "Matching names",
    value: "Values",
    category: "Filter by property",
    recent: "Recent searches",
  };

  return (
    <>
      {grouped.map(({ section, entries }) => (
        <div key={section} className="py-1 first:pt-0 last:pb-0">
          <div className="flex items-center gap-2 px-2 pb-1 pt-1.5 text-[10px] uppercase tracking-wider text-[var(--color-bone-faint)]">
            {section === "category" ? <Layers className="h-3 w-3" /> : null}
            {section === "recent" ? <History className="h-3 w-3" /> : null}
            {section === "suggestion" ? <Sparkles className="h-3 w-3" /> : null}
            {HEADING[section]}
          </div>
          <div className="flex flex-col">
            {entries.map(({ item, index }) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-idx={index}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => item.onSelect()}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors",
                    isActive
                      ? "border-l-2 border-[var(--color-amber)] bg-white/[0.06] pl-[calc(0.5rem-2px)]"
                      : "border-l-2 border-transparent hover:bg-white/[0.03]",
                  )}
                >
                  {item.render()}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
