import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireActiveOrg } from "@/lib/session";
import { listExecutions } from "@/server/executions";
import { getFunctionForOrg } from "@/server/functions";
import { ArrowRight, CheckCircle2, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExecutionsFilters } from "../../executions/executions-filters";

interface SearchParams {
  status?: string;
  trigger?: string;
  from?: string;
  to?: string;
}

export default async function FunctionSettingsExecutionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ fn: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { orgId } = await requireActiveOrg();
  const { fn: fnId } = await params;
  const search = await searchParams;
  const fn = await getFunctionForOrg(orgId, fnId);
  if (!fn) notFound();

  const filters: {
    fnId: string;
    status?: Array<"ok" | "fn_error" | "limit_exceeded" | "infra_error">;
    triggerKind?: Array<"http" | "cron" | "email" | "mcp" | "fn_call">;
    from?: string;
    to?: string;
  } = { fnId };
  if (search.status) {
    filters.status = search.status.split(",") as Array<
      "ok" | "fn_error" | "limit_exceeded" | "infra_error"
    >;
  }
  if (search.trigger) {
    filters.triggerKind = search.trigger.split(",") as Array<
      "http" | "cron" | "email" | "mcp" | "fn_call"
    >;
  }
  if (search.from) filters.from = search.from;
  if (search.to) filters.to = search.to;

  const { items } = await listExecutions({
    orgId,
    filters,
    limit: 12,
  });

  return (
    <div className="animate-in space-y-8 fade-in duration-500 pb-10">
      <div className="flex flex-col justify-between gap-6 border-b border-[var(--color-border)] pb-6 md:flex-row md:items-center">
        <div>
          <h3 className="font-display text-4xl tracking-tight text-[var(--color-bone)]">Executions</h3>
          <p className="mt-2 max-w-xl leading-relaxed text-[var(--color-bone-muted)]">
            Review recent runs without leaving function settings.
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
        >
          <Link href={`/dashboard/${fnId}/executions`}>
            View full executions
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <ExecutionsFilters />

      {items.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-ink-elevated)]/45 py-16 text-center">
          <h3 className="text-base font-medium text-[var(--color-bone)]">No executions match these filters</h3>
          <p className="mt-1 text-sm text-[var(--color-bone-muted)]">
            Try removing one or more filters to see recent activity.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 shadow-xl">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-left text-xs uppercase text-[var(--color-bone-faint)]">
              <tr>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Trigger</th>
                <th className="px-4 py-2 font-medium">Duration</th>
                <th className="px-4 py-2 font-medium">Started</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((exec) => (
                <tr key={exec.id} className="border-t border-[var(--color-border)] transition hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <StatusBadge status={exec.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--color-bone-faint)]">{exec.triggerKind}</td>
                  <td className="px-4 py-3 tabular-nums">
                    <div className="flex items-center gap-2">
                      <Clock className="size-3 text-[var(--color-bone-faint)]" />
                      {formatDuration(exec.wallMs)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-bone-faint)]">{formatRelative(exec.startedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/${fnId}/executions/${exec.id}`}
                      className="inline-flex items-center gap-1 text-xs text-[var(--color-bone-muted)] transition hover:text-[var(--color-bone)]"
                    >
                      Details <ArrowRight className="size-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "ok":
      return (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="size-3 text-green-500" />
          ok
        </Badge>
      );
    case "fn_error":
      return (
        <Badge variant="secondary" className="gap-1">
          <XCircle className="size-3 text-red-500" />
          error
        </Badge>
      );
    case "limit_exceeded":
      return <Badge variant="destructive">limit</Badge>;
    case "infra_error":
      return <Badge variant="destructive">infra</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return date.toLocaleString();
}
