import { env } from "@/lib/env";
import { findVersionIdForExecution, symbolicateStack } from "@/server/symbolicate";
import { db, genId, schema } from "@hostfunc/db";
import { eq } from "drizzle-orm";
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
}

export async function POST(req: NextRequest) {
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

  const versionId = await findVersionIdForExecution(body.executionId);
  const symbolicated = versionId ? await symbolicateStack(versionId, body.stack) : body.stack;

  await db
    .update(schema.execution)
    .set({
      status: body.status ?? "ok",
      wallMs: body.wallMs ?? 0,
      cpuMs: body.cpuMs ?? 0,
      memoryPeakMb: body.memoryPeakMb ?? 0,
      egressBytes: body.egressBytes ?? 0,
      subrequestCount: body.subrequestCount ?? 0,
      costUnits: body.costUnits ?? 0,
      errorMessage: body.errorMessage ?? null,
      endedAt: new Date(),
    })
    .where(eq(schema.execution.id, body.executionId));

  if (symbolicated && body.errorMessage) {
    await db.insert(schema.executionLog).values({
      id: genId("log"),
      executionId: body.executionId,
      orgId:
        (
          await db
            .select({ orgId: schema.execution.orgId })
            .from(schema.execution)
            .where(eq(schema.execution.id, body.executionId))
            .limit(1)
        )[0]?.orgId ?? "",
      ts: new Date(),
      level: "error",
      message: body.errorMessage,
      fields: { stack: symbolicated },
    });
  }

  if (body.logs?.length) {
    const exec = await db
      .select({ orgId: schema.execution.orgId })
      .from(schema.execution)
      .where(eq(schema.execution.id, body.executionId))
      .limit(1);
    const orgId = exec[0]?.orgId;
    if (orgId) {
      await db.insert(schema.executionLog).values(
        body.logs.map((line) => ({
          id: genId("log"),
          executionId: body.executionId,
          orgId,
          ts: line.ts ? new Date(line.ts) : new Date(),
          level: line.level,
          message: line.message,
          fields: line.fields,
        })),
      );
    }
  }

  return Response.json({ ok: true });
}
