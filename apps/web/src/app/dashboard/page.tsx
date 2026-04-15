import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireActiveOrg } from "@/lib/session";
import { getDashboardStats, getRecentExecutions } from "@/server/executions";
import { listFunctionsForOrg } from "@/server/functions";
import { formatDistanceToNow } from "date-fns";
import { Activity, AlertTriangle, Clock, ExternalLink, Layers, Settings } from "lucide-react";
import Link from "next/link";
import { CopyButton } from "./functions/copy-button";

export default async function DashboardPage() {
  const { orgId } = await requireActiveOrg();

  // Parallel fetch to optimize server rendering
  const [functions, stats, recentExecutions] = await Promise.all([
    listFunctionsForOrg(orgId),
    getDashboardStats(orgId),
    getRecentExecutions(orgId, 5),
  ]);

  const hasFunctions = functions.length > 0;

  return (
    <div className="animate-in space-y-8 fade-in duration-500">
      {/* High-Level Metrics */}
      <div>
        <h1 className="mb-2 font-display text-4xl tracking-tight text-[var(--color-bone)]">Dashboard Overview</h1>
        <p className="mb-6 max-w-2xl text-sm text-[var(--color-bone-muted)]">
          Monitor your function fleet, recent activity, and performance from one control surface.
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-[var(--color-border)] bg-[var(--color-ink-elevated)]/75 text-[var(--color-bone)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Functions</CardTitle>
              <Layers className="h-4 w-4 text-[var(--color-bone-faint)]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFunctions}</div>
              <p className="mt-1 text-xs text-[var(--color-bone-faint)]">Active deployments</p>
            </CardContent>
          </Card>

          <Card className="border-[var(--color-border)] bg-[var(--color-ink-elevated)]/75 text-[var(--color-bone)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Executions (All Time)</CardTitle>
              <Activity className="h-4 w-4 text-[var(--color-bone-faint)]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalExecutions.toLocaleString()}</div>
              <p className="mt-1 text-xs text-[var(--color-bone-faint)]">Total requests processed</p>
            </CardContent>
          </Card>

          <Card className="border-[var(--color-border)] bg-[var(--color-ink-elevated)]/75 text-[var(--color-bone)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Failures</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500/70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFailures.toLocaleString()}</div>
              <p className="mt-1 text-xs text-[var(--color-bone-faint)]">
                {stats.totalExecutions > 0
                  ? `${((stats.totalFailures / stats.totalExecutions) * 100).toFixed(2)}% error rate`
                  : "0% error rate"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-[var(--color-border)] bg-[var(--color-ink-elevated)]/75 text-[var(--color-bone)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Compute Time</CardTitle>
              <Clock className="h-4 w-4 text-[var(--color-bone-faint)]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalCpuMs > 1000
                  ? `${(stats.totalCpuMs / 1000).toFixed(1)}s`
                  : `${stats.totalCpuMs}ms`}
              </div>
              <p className="mt-1 text-xs text-[var(--color-bone-faint)]">Total CPU time billed</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {hasFunctions ? (
        <div className="space-y-6">
          {/* Your Functions Grid */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight">Your Functions</h2>
              <Link
                href="/dashboard/new"
                className="text-sm font-medium text-[var(--color-amber)] hover:underline"
              >
                Create new
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {functions.map((fn) => (
                <div
                  key={fn.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)] text-[var(--color-bone)] shadow-sm transition-all duration-300 hover:border-[var(--color-amber)]/40 hover:shadow-lg"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[var(--color-amber)]/30 bg-[var(--color-amber)]/10">
                          <Activity className="h-4 w-4 text-[var(--color-amber)]" />
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="font-mono text-sm font-semibold truncate" title={fn.slug}>
                            {fn.slug}
                          </h3>
                          <p className="whitespace-nowrap text-[10px] text-[var(--color-bone-faint)]">
                            Deployed {formatDistanceToNow(fn.updatedAt, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={fn.visibility === "public" ? "default" : "secondary"}
                        className="capitalize shadow-sm shrink-0 ml-2 text-[10px]"
                      >
                        {fn.visibility}
                      </Badge>
                    </div>
                    <p className="mt-1 h-10 line-clamp-2 text-sm text-[var(--color-bone-muted)]">
                      {fn.description || "No description provided."}
                    </p>
                  </div>

                  {/* Hover Actions Bar */}
                  <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-white/[0.02] p-2.5 transition-colors group-hover:bg-white/[0.04]">
                    <div className="flex items-center">
                      <CopyButton value={`https://${fn.slug}.hostfunc.com`} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-7 border-[var(--color-border)] bg-transparent px-2 text-[11px] shadow-sm"
                      >
                        <Link href={`/dashboard/${fn.id}/settings`}>
                          <Settings className="h-3 w-3 mr-1" />
                          Settings
                        </Link>
                      </Button>
                      <Button size="sm" asChild className="h-7 px-2 text-[11px] shadow-sm">
                        <Link href={`/dashboard/${fn.id}`}>
                          Open
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Executions Table */}
          <Card className="border-[var(--color-border)] bg-[var(--color-ink-elevated)]/75 text-[var(--color-bone)]">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription className="text-[var(--color-bone-muted)]">Latest executions across all your functions</CardDescription>
            </CardHeader>
            <CardContent>
              {recentExecutions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="border-b border-[var(--color-border)] bg-white/[0.03] text-xs uppercase text-[var(--color-bone-faint)]">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-md">Function</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Trigger</th>
                        <th className="px-4 py-3">Duration</th>
                        <th className="px-4 py-3 rounded-tr-md text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {recentExecutions.map((exec) => (
                        <tr key={exec.id} className="transition-colors hover:bg-white/[0.03]">
                          <td className="px-4 py-3 font-mono font-medium">
                            {exec.fnSlug ?? exec.fnId}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={exec.status === "ok" ? "default" : "destructive"}
                              className={
                                exec.status === "ok"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                                  : ""
                              }
                            >
                              {exec.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--color-bone-faint)]">
                            {exec.triggerKind}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{exec.wallMs}ms</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--color-bone-faint)]">
                            {formatDistanceToNow(exec.startedAt, { addSuffix: true })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-[var(--color-bone-muted)]">
                  <Activity className="h-8 w-8 mb-3 opacity-20" />
                  <p>No successful or failed executions recorded yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="mt-6 grid place-items-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-ink-elevated)]/60 py-24 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-amber)]/10">
            <Layers className="h-6 w-6 text-[var(--color-amber)]" />
          </div>
          <h2 className="text-2xl font-semibold text-[var(--color-bone)]">No functions yet</h2>
          <p className="mt-2 max-w-sm text-[var(--color-bone-muted)]">
            Create your first function to start processing events, running crons, and exploring the
            dashboard.
          </p>
          <Link
            href="/dashboard/new"
            className="mt-6 inline-flex items-center rounded-full bg-[var(--color-amber)] px-5 py-2 text-sm font-medium text-[var(--color-ink)] shadow transition-colors hover:bg-[var(--color-amber-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-amber)]"
          >
            Deploy New Function
          </Link>
        </div>
      )}
    </div>
  );
}
