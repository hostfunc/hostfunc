import { requireCliActor } from "@/server/cli-auth";
import { listTriggersForFunction } from "@/server/triggers";
import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/** Lists a function's triggers (http/cron/email/mcp) for the hostfunc VS Code extension. */
export async function GET(req: NextRequest) {
  const actor = await requireCliActor(req.headers.get("authorization"));
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });

  const fnId = req.nextUrl.searchParams.get("fnId");
  if (!fnId) return Response.json({ error: "invalid_body" }, { status: 400 });

  const fnRows = await db
    .select({ id: schema.fn.id })
    .from(schema.fn)
    .where(and(eq(schema.fn.id, fnId), eq(schema.fn.orgId, actor.orgId)))
    .limit(1);
  if (!fnRows[0]) return Response.json({ error: "not_found" }, { status: 404 });

  const items = await listTriggersForFunction(actor.orgId, fnId);
  return Response.json({ ok: true, items });
}
