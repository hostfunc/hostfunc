"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const STATUS_OPTIONS = [
  { value: "ok", label: "OK" },
  { value: "fn_error", label: "Errors" },
  { value: "limit_exceeded", label: "Limit" },
  { value: "infra_error", label: "Infra" },
] as const;

const TRIGGER_OPTIONS = [
  { value: "http", label: "HTTP" },
  { value: "cron", label: "Cron" },
  { value: "email", label: "Email" },
  { value: "mcp", label: "MCP" },
  { value: "fn_call", label: "Fn Call" },
] as const;

const LEVEL_OPTIONS = [
  { value: "debug", label: "Debug" },
  { value: "info", label: "Info" },
  { value: "warn", label: "Warn" },
  { value: "error", label: "Error" },
] as const;

const SEARCH_DEBOUNCE_MS = 350;

export function ExecutionsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  // Debounce the free-text search into the `q` URL param.
  useEffect(() => {
    const timer = setTimeout(() => {
      const current = searchParams.get("q") ?? "";
      const next = query.trim();
      if (next === current) return;
      const params = new URLSearchParams(searchParams);
      if (next) params.set("q", next);
      else params.delete("q");
      router.replace(`?${params.toString()}`, { scroll: false });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, router, searchParams]);

  const toggle = useCallback(
    (key: "status" | "trigger" | "level", value: string) => {
      const current = (searchParams.get(key) ?? "").split(",").filter(Boolean);
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      const params = new URLSearchParams(searchParams);
      if (next.length === 0) params.delete(key);
      else params.set(key, next.join(","));
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const isActive = (key: "status" | "trigger" | "level", value: string) =>
    (searchParams.get(key) ?? "").split(",").filter(Boolean).includes(value);

  const clear = () => {
    setQuery("");
    router.replace("?", { scroll: false });
  };
  const hasAny = Boolean(
    searchParams.get("status") ||
      searchParams.get("trigger") ||
      searchParams.get("level") ||
      searchParams.get("q") ||
      query.trim(),
  );

  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/65 p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-bone-faint)]" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search logs and errors…"
          aria-label="Search logs and errors"
          className="h-8 border-[var(--color-border)] bg-[var(--color-ink)] pl-9 text-xs text-[var(--color-bone)] placeholder:text-[var(--color-bone-faint)]"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-[var(--color-bone-faint)]">Status</span>
        {STATUS_OPTIONS.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            active={isActive("status", option.value)}
            onClick={() => toggle("status", option.value)}
          />
        ))}
        <div className="mx-1 h-4 w-px bg-border" />
        <span className="text-xs font-medium text-[var(--color-bone-faint)]">Trigger</span>
        {TRIGGER_OPTIONS.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            active={isActive("trigger", option.value)}
            onClick={() => toggle("trigger", option.value)}
          />
        ))}
        <div className="mx-1 h-4 w-px bg-border" />
        <span className="text-xs font-medium text-[var(--color-bone-faint)]">Log level</span>
        {LEVEL_OPTIONS.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            active={isActive("level", option.value)}
            onClick={() => toggle("level", option.value)}
          />
        ))}
        {hasAny ? (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 text-xs text-[var(--color-bone-muted)] hover:bg-white/[0.05] hover:text-[var(--color-bone)]"
            onClick={clear}
          >
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2 py-1 text-xs transition ${
        active
          ? "border-[var(--color-amber)]/50 bg-[var(--color-amber)]/12 text-[var(--color-bone)]"
          : "border-[var(--color-border)] bg-[var(--color-ink)] text-[var(--color-bone-muted)] hover:text-[var(--color-bone)]"
      }`}
    >
      {label}
    </button>
  );
}
