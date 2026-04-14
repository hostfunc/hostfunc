import { env } from "@/lib/env";
import { db, genId, schema } from "@hostfunc/db";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.RUNTIME_LOOKUP_TOKEN}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    execId?: string;
    fnId?: string;
    versionId?: string;
    orgId?: string;
    parentExecutionId?: string | null;
    callDepth?: number;
    triggerKind?: "http" | "cron" | "email" | "mcp" | "fn_call";
  } | null;

  if (!body?.execId || !body.fnId || !body.versionId || !body.orgId) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  await db.insert(schema.execution).values({
    id: body.execId,
    fnId: body.fnId,
    versionId: body.versionId,
    orgId: body.orgId,
    triggerKind: body.parentExecutionId ? "fn_call" : (body.triggerKind ?? "http"),
    status: "infra_error",
    parentExecutionId: body.parentExecutionId ?? null,
    callDepth: body.callDepth ?? 0,
    requestId: genId("use"),
    startedAt: new Date(),
  });

  return Response.json({ ok: true });
}
