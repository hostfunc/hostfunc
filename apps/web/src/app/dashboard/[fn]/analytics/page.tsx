import { ActivityHeatmap } from "@/components/dashboard/charts/activity-heatmap";
import { ExecutionsAreaChart } from "@/components/dashboard/charts/executions-area-chart";
import { HourlyMiniBar } from "@/components/dashboard/charts/hourly-mini-bar";
import { LatencyBandChart } from "@/components/dashboard/charts/latency-band-chart";
import { MetricCard } from "@/components/dashboard/charts/metric-card";
import { RangeSwitcher } from "@/components/dashboard/charts/range-switcher";
import { StatusRadialChart } from "@/components/dashboard/charts/status-radial-chart";
import { TriggerDonutChart } from "@/components/dashboard/charts/trigger-donut-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireActiveOrg } from "@/lib/session";
import { type OverviewRange, getDashboardOverview } from "@/server/dashboard-overview";
import { getFunctionForOrg } from "@/server/functions";
import { AlertTriangle, BookOpen, Gauge, PieChart, Play, Timer, Zap } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

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

export default async function FunctionAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ fn: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgId } = await requireActiveOrg();
  const { fn: fnId } = await params;
  const fn = await getFunctionForOrg(orgId, fnId);
  if (!fn) notFound();

  const search = (await searchParams) ?? {};
  const rawRange = typeof search.range === "string" ? search.range : undefined;
  const range: OverviewRange = isOverviewRange(rawRange) ? rawRange : "7d";

  const overview = await getDashboardOverview(orgId, range, { fnId });
  const hasActivity = overview.metrics.totalExecutions > 0;

  const seriesTotals = overview.series.map((point) => point.total);
  const seriesP50 = overview.series.map((point) => point.p50WallMs);
  const seriesP95 = overview.series.map((point) => point.p95WallMs);
  const seriesErrorRate = overview.series.map((point) =>
    point.total > 0 ? (point.errors / point.total) * 100 : 0,
  );

  const prevErrorRate =
    overview.metrics.prevTotalExecutions > 0
      ? overview.metrics.prevTotalErrors / overview.metrics.prevTotalExecutions
      : 0;

  return (
    <div className="animate-in space-y-6 fade-in duration-500">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-display text-3xl tracking-tight text-[var(--color-bone)]">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-[var(--color-bone-muted)]">
            {RANGE_LABELS[range]} · execution volume, latency profile, and error trends for{" "}
            <span className="font-mono text-[var(--color-bone)]">{fn.slug}</span>.
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
          label="p50 latency"
          icon={<Gauge className="size-4" />}
          value={formatMs(overview.metrics.p50WallMs)}
          hint="median wall time"
          lowerIsBetter
          data={seriesP50}
          spark="line"
          tone="ok"
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
              <CardHeader className="pb-3">
                <CardTitle>Trigger mix</CardTitle>
                <CardDescription className="text-[var(--color-bone-muted)]">
                  How requests are entering this function.
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
        </>
      ) : (
        <Card className="border-dashed border-[var(--color-border)] bg-[var(--color-ink-elevated)]/55 text-[var(--color-bone)]">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-[var(--color-amber)]/10">
              <Play className="size-6 text-[var(--color-amber)]" />
            </div>
            <div>
              <h2 className="font-display text-2xl text-[var(--color-bone)]">
                No executions in {RANGE_LABELS[range].toLowerCase()}
              </h2>
              <p className="mt-2 max-w-md text-sm text-[var(--color-bone-muted)]">
                Run <span className="font-mono text-[var(--color-bone)]">{fn.slug}</span> from the
                editor (or hit its endpoint) and this page fills in with latency, error, and trigger
                analytics. You can also widen the time range.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <RangeSwitcher current={range} />
              <Button asChild variant="glass" className="rounded-full">
                <Link href={`/dashboard/${fnId}`}>
                  <Play className="mr-2 size-4" />
                  Open editor &amp; test run
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-full border-[var(--color-border)] bg-transparent text-[var(--color-bone)] hover:bg-white/[0.04]"
              >
                <Link href="/docs/executions">
                  <BookOpen className="mr-2 size-4" />
                  How executions work
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
