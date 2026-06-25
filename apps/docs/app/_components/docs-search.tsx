"use client";

import { getDocsSearchIndex } from "@/lib/docs-content";
import { cn } from "@/lib/utils";
import { CornerDownLeft, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type SearchResult = {
  href: string;
  title: string;
  summary: string;
};

export function DocsSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const allRecords = useMemo(() => getDocsSearchIndex(), []);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRecords.slice(0, 8);
    return allRecords
      .map((record) => {
        const haystack =
          `${record.title} ${record.summary} ${record.sectionTitles.join(" ")}`.toLowerCase();
        const score =
          (record.title.toLowerCase().includes(q) ? 3 : 0) +
          (record.summary.toLowerCase().includes(q) ? 2 : 0) +
          (record.sectionTitles.some((section) => section.toLowerCase().includes(q)) ? 1 : 0);
        return { record, score, matched: haystack.includes(q) };
      })
      .filter((entry) => entry.matched)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((entry) => ({
        href: entry.record.href,
        title: entry.record.title,
        summary: entry.record.summary,
      }));
  }, [allRecords, query]);

  const selectResult = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  useEffect(() => {
    void pathname;
    setOpen(false);
    setQuery("");
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!shellRef.current) return;
      if (!shellRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypable =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && (event.key === "k" || event.key === "K")) {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
        return;
      }
      if (event.key === "/" && !isTypable) {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (activeIndex >= results.length) {
      setActiveIndex(Math.max(0, results.length - 1));
    }
  }, [activeIndex, results.length]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLButtonElement>(`[data-idx="${activeIndex}"]`);
    if (active) active.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <div ref={shellRef} className="relative w-full max-w-2xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--color-bone-faint)]" />
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            setOpen(true);
            setActiveIndex((idx) => Math.min(idx + 1, Math.max(0, results.length - 1)));
            event.preventDefault();
            return;
          }
          if (event.key === "ArrowUp") {
            setActiveIndex((idx) => Math.max(0, idx - 1));
            event.preventDefault();
            return;
          }
          if (event.key === "Escape") {
            setOpen(false);
            event.preventDefault();
            return;
          }
          if (event.key === "Enter" && results[activeIndex]) {
            event.preventDefault();
            selectResult(results[activeIndex].href);
          }
        }}
        placeholder="Search documentation..."
        className={cn(
          "h-10 w-full rounded-full border bg-[var(--color-ink-elevated)] px-10 pr-20 text-sm text-[var(--color-bone)] transition-all outline-none",
          open
            ? "border-[var(--color-amber)]/50 ring-2 ring-[var(--color-amber)]/15"
            : "border-[var(--color-border)]",
        )}
        aria-expanded={open}
        aria-controls="docs-search-results"
        role="combobox"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden h-5 -translate-y-1/2 items-center gap-1 rounded border border-[var(--color-border)] bg-white/[0.04] px-1.5 font-mono text-[10px] font-medium text-[var(--color-bone-faint)] sm:inline-flex">
        <span className="text-xs">⌘</span>K
      </kbd>

      {open ? (
        <div
          id="docs-search-results"
          className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)] shadow-2xl"
        >
          <div ref={listRef} className="max-h-[340px] overflow-y-auto p-1">
            {results.length === 0 ? (
              <div className="px-3 py-5 text-sm text-[var(--color-bone-faint)]">
                No matches found.
              </div>
            ) : (
              results.map((result, idx) => (
                <button
                  key={`${result.href}-${result.title}`}
                  type="button"
                  data-idx={idx}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectResult(result.href)}
                  className={cn(
                    "flex w-full flex-col items-start gap-1 rounded-md px-3 py-2 text-left transition-colors",
                    idx === activeIndex
                      ? "border-l-2 border-[var(--color-amber)] bg-white/[0.06] pl-[calc(0.75rem-2px)]"
                      : "border-l-2 border-transparent hover:bg-white/[0.04]",
                  )}
                >
                  <span className="text-sm font-medium text-[var(--color-bone)]">
                    {result.title}
                  </span>
                  <span className="line-clamp-2 text-xs leading-relaxed text-[var(--color-bone-faint)]">
                    {result.summary}
                  </span>
                </button>
              ))
            )}
          </div>
          <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-black/20 px-3 py-1.5 text-[10px] text-[var(--color-bone-faint)]">
            <span className="inline-flex items-center gap-1">
              Enter
              <CornerDownLeft className="h-3 w-3" />
              to navigate
            </span>
            <span>
              {results.length} result{results.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
