import "server-only";

import { db, schema } from "@hostfunc/db";
import { and, eq, gte, lt, sql } from "drizzle-orm";

export type OverviewRange = "24h" | "7d" | "30d";
export type BucketKind = "hour" | "day";

export interface SeriesPoint {
  bucket: string; // ISO timestamp at the start of the bucket
  total: number;
  errors: number;
  p50WallMs: number;
  p95WallMs: number;
}

export interface TriggerBreakdown {
  triggerKind: string;
  count: number;
  errors: number;
}

export interface StatusMix {
  ok: number;
  fn_error: number;
  limit_exceeded: number;
  infra_error: number;
}

export interface TopFunction {
  fnId: string;
  fnSlug: string;
  total: number;
  errors: number;
  p95WallMs: number;
}

export interface HeatPoint {
  dow: number; // 0=Sun .. 6=Sat (Postgres extract(dow))
  hour: number; // 0..23
  count: number;
}

export interface OverviewMetrics {
  totalExecutions: number;
  totalErrors: number;
  errorRate: number; // 0..1
  p50WallMs: number;
  p95WallMs: number;
  activeFunctions: number;
  prevTotalExecutions: number;
  prevTotalErrors: number;
  prevP95WallMs: number;
  prevActiveFunctions: number;
}

export interface OverviewBundle {
  range: OverviewRange;
  bucketKind: BucketKind;
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  metrics: OverviewMetrics;
  series: SeriesPoint[];
  triggerBreakdown: TriggerBreakdown[];
  statusMix: StatusMix;
  topFunctions: TopFunction[];
  heatmap: HeatPoint[]; // empty when range === "24h"
}

const RANGE_HOURS: Record<OverviewRange, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
};

/** Org-wide when fnId is omitted; scoped to one function when present. */
interface OverviewScope {
  orgId: string;
  fnId?: string;
}

function scopeConditions(scope: OverviewScope, from: Date, to: Date) {
  const conditions = [
    eq(schema.execution.orgId, scope.orgId),
    gte(schema.execution.startedAt, from),
    lt(schema.execution.startedAt, to),
  ];
  if (scope.fnId) conditions.push(eq(schema.execution.fnId, scope.fnId));
  return and(...conditions);
}

function rangeBucket(range: OverviewRange): BucketKind {
  return range === "24h" ? "hour" : "day";
}

function bucketStartUtc(date: Date, kind: BucketKind): Date {
  const d = new Date(date.getTime());
  d.setUTCMinutes(0, 0, 0);
  if (kind === "day") d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addBucket(date: Date, kind: BucketKind, count = 1): Date {
  const d = new Date(date.getTime());
  if (kind === "hour") d.setUTCHours(d.getUTCHours() + count);
  else d.setUTCDate(d.getUTCDate() + count);
  return d;
}

function gapFillSeries(
  rows: Array<{ bucket: Date; total: number; errors: number; p50: number; p95: number }>,
  from: Date,
  to: Date,
  kind: BucketKind,
): SeriesPoint[] {
  const byTs = new Map<number, (typeof rows)[number]>();
  for (const row of rows) {
    byTs.set(bucketStartUtc(row.bucket, kind).getTime(), row);
  }
  const points: SeriesPoint[] = [];
  let cursor = bucketStartUtc(from, kind);
  const end = bucketStartUtc(to, kind);
  // Guard against infinite loops if from >= to.
  let safety = 0;
  while (cursor < end && safety < 24 * 90) {
    const hit = byTs.get(cursor.getTime());
    points.push({
      bucket: cursor.toISOString(),
      total: hit?.total ?? 0,
      errors: hit?.errors ?? 0,
      p50WallMs: hit?.p50 ?? 0,
      p95WallMs: hit?.p95 ?? 0,
    });
    cursor = addBucket(cursor, kind);
    safety += 1;
  }
  return points;
}

interface AggregateResult {
  totalExecutions: number;
  totalErrors: number;
  p50WallMs: number;
  p95WallMs: number;
  activeFunctions: number;
}

async function fetchAggregate(
  scope: OverviewScope,
  from: Date,
  to: Date,
): Promise<AggregateResult> {
  const rows = await db
    .select({
      total: sql<number>`count(*)::int`,
      errors: sql<number>`count(*) filter (where ${schema.execution.status} != 'ok')::int`,
      p50: sql<number>`coalesce(percentile_cont(0.5) within group (order by ${schema.execution.wallMs}), 0)::int`,
      p95: sql<number>`coalesce(percentile_cont(0.95) within group (order by ${schema.execution.wallMs}), 0)::int`,
      activeFns: sql<number>`count(distinct ${schema.execution.fnId})::int`,
    })
    .from(schema.execution)
    .where(scopeConditions(scope, from, to));
  const row = rows[0];
  return {
    totalExecutions: Number(row?.total ?? 0),
    totalErrors: Number(row?.errors ?? 0),
    p50WallMs: Number(row?.p50 ?? 0),
    p95WallMs: Number(row?.p95 ?? 0),
    activeFunctions: Number(row?.activeFns ?? 0),
  };
}

async function fetchSeries(
  scope: OverviewScope,
  from: Date,
  to: Date,
  kind: BucketKind,
): Promise<SeriesPoint[]> {
  // PostgreSQL accepts the bucket kind as a literal in date_trunc
  const trunc =
    kind === "hour"
      ? sql<Date>`date_trunc('hour', ${schema.execution.startedAt})`
      : sql<Date>`date_trunc('day', ${schema.execution.startedAt})`;
  const rows = await db
    .select({
      bucket: sql<Date>`${trunc}`,
      total: sql<number>`count(*)::int`,
      errors: sql<number>`count(*) filter (where ${schema.execution.status} != 'ok')::int`,
      p50: sql<number>`coalesce(percentile_cont(0.5) within group (order by ${schema.execution.wallMs}), 0)::int`,
      p95: sql<number>`coalesce(percentile_cont(0.95) within group (order by ${schema.execution.wallMs}), 0)::int`,
    })
    .from(schema.execution)
    .where(scopeConditions(scope, from, to))
    .groupBy(sql`1`)
    .orderBy(sql`1 asc`);

  const normalized = rows.map((row) => ({
    bucket: row.bucket instanceof Date ? row.bucket : new Date(row.bucket as unknown as string),
    total: Number(row.total ?? 0),
    errors: Number(row.errors ?? 0),
    p50: Number(row.p50 ?? 0),
    p95: Number(row.p95 ?? 0),
  }));
  return gapFillSeries(normalized, from, to, kind);
}

async function fetchTriggerBreakdown(
  scope: OverviewScope,
  from: Date,
  to: Date,
): Promise<TriggerBreakdown[]> {
  const rows = await db
    .select({
      triggerKind: schema.execution.triggerKind,
      count: sql<number>`count(*)::int`,
      errors: sql<number>`count(*) filter (where ${schema.execution.status} != 'ok')::int`,
    })
    .from(schema.execution)
    .where(scopeConditions(scope, from, to))
    .groupBy(schema.execution.triggerKind)
    .orderBy(sql`count(*) desc`);
  return rows.map((row) => ({
    triggerKind: row.triggerKind,
    count: Number(row.count ?? 0),
    errors: Number(row.errors ?? 0),
  }));
}

async function fetchStatusMix(scope: OverviewScope, from: Date, to: Date): Promise<StatusMix> {
  const rows = await db
    .select({
      status: schema.execution.status,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.execution)
    .where(scopeConditions(scope, from, to))
    .groupBy(schema.execution.status);
  const out: StatusMix = { ok: 0, fn_error: 0, limit_exceeded: 0, infra_error: 0 };
  for (const row of rows) {
    if (row.status in out) {
      out[row.status as keyof StatusMix] = Number(row.count ?? 0);
    }
  }
  return out;
}

async function fetchTopFunctions(
  scope: OverviewScope,
  from: Date,
  to: Date,
  limit = 5,
): Promise<TopFunction[]> {
  const rows = await db
    .select({
      fnId: schema.execution.fnId,
      fnSlug: schema.fn.slug,
      total: sql<number>`count(*)::int`,
      errors: sql<number>`count(*) filter (where ${schema.execution.status} != 'ok')::int`,
      p95: sql<number>`coalesce(percentile_cont(0.95) within group (order by ${schema.execution.wallMs}), 0)::int`,
    })
    .from(schema.execution)
    .leftJoin(schema.fn, eq(schema.fn.id, schema.execution.fnId))
    .where(scopeConditions(scope, from, to))
    .groupBy(schema.execution.fnId, schema.fn.slug)
    .orderBy(sql`count(*) desc`)
    .limit(limit);
  return rows.map((row) => ({
    fnId: row.fnId,
    fnSlug: row.fnSlug ?? row.fnId,
    total: Number(row.total ?? 0),
    errors: Number(row.errors ?? 0),
    p95WallMs: Number(row.p95 ?? 0),
  }));
}

async function fetchHeatmap(scope: OverviewScope, from: Date, to: Date): Promise<HeatPoint[]> {
  const rows = await db
    .select({
      dow: sql<number>`extract(dow from ${schema.execution.startedAt})::int`,
      hour: sql<number>`extract(hour from ${schema.execution.startedAt})::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.execution)
    .where(scopeConditions(scope, from, to))
    .groupBy(sql`1`, sql`2`);
  return rows.map((row) => ({
    dow: Number(row.dow ?? 0),
    hour: Number(row.hour ?? 0),
    count: Number(row.count ?? 0),
  }));
}

export async function getDashboardOverview(
  orgId: string,
  range: OverviewRange,
  options?: { fnId?: string },
): Promise<OverviewBundle> {
  const scope: OverviewScope = { orgId, ...(options?.fnId ? { fnId: options.fnId } : {}) };
  const hours = RANGE_HOURS[range];
  const bucketKind = rangeBucket(range);
  const to = new Date();
  const from = new Date(to.getTime() - hours * 60 * 60 * 1000);
  const prevTo = from;
  const prevFrom = new Date(from.getTime() - hours * 60 * 60 * 1000);

  const [aggregate, prevAggregate, series, triggerBreakdown, statusMix, topFunctions, heatmap] =
    await Promise.all([
      fetchAggregate(scope, from, to),
      fetchAggregate(scope, prevFrom, prevTo),
      fetchSeries(scope, from, to, bucketKind),
      fetchTriggerBreakdown(scope, from, to),
      fetchStatusMix(scope, from, to),
      fetchTopFunctions(scope, from, to),
      range === "24h" ? Promise.resolve<HeatPoint[]>([]) : fetchHeatmap(scope, from, to),
    ]);

  const errorRate =
    aggregate.totalExecutions > 0 ? aggregate.totalErrors / aggregate.totalExecutions : 0;

  return {
    range,
    bucketKind,
    from,
    to,
    prevFrom,
    prevTo,
    metrics: {
      totalExecutions: aggregate.totalExecutions,
      totalErrors: aggregate.totalErrors,
      errorRate,
      p50WallMs: aggregate.p50WallMs,
      p95WallMs: aggregate.p95WallMs,
      activeFunctions: aggregate.activeFunctions,
      prevTotalExecutions: prevAggregate.totalExecutions,
      prevTotalErrors: prevAggregate.totalErrors,
      prevP95WallMs: prevAggregate.p95WallMs,
      prevActiveFunctions: prevAggregate.activeFunctions,
    },
    series,
    triggerBreakdown,
    statusMix,
    topFunctions,
    heatmap,
  };
}
