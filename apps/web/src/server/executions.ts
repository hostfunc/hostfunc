import "server-only";

import { db, schema } from "@hostfunc/db";
import { desc, eq, sql } from "drizzle-orm";

export async function getDashboardStats(orgId: string) {
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
    totalFunctions: fnStats?.totalFunctions ?? 0,
    totalExecutions: execStats?.totalExecutions ?? 0,
    totalFailures: execStats?.totalFailures ?? 0,
    totalCpuMs: execStats?.totalCpuMs ?? 0,
  };
}

export async function getRecentExecutions(orgId: string, limit: number = 10) {
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
