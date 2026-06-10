import { requireCliActor } from "@/server/cli-auth";
import { listVersionsForFunction } from "@/server/functions";
import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/** Lists a function's deployed/draft versions (no code) for the hostfunc VS Code extension. */
export async function GET(req: NextRequest) {
  const actor = await requireCliActor(req.headers.get("authorization"));
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });

  const fnId = req.nextUrl.searchParams.get("fnId");
  if (!fnId) return Response.json({ error: "invalid_body" }, { status: 400 });

  const parsedLimit = Number(req.nextUrl.searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(parsedLimit) ? parsedLimit : 10;

  const fnRows = await db
    .select({ id: schema.fn.id })
    .from(schema.fn)
    .where(and(eq(schema.fn.id, fnId), eq(schema.fn.orgId, actor.orgId)))
    .limit(1);
  if (!fnRows[0]) return Response.json({ error: "not_found" }, { status: 404 });

  const items = await listVersionsForFunction(actor.orgId, fnId, limit);
  return Response.json({ ok: true, items });
}
