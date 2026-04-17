import { env } from "@/lib/env";
import { redis } from "@/lib/redis";
import { db, genId, schema } from "@hostfunc/db";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${env.RUNTIME_LOOKUP_TOKEN}` || auth === `Bearer ${env.RUNTIME_INGEST_TOKEN}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({
    ok: true,
    checks: {
      ingestConfigured: Boolean(env.RUNTIME_INGEST_TOKEN),
      lookupConfigured: Boolean(env.RUNTIME_LOOKUP_TOKEN),
      redisConfigured: Boolean(env.REDIS_URL),
      runtimeUrlConfigured: Boolean(env.HOSTFUNC_RUNTIME_URL),
    },
    hint: "POST executionId to publish a synthetic live-log event.",
  });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as
    | { executionId?: string; message?: string }
    | null;
  const executionId = body?.executionId?.trim();
  if (!executionId) return Response.json({ error: "executionId_required" }, { status: 400 });

  const rows = await db
    .select({
      id: schema.execution.id,
      orgId: schema.execution.orgId,
    })
    .from(schema.execution)
    .where(eq(schema.execution.id, executionId))
    .limit(1);
  const execution = rows[0];
  if (!execution) return Response.json({ error: "execution_not_found" }, { status: 404 });

  const line = {
    ts: new Date().toISOString(),
    level: "info",
    message: body?.message?.trim() || "live-log health probe",
    fields: {
      source: "logs_health",
      ingestTokenPresent: Boolean(env.RUNTIME_INGEST_TOKEN),
      redisUrlConfigured: Boolean(env.REDIS_URL),
    },
  };

  await db.insert(schema.executionLog).values({
    id: genId("log"),
    executionId,
    orgId: execution.orgId,
    ts: new Date(line.ts),
    level: "info",
    message: line.message,
    fields: line.fields,
  });
  await redis.publish(`logs:${executionId}`, JSON.stringify(line));

  return Response.json({ ok: true, executionId, published: true, line });
}

