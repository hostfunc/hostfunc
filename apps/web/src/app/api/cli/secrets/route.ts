import { requireCliActor } from "@/server/cli-auth";
import { setSecretForFunction } from "@/server/functions";
import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const actor = await requireCliActor(req.headers.get("authorization"));
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    fnId?: string;
    key?: string;
    value?: string;
  } | null;
  if (!body?.fnId || !body.key || !body.value) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const fnRows = await db
    .select({ id: schema.fn.id })
    .from(schema.fn)
    .where(and(eq(schema.fn.id, body.fnId), eq(schema.fn.orgId, actor.orgId)))
    .limit(1);
  if (!fnRows[0]) return Response.json({ error: "not_found" }, { status: 404 });

  await setSecretForFunction({
    orgId: actor.orgId,
    fnId: body.fnId,
    key: body.key,
    value: body.value,
    userId: actor.userId,
  });
  return Response.json({ ok: true });
}
