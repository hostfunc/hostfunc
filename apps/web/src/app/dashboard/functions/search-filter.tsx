"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Grid3X3, List, Loader2, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export function FunctionsSearchFilter({
  initialQuery = "",
  initialVisibility = "",
  initialView = "grid",
}: {
  initialQuery?: string | undefined;
  initialVisibility?: string | undefined;
  initialView?: "grid" | "list";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(initialQuery);
  const [visibility, setVisibility] = useState(initialVisibility);
  const [view, setView] = useState<"grid" | "list">(initialView);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setVisibility(initialVisibility);
  }, [initialVisibility]);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  // Debounced search logic
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) {
        params.set("q", query);
      } else {
        params.delete("q");
      }

      if (visibility) {
        params.set("visibility", visibility);
      } else {
        params.delete("visibility");
      }

      if (view === "list") {
        params.set("view", "list");
      } else {
        params.delete("view");
      }

      const newParamsStr = params.toString();
      const currentParamsStr = searchParams.toString();

      if (newParamsStr !== currentParamsStr) {
        startTransition(() => {
          router.push(`${pathname}?${newParamsStr}`);
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, visibility, view, router, pathname, searchParams]);

  return (
    <div className="flex w-full flex-col items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-2.5 shadow-sm sm:flex-row">
      <div className="relative w-full sm:max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isPending ? (
            <Loader2 className="h-4 w-4 text-[var(--color-bone-faint)] animate-spin" />
          ) : (
            <Search className="h-4 w-4 text-[var(--color-bone-faint)]" />
          )}
        </div>
        <Input
          type="text"
          placeholder="Filter functions by name or description..."
          className="h-9 border-[var(--color-border)] bg-white/[0.03] pl-10 text-[var(--color-bone)] shadow-none placeholder:text-[var(--color-bone-faint)] focus-visible:ring-[var(--color-amber)]"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="flex w-full shrink-0 items-center gap-2 overflow-x-auto border-t border-[var(--color-border)] px-2 pt-3 sm:w-auto sm:border-t-0 sm:border-l sm:pt-0 sm:pl-3">
        <div className="mr-1 flex items-center rounded-full border border-[var(--color-border)] bg-black/20 p-0.5">
          <button
            type="button"
            onClick={() => setView("grid")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              view === "grid"
                ? "bg-[var(--color-amber)]/20 text-[var(--color-bone)]"
                : "text-[var(--color-bone-faint)] hover:text-[var(--color-bone)]",
            )}
          >
            <Grid3X3 className="h-3.5 w-3.5" />
            Grid
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              view === "list"
                ? "bg-[var(--color-amber)]/20 text-[var(--color-bone)]"
                : "text-[var(--color-bone-faint)] hover:text-[var(--color-bone)]",
            )}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
        </div>
        <button
          type="button"
          onClick={() => setVisibility("")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            visibility === ""
              ? "border-[var(--color-amber)]/35 bg-[var(--color-amber)]/15 text-[var(--color-bone)]"
              : "border-[var(--color-border)] bg-transparent text-[var(--color-bone-faint)] hover:bg-white/[0.04] hover:text-[var(--color-bone)]",
          )}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setVisibility("public")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            visibility === "public"
              ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-300"
              : "border-[var(--color-border)] bg-transparent text-[var(--color-bone-faint)] hover:bg-white/[0.04] hover:text-[var(--color-bone)]",
          )}
        >
          Public
        </button>
        <button
          type="button"
          onClick={() => setVisibility("private")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            visibility === "private"
              ? "border-slate-400/35 bg-slate-500/20 text-slate-200"
              : "border-[var(--color-border)] bg-transparent text-[var(--color-bone-faint)] hover:bg-white/[0.04] hover:text-[var(--color-bone)]",
          )}
        >
          Private
        </button>
      </div>
    </div>
  );
}
