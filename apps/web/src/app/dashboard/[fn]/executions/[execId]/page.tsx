import { LiveLogs } from "@/components/logs/live-logs";
import { LogViewer, type LogViewerLine } from "@/components/logs/log-viewer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireActiveOrg } from "@/lib/session";
import { cn } from "@/lib/utils";
import { getChildExecutions, getExecution, listLogsForExecution } from "@/server/executions";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ExecutionDetailPage({
  params,
}: {
  params: Promise<{ fn: string; execId: string }>;
}) {
  const { orgId } = await requireActiveOrg();
  const { execId } = await params;
  const execution = await getExecution(orgId, execId);
  if (!execution) notFound();
  const [logs, children] = await Promise.all([
    listLogsForExecution(orgId, execId),
    getChildExecutions(orgId, execId),
  ]);

  const serializedLogs: LogViewerLine[] = logs.map((line) => ({
    ts: line.ts.toISOString(),
    level: line.level,
    message: line.message,
    fields: line.fields,
  }));

  // The ingest pipeline writes symbolicated stacks as a log line with a `stack` field.
  const stack = findStack(logs);
  const parentWindowMs = Math.max(execution.wallMs, 1);

  return (
    <div className="space-y-4">
      <Card className="border-[var(--color-border)] bg-[var(--color-ink-elevated)]/65 text-[var(--color-bone)]">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="font-mono text-sm">{execution.id}</span>
            <Badge variant={execution.status === "ok" ? "secondary" : "destructive"}>
              {execution.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <div>Function: {execution.fnSlug}</div>
          <div>Trigger: {execution.triggerKind}</div>
          <div>Wall: {execution.wallMs}ms</div>
          <div>CPU: {execution.cpuMs}ms</div>
          <div>Memory peak: {execution.memoryPeakMb}MB</div>
          <div>Egress: {execution.egressBytes} bytes</div>
          <div>Subrequests: {execution.subrequestCount}</div>
          <div>Call depth: {execution.callDepth}</div>
          <div>Started: {execution.startedAt.toLocaleString()}</div>
          <div>Ended: {execution.endedAt ? execution.endedAt.toLocaleString() : "running"}</div>
        </CardContent>
      </Card>

      {execution.errorMessage || stack ? (
        <Card className="border-red-500/40 bg-red-500/10 text-[var(--color-bone)]">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-mono text-xs text-red-300">{execution.errorCode ?? "FN_THREW"}</p>
            {execution.errorMessage ? <p className="font-mono">{execution.errorMessage}</p> : null}
            {stack ? (
              <details open={stack.split("\n").length <= 8}>
                <summary className="cursor-pointer select-none text-xs text-[var(--color-bone-muted)] hover:text-[var(--color-bone)]">
                  Stack trace
                </summary>
                <pre className="mt-2 overflow-x-auto rounded border border-red-500/30 bg-black/40 p-3 font-mono text-xs leading-relaxed text-red-100/90">
                  {stack}
                </pre>
              </details>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {children.length > 0 ? (
        <Card className="border-[var(--color-border)] bg-[var(--color-ink-elevated)]/65 text-[var(--color-bone)]">
          <CardHeader>
            <CardTitle>Child executions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {children.map((child) => {
              const rawOffset =
                ((child.startedAt.getTime() - execution.startedAt.getTime()) / parentWindowMs) *
                100;
              const offsetPct = Math.min(Math.max(rawOffset, 0), 99);
              const rawWidth = (child.wallMs / parentWindowMs) * 100;
              const widthPct = Math.min(Math.max(rawWidth, 1), 100 - offsetPct);
              return (
                <div
                  key={child.id}
                  className="grid items-center gap-2 md:grid-cols-[minmax(0,260px)_1fr] md:gap-4"
                >
                  <div className="flex min-w-0 items-center gap-2 text-xs">
                    <span
                      className={cn("size-2 shrink-0 rounded-full", statusDotClass(child.status))}
                    />
                    <Link
                      href={`/dashboard/${child.fnId}/executions/${child.id}`}
                      className="truncate font-mono text-[var(--color-bone)] transition hover:underline"
                    >
                      {child.fnSlug}
                    </Link>
                    <span className="ml-auto shrink-0 tabular-nums text-[var(--color-bone-faint)]">
                      {formatDuration(child.wallMs)}
                    </span>
                  </div>
                  <div className="relative h-4 overflow-hidden rounded bg-black/25">
                    <div
                      className={cn(
                        "absolute inset-y-0.5 rounded-sm",
                        statusBarClass(child.status),
                      )}
                      style={{ left: `${offsetPct}%`, width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-[var(--color-border)] bg-[var(--color-ink-elevated)]/65 text-[var(--color-bone)]">
        <CardHeader>
          <CardTitle>Logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <LogViewer logs={serializedLogs} executionId={execution.id} />
          <LiveLogs execId={execution.id} />
        </CardContent>
      </Card>
    </div>
  );
}

function findStack(logs: Array<{ fields: Record<string, unknown> | null }>): string | null {
  for (const line of logs) {
    const candidate = line.fields?.stack;
    if (typeof candidate === "string" && candidate.length > 0) return candidate;
  }
  return null;
}

function statusDotClass(status: string): string {
  switch (status) {
    case "ok":
      return "bg-emerald-400";
    case "limit_exceeded":
      return "bg-amber-400";
    default:
      return "bg-red-400";
  }
}

function statusBarClass(status: string): string {
  switch (status) {
    case "ok":
      return "bg-emerald-400/70";
    case "limit_exceeded":
      return "bg-amber-400/70";
    default:
      return "bg-red-400/70";
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}
