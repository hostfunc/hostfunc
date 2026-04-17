"use client";

import { getFunctionRunUrl, inferRunPayload, runFunctionNow } from "@/app/dashboard/[fn]/actions";
import { Button } from "@/components/ui/button";
import { isQuotaLimitError, openUpgradeModal } from "@/lib/upgrade-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Copy, Loader2, Play, TerminalSquare } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const DEFAULT_PAYLOAD_JSON = "{\n  \n}";

export function RunButton({ fnId, currentCode }: { fnId: string; currentCode: string }) {
  const [open, setOpen] = useState(false);
  const [runUrl, setRunUrl] = useState<string>("");
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [payloadJson, setPayloadJson] = useState(DEFAULT_PAYLOAD_JSON);
  const [prefillSource, setPrefillSource] = useState<"static" | "ai_fallback" | "default" | null>(null);
  const [prefillReason, setPrefillReason] = useState<string | null>(null);
  const [isPayloadTouched, setIsPayloadTouched] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    status: number;
    executionId: string | null;
    wallMs: string | null;
    bodyText: string;
    bodyJson: unknown;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    if (runUrl) return;
    void (async () => {
      try {
        setLoadingUrl(true);
        const url = await getFunctionRunUrl(fnId);
        setRunUrl(url);
      } catch (error) {
        const message = error instanceof Error ? error.message : "failed_to_load_run_url";
        toast.error("Failed to load run URL", { description: message });
      } finally {
        setLoadingUrl(false);
      }
    })();
  }, [open, runUrl, fnId]);

  useEffect(() => {
    if (!open) return;
    const untouched =
      !isPayloadTouched &&
      (payloadJson.trim().length === 0 || payloadJson.trim() === DEFAULT_PAYLOAD_JSON.trim());
    if (!untouched) return;
    void (async () => {
      try {
        const inferred = await inferRunPayload({
          fnId,
          code: currentCode,
        });
        setPayloadJson(inferred.payloadJson || "{}");
        setPrefillSource(inferred.source);
        setPrefillReason(inferred.reason ?? null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "payload_inference_failed";
        setPrefillSource("default");
        setPrefillReason(message);
      }
    })();
  }, [open, fnId, currentCode, isPayloadTouched, payloadJson]);

  const formattedResult = useMemo(() => {
    if (!result) return "";
    if (result.bodyJson != null) {
      return JSON.stringify(result.bodyJson, null, 2);
    }
    return result.bodyText || "(empty response)";
  }, [result]);

  const handleRun = async () => {
    try {
      setIsRunning(true);
      const response = await runFunctionNow({ fnId, payloadJson });
      setRunUrl(response.runUrl);
      setResult({
        ok: response.ok,
        status: response.status,
        executionId: response.executionId ?? null,
        wallMs: response.wallMs ?? null,
        bodyText: response.bodyText,
        bodyJson: response.bodyJson,
      });
      if (response.ok) {
        toast.success("Function run completed");
      } else {
        if (isQuotaLimitError(response.bodyText)) {
          openUpgradeModal();
        }
        toast.error(`Run failed (${response.status})`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "run_failed";
      if (isQuotaLimitError(message)) {
        openUpgradeModal();
      }
      toast.error("Run failed", { description: message });
      setResult({
        ok: false,
        status: 0,
        executionId: null,
        wallMs: null,
        bodyText: message,
        bodyJson: null,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-8 border-sky-500/35 bg-sky-500/12 text-sky-100 hover:bg-sky-500/22"
        >
          <Play className="size-4" />
          Run
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden border-[var(--color-border)] bg-[var(--color-ink-elevated)] text-[var(--color-bone)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TerminalSquare className="size-4 text-cyan-300" />
            Run Function
          </DialogTitle>
          <DialogDescription className="text-[var(--color-bone-muted)]">
            Execute the deployed function with custom JSON input and inspect the response.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-[var(--color-bone-faint)]">Run URL</p>
            <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-black/20 px-3 py-2">
              <code className="flex-1 overflow-x-auto text-xs text-cyan-200">
                {loadingUrl ? "Loading..." : runUrl || "Unavailable"}
              </code>
              <button
                type="button"
                disabled={!runUrl}
                onClick={async () => {
                  if (!runUrl) return;
                  await navigator.clipboard.writeText(runUrl);
                  toast.success("Run URL copied");
                }}
                className="rounded border border-[var(--color-border)] p-1 text-[var(--color-bone-muted)] transition hover:text-[var(--color-bone)] disabled:opacity-40"
                title="Copy run URL"
              >
                <Copy className="size-3" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-wider text-[var(--color-bone-faint)]">JSON Payload</p>
              {prefillSource ? (
                <span className="rounded-full border border-[var(--color-border)] bg-black/20 px-2 py-0.5 text-[10px] text-[var(--color-bone-muted)]">
                  Prefilled: {prefillSource === "ai_fallback" ? "AI" : prefillSource}
                </span>
              ) : null}
            </div>
            <textarea
              value={payloadJson}
              onChange={(event) => {
                setPayloadJson(event.target.value);
                setIsPayloadTouched(true);
              }}
              className="min-h-44 w-full resize-y rounded-md border border-[var(--color-border)] bg-black/25 p-3 font-mono text-xs text-[var(--color-bone)] outline-none focus:ring-2 focus:ring-cyan-500/40"
              spellCheck={false}
            />
            {prefillReason ? (
              <p className="text-[10px] text-[var(--color-bone-faint)]">
                Inference note: {prefillReason}
              </p>
            ) : null}
          </div>

          {result ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`rounded-full border px-2 py-0.5 ${
                    result.ok
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200"
                      : "border-red-500/50 bg-red-500/15 text-red-200"
                  }`}
                >
                  {result.ok ? "Success" : "Failed"} ({result.status})
                </span>
                {result.executionId ? (
                  <span className="rounded-full border border-[var(--color-border)] bg-black/20 px-2 py-0.5 text-[var(--color-bone-muted)]">
                    exec: {result.executionId}
                  </span>
                ) : null}
                {result.wallMs ? (
                  <span className="rounded-full border border-[var(--color-border)] bg-black/20 px-2 py-0.5 text-[var(--color-bone-muted)]">
                    wall: {result.wallMs}ms
                  </span>
                ) : null}
              </div>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border border-[var(--color-border)] bg-black/30 p-3 text-xs text-[var(--color-bone)]">
                {formattedResult}
              </pre>
            </div>
          ) : null}
        </div>

        <DialogFooter className="sm:justify-between">
          <p className="text-xs text-[var(--color-bone-faint)]">
            Tip: Deploy latest code first so run output matches current editor intent.
          </p>
          <Button
            type="button"
            onClick={() => void handleRun()}
            disabled={isRunning}
            className="bg-cyan-500 text-black hover:bg-cyan-400"
          >
            {isRunning ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="size-4" />
                Run Now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
