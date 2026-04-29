"use client";

import { Button } from "@/components/ui/button";
import { GitFork, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface FunctionActionsProps {
  fnId: string;
  initialStarred: boolean;
  initialStarCount: number;
  signedIn: boolean;
  compact?: boolean;
}

export function FunctionActions({
  fnId,
  initialStarred,
  initialStarCount,
  signedIn,
  compact = false,
}: FunctionActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [starred, setStarred] = useState(initialStarred);
  const [starCount, setStarCount] = useState(initialStarCount);

  function requireLogin() {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent("/marketplace")}`);
      return false;
    }
    return true;
  }

  function toggleStar() {
    if (!requireLogin()) return;
    const next = !starred;
    setStarred(next);
    setStarCount((count) => Math.max(0, count + (next ? 1 : -1)));
    startTransition(async () => {
      const response = await fetch(`/api/functions/${fnId}/star`, {
        method: next ? "POST" : "DELETE",
      });
      if (!response.ok) {
        setStarred(!next);
        setStarCount((count) => Math.max(0, count + (next ? -1 : 1)));
      } else {
        router.refresh();
      }
    });
  }

  function forkFunction() {
    if (!requireLogin()) return;
    startTransition(async () => {
      const response = await fetch(`/api/functions/${fnId}/fork`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) return;
      const result = (await response.json()) as { href?: string };
      if (result.href) router.push(result.href);
    });
  }

  return (
    <div className={`flex ${compact ? "gap-2" : "gap-3"}`}>
      <Button
        type="button"
        variant="ghost"
        size={compact ? "sm" : "default"}
        disabled={isPending}
        onClick={toggleStar}
        className="rounded-full border border-[var(--color-border)] bg-white/[0.03] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
      >
        <Star className={starred ? "fill-[var(--color-amber)] text-[var(--color-amber)]" : ""} />
        {starCount}
      </Button>
      <Button
        type="button"
        size={compact ? "sm" : "default"}
        disabled={isPending}
        onClick={forkFunction}
        className="rounded-full bg-[var(--color-amber)] text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
      >
        <GitFork />
        Fork
      </Button>
    </div>
  );
}
