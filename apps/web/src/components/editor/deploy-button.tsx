"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deployFunction } from "@/app/dashboard/[fn]/actions";
import { Button } from "@/components/ui/button";

type DeployState =
  | { phase: "idle" }
  | { phase: "saving" }
  | { phase: "bundling" }
  | { phase: "uploading" }
  | { phase: "propagating" }
  | { phase: "live"; versionId: string }
  | { phase: "failed"; reason: string };

export function DeployButton({ fnId, onDeploy }: { fnId: string; onDeploy: () => Promise<void> }) {
  const [state, setState] = useState<DeployState>({ phase: "idle" });

  async function handleClick() {
    try {
      setState({ phase: "saving" });
      await onDeploy();

      // Fake the rest of the state machine for v0
      setState({ phase: "bundling" });
      await wait(300);
      setState({ phase: "uploading" });
      const result = await deployFunction(fnId);
      setState({ phase: "propagating" });
      await wait(300);
      setState({ phase: "live", versionId: result.versionId });
      toast.success("Deployed", {
        description: `Version ${result.versionId.slice(0, 12)}`,
      });
      setTimeout(() => setState({ phase: "idle" }), 2000);
    } catch (e) {
      const reason = e instanceof Error ? e.message : "unknown error";
      setState({ phase: "failed", reason });
      toast.error("Deploy failed", { description: reason });
    }
  }

  const busy =
    state.phase !== "idle" && state.phase !== "live" && state.phase !== "failed";

  return (
    <Button onClick={handleClick} disabled={busy}>
      {labelFor(state)}
    </Button>
  );
}

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
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