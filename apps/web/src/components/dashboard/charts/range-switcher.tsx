"use client";

import type { OverviewRange } from "@/server/dashboard-overview";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const OPTIONS: Array<{ value: OverviewRange; label: string }> = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
];

interface Props {
  current: OverviewRange;
}

export function RangeSwitcher({ current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function handleClick(value: OverviewRange) {
    if (value === current) return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (value === "7d") {
      params.delete("range");
    } else {
      params.set("range", value);
    }
    const qs = params.toString();
    const target = qs ? `${pathname}?${qs}` : (pathname ?? "/dashboard");
    startTransition(() => {
      router.push(target);
    });
  }

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-1 text-xs"
      role="tablist"
      aria-label="Time range"
    >
      {OPTIONS.map((option) => {
        const isActive = option.value === current;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={pending && isActive}
            onClick={() => handleClick(option.value)}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${
              isActive
                ? "bg-[var(--color-amber)] text-[var(--color-ink)] shadow-sm"
                : "text-[var(--color-bone-muted)] hover:bg-white/[0.05] hover:text-[var(--color-bone)]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
