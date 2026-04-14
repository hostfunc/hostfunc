import "server-only";

import { type ExecTokenPayload, signExecToken, verifyExecToken } from "@/lib/exec-token";
import { db, schema } from "@hostfunc/db";
import { and, eq, gte, sql } from "drizzle-orm";
import { redis } from "@/lib/redis";
import { getOrgPlan } from "./plan";

const EXEC_KEY_PREFIX = "exec:";

export interface ExecCallChainEntry {
  fnId: string;
  execId: string;
}

export interface RegisterExecutionInput {
  execId: string;
  fnId: string;
  orgId: string;
  wallMs: number;
  callChain: ExecCallChainEntry[];
}

export interface ActiveExecution {
  fnId: string;
  orgId: string;
  callChain: ExecCallChainEntry[];
  startedAt: number;
}

export async function registerExecution(input: RegisterExecutionInput): Promise<{
  token: string;
  expiresAt: number;
  maxCallDepth: number;
  wallMs: number;
}> {
  const orgPlan = await getOrgPlan(input.orgId);
  const maxCallDepth = orgPlan?.limits.maxCallDepth ?? 3;
  const maxWallMs = orgPlan?.limits.maxWallMs ?? input.wallMs;
  const maxExecutionsPerDay = orgPlan?.limits.maxExecutionsPerDay ?? 100;

  const dayStartUtc = new Date();
  dayStartUtc.setUTCHours(0, 0, 0, 0);
  const executionsToday = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.execution)
    .where(and(eq(schema.execution.orgId, input.orgId), gte(schema.execution.startedAt, dayStartUtc)))
    .limit(1);
  const todayCount = executionsToday[0]?.count ?? 0;
  if (todayCount >= maxExecutionsPerDay) {
    throw new Error("daily_execution_limit_exceeded");
  }

  if (input.callChain.length >= maxCallDepth) {
    throw new Error("max_call_depth_exceeded");
  }

  const wallMs = Math.max(1000, Math.min(input.wallMs, maxWallMs));
  const expiresAt = Date.now() + wallMs + 5_000;
  const ttlSeconds = Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000));

  const active: ActiveExecution = {
    fnId: input.fnId,
    orgId: input.orgId,
    callChain: input.callChain,
    startedAt: Date.now(),
  };

  await redis.set(`${EXEC_KEY_PREFIX}${input.execId}`, JSON.stringify(active), "EX", ttlSeconds);

  const token = signExecToken({
    execId: input.execId,
    fnId: input.fnId,
    orgId: input.orgId,
    expiresAt,
  });

  return { token, expiresAt, maxCallDepth, wallMs };
}

export async function unregisterExecution(execId: string): Promise<void> {
  await redis.del(`${EXEC_KEY_PREFIX}${execId}`);
}

export async function getActiveExecution(execId: string): Promise<ActiveExecution | null> {
  const raw = await redis.get(`${EXEC_KEY_PREFIX}${execId}`);
  if (!raw) return null;
  return JSON.parse(raw) as ActiveExecution;
}

export async function authenticateCallback(
  token: string,
): Promise<{ payload: ExecTokenPayload; execution: ActiveExecution } | null> {
  const payload = verifyExecToken(token);
  if (!payload) return null;
  const execution = await getActiveExecution(payload.execId);
  if (!execution) return null;
  if (execution.fnId !== payload.fnId || execution.orgId !== payload.orgId) return null;
  return { payload, execution };
}
