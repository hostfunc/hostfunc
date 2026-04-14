import { env } from "@/lib/env";
import { requireCliActor } from "@/server/cli-auth";
import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const actor = await requireCliActor(req.headers.get("authorization"));
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    fnId?: string;
    payload?: Record<string, unknown>;
    triggerKind?: "http" | "cron" | "email" | "mcp";
  } | null;
  if (!body?.fnId) return Response.json({ error: "invalid_body" }, { status: 400 });

  const rows = await db
    .select({ owner: schema.fn.createdById, slug: schema.fn.slug })
    .from(schema.fn)
    .where(and(eq(schema.fn.id, body.fnId), eq(schema.fn.orgId, actor.orgId)))
    .limit(1);
  const row = rows[0];
  if (!row) return Response.json({ error: "not_found" }, { status: 404 });

  const runRes = await fetch(`${env.HOSTFUNC_RUNTIME_URL}/run/${row.owner}/${row.slug}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hostfunc-trigger-kind": body.triggerKind ?? "http",
    },
    body: JSON.stringify(body.payload ?? {}),
  });

  const contentType = runRes.headers.get("content-type") ?? "";
  const result = contentType.includes("application/json") ? await runRes.json() : await runRes.text();
  return Response.json({
    ok: runRes.ok,
    status: runRes.status,
    executionId: runRes.headers.get("x-hostfunc-exec-id"),
    result,
  });
}
