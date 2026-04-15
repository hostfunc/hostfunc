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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* High-Level Metrics */}
      <div>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Dashboard Overview</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Functions</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFunctions}</div>
              <p className="text-xs text-muted-foreground mt-1">Active deployments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Executions (All Time)</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalExecutions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Total requests processed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Failures</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500/70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFailures.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalExecutions > 0
                  ? `${((stats.totalFailures / stats.totalExecutions) * 100).toFixed(2)}% error rate`
                  : "0% error rate"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Compute Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalCpuMs > 1000
                  ? `${(stats.totalCpuMs / 1000).toFixed(1)}s`
                  : `${stats.totalCpuMs}ms`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total CPU time billed</p>
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
                className="text-sm text-primary hover:underline font-medium"
              >
                Create new
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {functions.map((fn) => (
                <div
                  key={fn.id}
                  className="group relative rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/40 flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="font-mono text-sm font-semibold truncate" title={fn.slug}>
                            {fn.slug}
                          </h3>
                          <p className="text-[10px] text-muted-foreground whitespace-nowrap">
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
                    <p className="text-sm text-muted-foreground line-clamp-2 h-10 mt-1">
                      {fn.description || "No description provided."}
                    </p>
                  </div>

                  {/* Hover Actions Bar */}
                  <div className="border-t bg-muted/40 p-2.5 flex items-center justify-between transition-colors group-hover:bg-muted/80">
                    <div className="flex items-center">
                      <CopyButton value={`https://${fn.slug}.hostfunc.com`} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-7 px-2 text-[11px] shadow-sm bg-background border"
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
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest executions across all your functions</CardDescription>
            </CardHeader>
            <CardContent>
              {recentExecutions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-md">Function</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Trigger</th>
                        <th className="px-4 py-3">Duration</th>
                        <th className="px-4 py-3 rounded-tr-md text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {recentExecutions.map((exec) => (
                        <tr key={exec.id} className="hover:bg-muted/30 transition-colors">
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
                          <td className="px-4 py-3 text-muted-foreground uppercase text-xs tracking-wider">
                            {exec.triggerKind}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{exec.wallMs}ms</td>
                          <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(exec.startedAt, { addSuffix: true })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground flex flex-col items-center justify-center">
                  <Activity className="h-8 w-8 mb-3 opacity-20" />
                  <p>No successful or failed executions recorded yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid place-items-center rounded-xl border border-dashed py-24 text-center mt-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Layers className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold">No functions yet</h2>
          <p className="mt-2 text-muted-foreground max-w-sm">
            Create your first function to start processing events, running crons, and exploring the
            dashboard.
          </p>
          <Link
            href="/dashboard/new"
            className="mt-6 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Deploy New Function
          </Link>
        </div>
      )}
    </div>
  );
}
