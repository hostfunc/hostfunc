import { requireCliActor } from "@/server/cli-auth";
import { listExecutions } from "@/server/executions";
import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/** Lists a function's recent executions for the hostfunc VS Code extension. */
export async function GET(req: NextRequest) {
  const actor = await requireCliActor(req.headers.get("authorization"));
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });

  const fnId = req.nextUrl.searchParams.get("fnId");
  if (!fnId) return Response.json({ error: "invalid_body" }, { status: 400 });

  const parsedLimit = Number(req.nextUrl.searchParams.get("limit") ?? "20");
  const limit = Math.min(Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 20, 1), 50);

  const fnRows = await db
    .select({ id: schema.fn.id })
    .from(schema.fn)
    .where(and(eq(schema.fn.id, fnId), eq(schema.fn.orgId, actor.orgId)))
    .limit(1);
  if (!fnRows[0]) return Response.json({ error: "not_found" }, { status: 404 });

  const { items } = await listExecutions({ orgId: actor.orgId, filters: { fnId }, limit });
  return Response.json({ ok: true, items });
}
