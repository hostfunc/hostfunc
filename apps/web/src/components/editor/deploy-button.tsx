"use client";

import { deployFunction } from "@/app/dashboard/[fn]/actions";
import { Button } from "@/components/ui/button";
import { isQuotaLimitError, openUpgradeModal } from "@/lib/upgrade-modal";
import { Cloud, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type DeployState =
  | { phase: "idle" }
  | { phase: "saving" }
  | { phase: "bundling" }
  | { phase: "uploading" }
  | { phase: "propagating" }
  | { phase: "live"; versionId: string; runUrl: string }
  | { phase: "failed"; reason: string };

export function DeployButton({ fnId, onDeploy }: { fnId: string; onDeploy: () => Promise<void> }) {
  const [state, setState] = useState<DeployState>({ phase: "idle" });

  async function handleClick() {
    try {
      setState({ phase: "saving" });
      await onDeploy();

      setState({ phase: "bundling" });
      await wait(150);
      setState({ phase: "uploading" });
      const result = await deployFunction(fnId);
      setState({ phase: "propagating" });
      await wait(300);
      setState({
        phase: "live",
        versionId: result.versionId,
        runUrl: result.runUrl,
      });
      toast.success("Deployed", {
        description: result.versionId.slice(0, 16),
      });
    } catch (e) {
      const reason = e instanceof Error ? e.message : "unknown error";
      if (isQuotaLimitError(reason)) {
        openUpgradeModal();
      }
      setState({ phase: "failed", reason });
      toast.error("Deploy failed", { description: reason });
    }
  }

  const busy = state.phase !== "idle" && state.phase !== "live" && state.phase !== "failed";
  const toneClass =
    state.phase === "failed"
      ? "h-8 border-red-500/40 bg-red-500/12 text-red-100 hover:bg-red-500/22"
      : busy
        ? "h-8 border-amber-500/40 bg-amber-500/12 text-amber-100 hover:bg-amber-500/22"
        : "h-8 border-emerald-500/40 bg-emerald-500/12 text-emerald-100 hover:bg-emerald-500/22";

  return (
    <div className="flex items-center gap-2">
      {state.phase === "live" && (
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(state.runUrl);
            toast.success("URL copied");
          }}
          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 font-mono text-xs text-muted-foreground transition hover:text-foreground"
          title={state.runUrl}
        >
          <Copy className="size-3" />
          {truncateUrl(state.runUrl)}
        </button>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={handleClick}
        disabled={busy}
        className={toneClass}
      >
        <Cloud className="mr-2 size-4" />
        {labelFor(state)}
      </Button>
    </div>
  );
}

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function truncateUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname.length > 30 ? `${u.pathname.slice(0, 27)}…` : u.pathname}`;
  } catch {
    return url;
  }
}

function labelFor(state: DeployState): string {
  switch (state.phase) {
    case "idle":
      return "Deploy";
    case "saving":
      return "Saving…";
    case "bundling":
      return "Bundling…";
    case "uploading":
      return "Uploading…";
    case "propagating":
      return "Going live…";
    case "live":
      return "Deployed ✓";
    case "failed":
      return "Retry deploy";
  }
}
