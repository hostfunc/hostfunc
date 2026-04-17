import { env } from "@/lib/env";
import { redis } from "@/lib/redis";
import { captureServerError } from "@/server/observability";
import { enforceRateLimit } from "@/server/rate-limit";
import { findVersionIdForExecution, symbolicateStack } from "@/server/symbolicate";
import {
  markWebhookEventFailed,
  markWebhookEventProcessed,
  recordWebhookEvent,
} from "@/server/webhook-events";
import { db, genId, schema } from "@hostfunc/db";
import { CloudflareApi } from "@hostfunc/executor-cloudflare/api";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

interface IngestLog {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  fields?: Record<string, unknown>;
  ts?: string;
}

interface IngestBody {
  executionId: string;
  status?: "ok" | "fn_error" | "limit_exceeded" | "infra_error";
  wallMs?: number;
  cpuMs?: number;
  memoryPeakMb?: number;
  egressBytes?: number;
  subrequestCount?: number;
  costUnits?: number;
  errorMessage?: string | null;
  stack?: string | null;
  logs?: IngestLog[];
  source?: string;
  externalId?: string;
  eventType?: string;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = await enforceRateLimit({
    key: `runtime_ingest:${ip}`,
    limit: 600,
    windowSeconds: 60,
  });
  if (!limit.ok) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  const auth = req.headers.get("authorization");
  const allowed = new Set([
    `Bearer ${env.RUNTIME_INGEST_TOKEN}`,
    `Bearer ${env.RUNTIME_LOOKUP_TOKEN}`,
  ]);
  if (!auth || !allowed.has(auth)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as IngestBody | null;
  if (!body?.executionId) return Response.json({ error: "invalid_body" }, { status: 400 });
  const source = body.source ?? "tail";
  const eventKey = body.externalId ?? `${body.executionId}:${source}:${body.eventType ?? "final"}`;
  const event = await recordWebhookEvent({
    source,
    externalId: eventKey,
    kind: "execution_ingest",
    payload: body,
  });
  if (event.duplicate) return Response.json({ ok: true, duplicate: true });

  try {
    const execRows = await db
      .select({ orgId: schema.execution.orgId, fnId: schema.execution.fnId })
      .from(schema.execution)
      .where(eq(schema.execution.id, body.executionId))
      .limit(1);
    const orgId = execRows[0]?.orgId;
    const fnId = execRows[0]?.fnId;
    if (!orgId) {
      await markWebhookEventFailed(event.id, "execution_not_found");
      return Response.json({ error: "execution_not_found" }, { status: 404 });
    }

    const versionId = await findVersionIdForExecution(body.executionId);
    const symbolicated = versionId ? await symbolicateStack(versionId, body.stack) : body.stack;
    const egressBytes = await readEgressCounter(body.executionId, body.egressBytes ?? 0);

    await db
      .update(schema.execution)
      .set({
        status: body.status ?? "ok",
        wallMs: Math.max(0, Math.round(body.wallMs ?? 0)),
        cpuMs: Math.max(0, Math.round(body.cpuMs ?? 0)),
        memoryPeakMb: Math.max(0, Math.round(body.memoryPeakMb ?? 0)),
        egressBytes: Math.max(0, Math.round(egressBytes)),
        subrequestCount: Math.max(0, body.subrequestCount ?? 0),
        costUnits: Math.max(0, body.costUnits ?? 0),
        errorMessage: body.errorMessage ?? null,
        endedAt: new Date(),
      })
      .where(eq(schema.execution.id, body.executionId));

    await db.insert(schema.usageEvent).values({
      id: genId("use"),
      orgId,
      kind: "execution",
      quantity: 1,
      executionId: body.executionId,
      ts: new Date(),
    });

    if (symbolicated && body.errorMessage) {
      const symbolicatedRow = {
        id: genId("log"),
        executionId: body.executionId,
        orgId,
        ts: new Date(),
        level: "error" as const,
        message: body.errorMessage,
        fields: { stack: symbolicated },
      };
      await db.insert(schema.executionLog).values(symbolicatedRow);
      await publishLogLine(
        body.executionId,
        symbolicatedRow.level,
        symbolicatedRow.message,
        symbolicatedRow.fields,
        symbolicatedRow.ts,
      );
    }

    if (body.logs?.length) {
      const values = body.logs.map((line) => ({
        id: genId("log"),
        executionId: body.executionId,
        orgId,
        ts: line.ts ? new Date(line.ts) : new Date(),
        level: line.level,
        message: line.message,
        fields: line.fields,
      }));
      await db.insert(schema.executionLog).values(values);
      for (const value of values) {
        await publishLogLine(body.executionId, value.level, value.message, value.fields, value.ts);
      }
    }

    // Keep dashboard cards/execution badges fresh after runtime writes.
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/functions");
    if (fnId) {
      revalidatePath(`/dashboard/${fnId}`);
      revalidatePath(`/dashboard/${fnId}/executions`);
    }

    await markWebhookEventProcessed(event.id);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ingest_failed";
    await markWebhookEventFailed(event.id, message);
    await captureServerError({
      source: "runtime_ingest",
      message,
      context: { executionId: body.executionId },
    });
    throw error;
  }
}

async function publishLogLine(
  executionId: string,
  level: string,
  message: string,
  fields: Record<string, unknown> | null | undefined,
  ts: Date,
) {
  const event = {
    type: "log",
    executionId,
    level,
    message,
    fields: fields ?? undefined,
    ts: ts.toISOString(),
  };
  await redis.publish(`logs:${executionId}`, JSON.stringify(event));
}

async function readEgressCounter(executionId: string, fallback: number): Promise<number> {
  if (!env.CF_EGRESS_COUNTERS_KV_ID || !env.CF_ACCOUNT_ID || !env.CF_API_TOKEN) {
    return Math.max(0, Math.round(fallback));
  }
  try {
    const api = new CloudflareApi({
      accountId: env.CF_ACCOUNT_ID,
      apiToken: env.CF_API_TOKEN,
    });
    const value = await api.getKvValue(env.CF_EGRESS_COUNTERS_KV_ID, `egress:${executionId}`);
    return Math.max(0, Number(value ?? "0"));
  } catch {
    return Math.max(0, Math.round(fallback));
  }
}
