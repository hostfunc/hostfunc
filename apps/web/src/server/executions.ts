import "server-only";

import { db, schema } from "@hostfunc/db";
import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";

export interface DashboardStats {
  totalFunctions: number;
  totalExecutions: number;
  totalFailures: number;
  totalCpuMs: number;
}

export async function getDashboardStats(orgId: string): Promise<DashboardStats> {
  // Aggregate executions
  const [execStats] = await db
    .select({
      totalExecutions: sql<number>`count(${schema.execution.id})::int`,
      totalFailures: sql<number>`count(${schema.execution.id}) filter (where ${schema.execution.status} != 'ok')::int`,
      totalCpuMs: sql<number>`coalesce(sum(${schema.execution.cpuMs}), 0)::int`,
    })
    .from(schema.execution)
    .where(eq(schema.execution.orgId, orgId));

  // Count active functions
  const [fnStats] = await db
    .select({
      totalFunctions: sql<number>`count(${schema.fn.id})::int`,
    })
    .from(schema.fn)
    .where(eq(schema.fn.orgId, orgId));

  return {
    totalFunctions: Number(fnStats?.totalFunctions ?? 0),
    totalExecutions: Number(execStats?.totalExecutions ?? 0),
    totalFailures: Number(execStats?.totalFailures ?? 0),
    totalCpuMs: Number(execStats?.totalCpuMs ?? 0),
  };
}

export async function getRecentExecutions(orgId: string, limit = 10) {
  return db
    .select({
      id: schema.execution.id,
      fnId: schema.execution.fnId,
      fnSlug: schema.fn.slug,
      status: schema.execution.status,
      triggerKind: schema.execution.triggerKind,
      wallMs: schema.execution.wallMs,
      startedAt: schema.execution.startedAt,
    })
    .from(schema.execution)
    .leftJoin(schema.fn, eq(schema.execution.fnId, schema.fn.id))
    .where(eq(schema.execution.orgId, orgId))
    .orderBy(desc(schema.execution.startedAt))
    .limit(limit);
}

export interface ExecutionFilters {
  fnId?: string;
  status?: Array<"ok" | "fn_error" | "limit_exceeded" | "infra_error">;
  triggerKind?: Array<"http" | "cron" | "email" | "mcp" | "fn_call">;
  from?: string;
  to?: string;
}

export interface ListExecutionsInput {
  orgId: string;
  filters?: ExecutionFilters;
  limit?: number;
  cursor?: string;
}

export interface ExecutionListItem {
  id: string;
  fnId: string;
  fnSlug: string;
  status: "ok" | "fn_error" | "limit_exceeded" | "infra_error";
  triggerKind: string;
  wallMs: number;
  cpuMs: number;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: Date;
  endedAt: Date | null;
}

export async function listExecutions(
  input: ListExecutionsInput,
): Promise<{ items: ExecutionListItem[]; nextCursor: string | null }> {
  const limit = Math.min(input.limit ?? 50, 200);
  const filters = input.filters ?? {};
  const where = [eq(schema.execution.orgId, input.orgId)];

  if (filters.fnId) where.push(eq(schema.execution.fnId, filters.fnId));
  if (filters.status?.length) where.push(inArray(schema.execution.status, filters.status));
  if (filters.triggerKind?.length) where.push(inArray(schema.execution.triggerKind, filters.triggerKind));
  if (filters.from) where.push(gte(schema.execution.startedAt, new Date(filters.from)));
  if (filters.to) where.push(lt(schema.execution.startedAt, new Date(filters.to)));
  if (input.cursor) where.push(lt(schema.execution.startedAt, new Date(input.cursor)));

  const rows = await db
    .select({
      id: schema.execution.id,
      fnId: schema.execution.fnId,
      fnSlug: schema.fn.slug,
      status: schema.execution.status,
      triggerKind: schema.execution.triggerKind,
      wallMs: schema.execution.wallMs,
      cpuMs: schema.execution.cpuMs,
      errorCode: schema.execution.errorCode,
      errorMessage: schema.execution.errorMessage,
      startedAt: schema.execution.startedAt,
      endedAt: schema.execution.endedAt,
    })
    .from(schema.execution)
    .innerJoin(schema.fn, eq(schema.fn.id, schema.execution.fnId))
    .where(and(...where))
    .orderBy(desc(schema.execution.startedAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit) as ExecutionListItem[];
  return {
    items,
    nextCursor: hasMore ? items[items.length - 1]?.startedAt.toISOString() ?? null : null,
  };
}

export async function getExecution(orgId: string, executionId: string) {
  const rows = await db
    .select({
      id: schema.execution.id,
      fnId: schema.execution.fnId,
      versionId: schema.execution.versionId,
      fnSlug: schema.fn.slug,
      status: schema.execution.status,
      triggerKind: schema.execution.triggerKind,
      wallMs: schema.execution.wallMs,
      cpuMs: schema.execution.cpuMs,
      memoryPeakMb: schema.execution.memoryPeakMb,
      egressBytes: schema.execution.egressBytes,
      subrequestCount: schema.execution.subrequestCount,
      errorCode: schema.execution.errorCode,
      errorMessage: schema.execution.errorMessage,
      parentExecutionId: schema.execution.parentExecutionId,
      callDepth: schema.execution.callDepth,
      requestId: schema.execution.requestId,
      startedAt: schema.execution.startedAt,
      endedAt: schema.execution.endedAt,
    })
    .from(schema.execution)
    .innerJoin(schema.fn, eq(schema.fn.id, schema.execution.fnId))
    .where(and(eq(schema.execution.id, executionId), eq(schema.execution.orgId, orgId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listLogsForExecution(orgId: string, executionId: string) {
  return db
    .select({
      ts: schema.executionLog.ts,
      level: schema.executionLog.level,
      message: schema.executionLog.message,
      fields: schema.executionLog.fields,
    })
    .from(schema.executionLog)
    .where(and(eq(schema.executionLog.executionId, executionId), eq(schema.executionLog.orgId, orgId)))
    .orderBy(asc(schema.executionLog.ts));
}

export interface UsageSummary {
  executionsToday: number;
  executionsLast24h: number;
  errorsLast24h: number;
  avgWallMs: number;
  p95WallMs: number;
  totalCpuMs: number;
}

export async function getUsageSummary(orgId: string): Promise<UsageSummary> {
  const rows = await db
    .select({
      count: sql<number>`count(*)::int`,
      errors: sql<number>`count(*) filter (where status != 'ok')::int`,
      avgWall: sql<number>`coalesce(avg(wall_ms), 0)::int`,
      p95Wall: sql<number>`coalesce(percentile_cont(0.95) within group (order by wall_ms), 0)::int`,
      totalCpu: sql<number>`coalesce(sum(cpu_ms), 0)::int`,
    })
    .from(schema.execution)
    .where(
      and(
        eq(schema.execution.orgId, orgId),
        gte(schema.execution.startedAt, sql`now() - interval '24 hours'`),
      ),
    );

  const today = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.execution)
    .where(
      and(
        eq(schema.execution.orgId, orgId),
        gte(schema.execution.startedAt, sql`date_trunc('day', now())`),
      ),
    );
  const row = rows[0];
  return {
    executionsToday: today[0]?.count ?? 0,
    executionsLast24h: row?.count ?? 0,
    errorsLast24h: row?.errors ?? 0,
    avgWallMs: row?.avgWall ?? 0,
    p95WallMs: row?.p95Wall ?? 0,
    totalCpuMs: row?.totalCpu ?? 0,
  };
}
