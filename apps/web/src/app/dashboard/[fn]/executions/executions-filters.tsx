"use client";

import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

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

export function ExecutionsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const toggle = useCallback(
    (key: "status" | "trigger", value: string) => {
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

  const isActive = (key: "status" | "trigger", value: string) =>
    (searchParams.get(key) ?? "").split(",").filter(Boolean).includes(value);

  const clear = () => router.replace("?", { scroll: false });
  const hasAny = Boolean(searchParams.get("status") || searchParams.get("trigger"));

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/65 p-3">
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
      {hasAny ? (
        <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs text-[var(--color-bone-muted)] hover:bg-white/[0.05] hover:text-[var(--color-bone)]" onClick={clear}>
          Clear
        </Button>
      ) : null}
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
