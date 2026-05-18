"use client";

import { Button } from "@/components/ui/button";
import { KeyRound, ShieldAlert, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export function DeployedSecretsBanner({ fnId }: { fnId: string }) {
  const storageKey = useMemo(() => `hostfunc:secrets-banner:dismissed:${fnId}`, [fnId]);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(storageKey) === "1");
    } catch {
      setDismissed(false);
    }
  }, [storageKey]);

  if (dismissed) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // ignore storage errors
    }
    setDismissed(true);
  };

  return (
    <div className="mb-4 rounded-2xl border border-amber-500/35 bg-gradient-to-r from-amber-500/15 to-amber-500/5 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-300" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-amber-100">
            This function is deployed — keep secrets out of the source.
          </p>
          <p className="mt-1 text-sm leading-relaxed text-amber-100/80">
            Your code is bundled to the edge on every deploy. Don't hardcode API keys or tokens —
            store them as Environment Variables and read them from{" "}
            <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-[11px] text-amber-100">
              env
            </code>{" "}
            at runtime.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-8 border-amber-400/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25"
          >
            <Link href={`/dashboard/${fnId}/settings/secrets`}>
              <KeyRound className="mr-1.5 size-3.5" />
              Manage secrets
            </Link>
          </Button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss secrets reminder"
            className="rounded-md p-1 text-amber-200/70 transition-colors hover:bg-black/20 hover:text-amber-100"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
