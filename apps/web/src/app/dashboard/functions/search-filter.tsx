"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function FunctionsSearchFilter({ initialQuery = "", initialVisibility = "" }: { initialQuery?: string | undefined, initialVisibility?: string | undefined }) {
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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full bg-card p-2 rounded-xl border shadow-sm">
      <div className="relative w-full sm:max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isPending ? (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <Input
          type="text"
          placeholder="Filter functions by name or description..."
          className="pl-10 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      
      <div className="flex items-center gap-2 px-2 w-full sm:w-auto overflow-x-auto shrink-0 border-t sm:border-t-0 sm:border-l pt-3 sm:pt-0 sm:pl-3 border-border">
        <button
          type="button"
          onClick={() => setVisibility("")}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors border",
            visibility === "" 
              ? "bg-primary text-primary-foreground border-primary" 
              : "bg-transparent text-muted-foreground hover:bg-muted"
          )}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setVisibility("public")}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors border",
            visibility === "public" 
              ? "bg-emerald-500 text-white border-emerald-500" 
              : "bg-transparent text-muted-foreground hover:bg-muted"
          )}
        >
          Public
        </button>
        <button
          type="button"
          onClick={() => setVisibility("private")}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors border",
            visibility === "private" 
              ? "bg-slate-700 text-white border-slate-700" 
              : "bg-transparent text-muted-foreground hover:bg-muted"
          )}
        >
          Private
        </button>
      </div>
    </div>
  );
}
