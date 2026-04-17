"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export function FunctionsSearchFilter({
  initialQuery = "",
  initialVisibility = "",
}: { initialQuery?: string | undefined; initialVisibility?: string | undefined }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(initialQuery);
  const [visibility, setVisibility] = useState(initialVisibility);

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

      const newParamsStr = params.toString();
      const currentParamsStr = searchParams.toString();

      if (newParamsStr !== currentParamsStr) {
        startTransition(() => {
          router.push(`${pathname}?${newParamsStr}`);
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, visibility, router, pathname, searchParams]);

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
