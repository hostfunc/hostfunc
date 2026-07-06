import { ActivityHeatmap } from "@/components/dashboard/charts/activity-heatmap";
import { ExecutionsAreaChart } from "@/components/dashboard/charts/executions-area-chart";
import { HourlyMiniBar } from "@/components/dashboard/charts/hourly-mini-bar";
import { LatencyBandChart } from "@/components/dashboard/charts/latency-band-chart";
import { MetricCard } from "@/components/dashboard/charts/metric-card";
import { RangeSwitcher } from "@/components/dashboard/charts/range-switcher";
import { StatusRadialChart } from "@/components/dashboard/charts/status-radial-chart";
import { TopFunctionsBar } from "@/components/dashboard/charts/top-functions-bar";
import { TriggerDonutChart } from "@/components/dashboard/charts/trigger-donut-chart";
import { GettingStartedChecklist } from "@/components/dashboard/getting-started-checklist";
import { FunctionLogo } from "@/components/function/function-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireActiveOrg } from "@/lib/session";
import { type OverviewRange, getDashboardOverview } from "@/server/dashboard-overview";
import { getRecentExecutions } from "@/server/executions";
import { listFunctionsForOrg } from "@/server/functions";
import { getOnboardingState } from "@/server/onboarding";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Gauge,
  Layers,
  PieChart,
  Save,
  Settings,
  Timer,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { CopyButton } from "./functions/copy-button";

export const dynamic = "force-dynamic";

const RANGE_LABELS: Record<OverviewRange, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

function isOverviewRange(value: unknown): value is OverviewRange {
  return value === "24h" || value === "7d" || value === "30d";
}

function formatMs(value: number): string {
  if (value <= 0) return "0 ms";
  if (value >= 1000) return `${(value / 1000).toFixed(2)} s`;
  return `${Math.round(value)} ms`;
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  const pct = value * 100;
  if (pct === 0) return "0%";
  if (pct < 1) return `${pct.toFixed(2)}%`;
  return `${pct.toFixed(1)}%`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgId } = await requireActiveOrg();
  const params = (await searchParams) ?? {};
  const rawRange = typeof params.range === "string" ? params.range : undefined;
  const range: OverviewRange = isOverviewRange(rawRange) ? rawRange : "7d";

  const [functions, overview, recentExecutions, onboarding] = await Promise.all([
    listFunctionsForOrg(orgId),
    getDashboardOverview(orgId, range),
    getRecentExecutions(orgId, 5),
    getOnboardingState(orgId),
  ]);

  const recentFunctions = functions.slice(0, 6);
  const hasFunctions = recentFunctions.length > 0;
  const hasActivity = overview.metrics.totalExecutions > 0;

  const seriesTotals = overview.series.map((point) => point.total);
  const seriesP95 = overview.series.map((point) => point.p95WallMs);
  const seriesErrorRate = overview.series.map((point) =>
    point.total > 0 ? (point.errors / point.total) * 100 : 0,
  );
  const seriesActivityPulse = overview.series.map((point) => (point.total > 0 ? point.total : 0));

  const prevErrorRate =
    overview.metrics.prevTotalExecutions > 0
      ? overview.metrics.prevTotalErrors / overview.metrics.prevTotalExecutions
      : 0;

  return (
    <div className="animate-in space-y-8 fade-in duration-500">
      {!onboarding.complete && <GettingStartedChecklist state={onboarding} />}

      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          {/* <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[var(--color-amber)]">
            <Sparkles className="size-3.5" />
            Overview
          </div> */}
          <h1 className="mt-2 font-display text-4xl tracking-tight text-[var(--color-bone)]">
            Dashboard Overview
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-bone-muted)]">
            {RANGE_LABELS[range]} · live signals across your function fleet, latency profile, and
            error trends.
          </p>
        </div>
        <RangeSwitcher current={range} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Executions"
          icon={<Zap className="size-4" />}
          value={overview.metrics.totalExecutions.toLocaleString()}
          hint={`vs prev ${overview.metrics.prevTotalExecutions.toLocaleString()}`}
          current={overview.metrics.totalExecutions}
          previous={overview.metrics.prevTotalExecutions}
          data={seriesTotals}
          spark="area"
          tone="amber"
        />
        <MetricCard
          label="Error rate"
          icon={<AlertTriangle className="size-4" />}
          value={formatPercent(overview.metrics.errorRate)}
          hint={`prev ${formatPercent(prevErrorRate)}`}
          current={overview.metrics.errorRate}
          previous={prevErrorRate}
          lowerIsBetter
          data={seriesErrorRate}
          spark="line"
          tone="error"
        />
        <MetricCard
          label="p95 latency"
          icon={<Timer className="size-4" />}
          value={formatMs(overview.metrics.p95WallMs)}
          hint={`prev ${formatMs(overview.metrics.prevP95WallMs)}`}
          current={overview.metrics.p95WallMs}
          previous={overview.metrics.prevP95WallMs}
          lowerIsBetter
          data={seriesP95}
          spark="bar"
          tone="cool"
        />
        <MetricCard
          label="Active functions"
          icon={<Activity className="size-4" />}
          value={overview.metrics.activeFunctions.toLocaleString()}
          hint={`prev ${overview.metrics.prevActiveFunctions.toLocaleString()}`}
          current={overview.metrics.activeFunctions}
          previous={overview.metrics.prevActiveFunctions}
          data={seriesActivityPulse}
          spark="dots"
          tone="ok"
        />
      </div>

      {hasActivity ? (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-[var(--color-border)] bg-[var(--color-ink-elevated)]/75 text-[var(--color-bone)]">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Execution trend</CardTitle>
                  <CardDescription className="text-[var(--color-bone-muted)]">
                    Successful runs vs errors per {overview.bucketKind}.
                  </CardDescription>
                </div>
                <Gauge className="size-4 text-[var(--color-bone-faint)]" />
              </CardHeader>
              <CardContent>
                <ExecutionsAreaChart data={overview.series} bucketKind={overview.bucketKind} />
              </CardContent>
            </Card>

            <Card className="border-[var(--color-border)] bg-[var(--color-ink-elevated)]/75 text-[var(--color-bone)]">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Latency band</CardTitle>
                  <CardDescription className="text-[var(--color-bone-muted)]">
                    p50 → p95 wall time across the window.
                  </CardDescription>
                </div>
                <Timer className="size-4 text-[var(--color-bone-faint)]" />
              </CardHeader>
              <CardContent>
                <LatencyBandChart data={overview.series} bucketKind={overview.bucketKind} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-[var(--color-border)] bg-[var(--color-ink-elevated)]/75 text-[var(--color-bone)]">
              <CardHeader className="pb-3">
                <CardTitle>Trigger mix</CardTitle>
                <CardDescription className="text-[var(--color-bone-muted)]">
                  How requests are entering your functions.
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-8">
                {overview.triggerBreakdown.length > 0 ? (
                  <TriggerDonutChart data={overview.triggerBreakdown} />
                ) : (
                  <div className="flex h-44 items-center justify-center text-sm text-[var(--color-bone-muted)]">
                    No trigger activity yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-[var(--color-border)] bg-[var(--color-ink-elevated)]/75 text-[var(--color-bone)]">
              <CardHeader className="pb-3">
                <CardTitle>Status mix</CardTitle>
                <CardDescription className="text-[var(--color-bone-muted)]">
                  Outcomes broken down by execution status.
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-8">
                <StatusRadialChart data={overview.statusMix} />
              </CardContent>
            </Card>

            <Card className="border-[var(--color-border)] bg-[var(--color-ink-elevated)]/75 text-[var(--color-bone)]">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>
                    {range === "24h" ? "Hourly executions" : "Activity heatmap"}
                  </CardTitle>
                  <CardDescription className="text-[var(--color-bone-muted)]">
                    {range === "24h" ? "Volume by hour of day." : "Volume by day of week × hour."}
                  </CardDescription>
                </div>
                <PieChart className="size-4 text-[var(--color-bone-faint)]" />
              </CardHeader>
              <CardContent>
                {range === "24h" ? (
                  <HourlyMiniBar data={overview.series} />
                ) : (
                  <ActivityHeatmap data={overview.heatmap} />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-[var(--color-border)] bg-[var(--color-ink-elevated)]/75 text-[var(--color-bone)]">
              <CardHeader className="pb-3">
                <CardTitle>Top functions</CardTitle>
                <CardDescription className="text-[var(--color-bone-muted)]">
                  Most-invoked functions in this window.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {overview.topFunctions.length > 0 ? (
                  <>
                    <TopFunctionsBar data={overview.topFunctions} />
                    <ul className="mt-3 space-y-1.5">
                      {overview.topFunctions.map((fn) => (
                        <li key={fn.fnId}>
                          <Link
                            href={`/dashboard/${fn.fnId}`}
                            className="flex items-center justify-between rounded-md px-2 py-1 text-xs text-[var(--color-bone-muted)] transition-colors hover:bg-white/[0.04] hover:text-[var(--color-bone)]"
                          >
                            <span className="truncate font-mono">{fn.fnSlug}</span>
                            <span className="ml-3 flex items-center gap-3 text-[var(--color-bone-faint)]">
                              <span>{fn.total.toLocaleString()} runs</span>
                              <span>{formatMs(fn.p95WallMs)} p95</span>
                              <ArrowRight className="size-3" />
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="flex h-48 items-center justify-center text-sm text-[var(--color-bone-muted)]">
                    No function activity yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-[var(--color-border)] bg-[var(--color-ink-elevated)]/75 text-[var(--color-bone)]">
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription className="text-[var(--color-bone-muted)]">
                  Latest executions across all your functions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentExecutions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-[var(--color-border)] bg-white/[0.03] text-xs uppercase text-[var(--color-bone-faint)]">
                        <tr>
                          <th className="rounded-tl-md px-4 py-3">Function</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="hidden px-4 py-3 sm:table-cell">Trigger</th>
                          <th className="px-4 py-3">Duration</th>
                          <th className="rounded-tr-md px-4 py-3 text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {recentExecutions.map((exec) => (
                          <tr key={exec.id} className="transition-colors hover:bg-white/[0.03]">
                            <td className="px-4 py-3 font-mono font-medium">
                              <Link
                                href={`/dashboard/${exec.fnId}/executions/${exec.id}`}
                                className="block truncate"
                                title={exec.fnSlug ?? exec.fnId}
                              >
                                {exec.fnSlug ?? exec.fnId}
                              </Link>
                            </td>
                            <td className="px-4 py-3">
                              <Link
                                href={`/dashboard/${exec.fnId}/executions/${exec.id}`}
                                className="block"
                              >
                                <Badge
                                  variant={exec.status === "ok" ? "default" : "destructive"}
                                  className={
                                    exec.status === "ok"
                                      ? "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                                      : exec.status === "fn_error"
                                        ? "bg-red-500/10 text-red-300 hover:bg-red-500/20"
                                        : ""
                                  }
                                >
                                  {exec.status === "fn_error" ? "error" : exec.status}
                                </Badge>
                              </Link>
                            </td>
                            <td className="hidden px-4 py-3 text-xs uppercase tracking-wider text-[var(--color-bone-faint)] sm:table-cell">
                              <Link
                                href={`/dashboard/${exec.fnId}/executions/${exec.id}`}
                                className="block"
                              >
                                <span className="inline-flex items-center rounded-full border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 font-medium text-[10px] text-sky-200 tracking-wide">
                                  {exec.triggerKind}
                                </span>
                              </Link>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">
                              <Link
                                href={`/dashboard/${exec.fnId}/executions/${exec.id}`}
                                className="block"
                              >
                                {exec.wallMs}ms
                              </Link>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--color-bone-faint)]">
                              <Link
                                href={`/dashboard/${exec.fnId}/executions/${exec.id}`}
                                className="inline-flex items-center gap-1"
                              >
                                {formatDistanceToNow(exec.startedAt, { addSuffix: true })}
                                <ArrowRight className="size-3.5 text-[var(--color-bone-faint)]" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-[var(--color-bone-muted)]">
                    <Activity className="mb-3 size-8 opacity-20" />
                    <p>No executions in this window yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="border-dashed border-[var(--color-border)] bg-[var(--color-ink-elevated)]/55 text-[var(--color-bone)]">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-[var(--color-amber)]/10">
              <Activity className="size-6 text-[var(--color-amber)]" />
            </div>
            <div>
              <h2 className="font-display text-2xl text-[var(--color-bone)]">
                No activity in {RANGE_LABELS[range].toLowerCase()}
              </h2>
              <p className="mt-2 max-w-md text-sm text-[var(--color-bone-muted)]">
                Switch the range or trigger a function to start seeing live charts here.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <RangeSwitcher current={range} />
              <Button asChild variant="glass" className="rounded-full">
                <Link href="/dashboard/new">Deploy a function</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {hasFunctions ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-xl tracking-tight">Your Functions</h2>
            <Link
              href="/dashboard/functions"
              className="font-medium text-[var(--color-amber)] text-sm hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentFunctions.map((fn) => (
              <div
                key={fn.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)] text-[var(--color-bone)] shadow-sm transition-all duration-300 hover:border-[var(--color-amber)]/40 hover:shadow-lg"
              >
                <div className="p-4">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FunctionLogo logo={fn.logo} name={fn.slug} size="md" />
                      <div className="overflow-hidden">
                        <h3 className="truncate font-mono font-semibold text-sm" title={fn.slug}>
                          {fn.slug}
                        </h3>
                        <p className="whitespace-nowrap text-[10px] text-[var(--color-bone-faint)]">
                          Deployed {formatDistanceToNow(fn.updatedAt, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={fn.visibility === "public" ? "default" : "secondary"}
                      className="ml-2 shrink-0 text-[10px] capitalize shadow-sm"
                    >
                      {fn.visibility}
                    </Badge>
                  </div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="border-[var(--color-border)] bg-white/[0.04] font-medium text-[10px] text-[var(--color-bone)]"
                    >
                      {fn.currentVersionId ? "Deployed" : "Saved"}
                    </Badge>
                    {fn.envVarCount > 0 ? (
                      <Badge
                        variant="secondary"
                        className="border-emerald-400/30 bg-emerald-500/10 font-medium text-[10px] text-emerald-300"
                      >
                        <CheckCircle2 className="mr-1 size-3" />
                        Env set ({fn.envVarCount})
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="border-[var(--color-border)] bg-white/[0.02] font-medium text-[10px] text-[var(--color-bone-faint)]"
                      >
                        <Save className="mr-1 size-3" />
                        No env vars
                      </Badge>
                    )}
                    <Badge
                      variant="secondary"
                      className="border-[var(--color-border)] bg-white/[0.02] font-medium text-[10px] text-[var(--color-bone-faint)]"
                    >
                      <img
                        src="/npm-logo.svg"
                        alt=""
                        aria-hidden="true"
                        className="mr-1 size-3 object-contain"
                      />
                      npm ({fn.packageCount})
                    </Badge>
                    <Badge
                      variant="secondary"
                      className={
                        fn.latestExecutionStatus === "ok"
                          ? "border border-emerald-500/80 bg-transparent font-medium text-[10px] text-white"
                          : fn.latestExecutionStatus
                            ? "border border-red-500/80 bg-transparent font-medium text-[10px] text-white"
                            : "border-[var(--color-border)] bg-white/[0.02] font-medium text-[10px] text-[var(--color-bone-faint)]"
                      }
                    >
                      <Activity className="mr-1 size-3" />
                      exec ({fn.executionCount})
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 h-10 text-sm text-[var(--color-bone-muted)]">
                    {fn.description?.trim() || "No description provided."}
                  </p>
                </div>

                <div className="flex items-center justify-between border-[var(--color-border)] border-t bg-white/[0.02] p-2.5 transition-colors group-hover:bg-white/[0.04]">
                  <div className="flex items-center">
                    <CopyButton
                      value={fn.deployedUrl ?? ""}
                      disabled={!fn.deployedUrl}
                      title={fn.deployedUrl ? "Copy deployed endpoint" : "Host the function first"}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-7 border-[var(--color-border)] bg-transparent px-2 text-[11px] shadow-sm"
                    >
                      <Link href={`/dashboard/${fn.id}/settings`}>
                        <Settings className="mr-1 size-3" />
                        Settings
                      </Link>
                    </Button>
                    <Button size="sm" asChild className="h-7 px-2 text-[11px] shadow-sm">
                      <Link href={`/dashboard/${fn.id}`}>
                        Open
                        <ExternalLink className="ml-1 size-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 grid place-items-center rounded-xl border border-[var(--color-border)] border-dashed bg-[var(--color-ink-elevated)]/60 py-24 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--color-amber)]/10">
            <Layers className="size-6 text-[var(--color-amber)]" />
          </div>
          <h2 className="font-semibold text-2xl text-[var(--color-bone)]">No functions yet</h2>
          <p className="mt-2 max-w-sm text-[var(--color-bone-muted)]">
            Create your first function to start processing events, running crons, and exploring the
            dashboard.
          </p>
          <Button asChild variant="glass" className="mt-6 rounded-full px-5 py-2 text-sm shadow">
            <Link href="/dashboard/new">Deploy New Function</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
