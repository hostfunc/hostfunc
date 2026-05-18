"use client";

import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import {
  type IntegrationStatus,
  IntegrationStatusBadge,
} from "@/components/settings/integration-status-badge";
import { cn } from "@/lib/utils";

type IntegrationRowProps = {
  icon: ReactNode;
  title: string;
  description: string;
  helperText?: string | undefined;
  status: IntegrationStatus;
  statusLabel?: string | undefined;
  onClick: () => void;
  disabled?: boolean;
};

export function IntegrationRow({
  icon,
  title,
  description,
  helperText,
  status,
  statusLabel,
  onClick,
  disabled = false,
}: IntegrationRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group flex w-full items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/60 px-4 py-4 text-left transition",
        "hover:border-[var(--color-amber)]/35 hover:bg-white/[0.03]",
        "focus-visible:border-[var(--color-amber)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-amber)]/30",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-[var(--color-border)] disabled:hover:bg-[var(--color-ink-elevated)]/60",
      )}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-ink)]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-medium text-[var(--color-bone)]">
          {title}
        </span>
        <span className="mt-0.5 block truncate text-sm text-[var(--color-bone-muted)]">
          {description}
        </span>
        {helperText ? (
          <span className="mt-1 block truncate text-xs text-[var(--color-bone-faint)]">
            {helperText}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <IntegrationStatusBadge status={status} label={statusLabel} />
        <ChevronRight className="h-4 w-4 text-[var(--color-bone-faint)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-bone)]" />
      </span>
    </button>
  );
}
