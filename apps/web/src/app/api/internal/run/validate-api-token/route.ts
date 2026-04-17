import { env } from "@/lib/env";
import { authenticateApiToken } from "@/server/api-tokens";
import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * Validates a workspace API token for invoking a function via public HTTP /run.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.RUNTIME_LOOKUP_TOKEN}`) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    fnId?: string;
    bearerToken?: string;
  } | null;
  const fnId = body?.fnId?.trim();
  const bearerToken = body?.bearerToken?.trim();
  if (!fnId || !bearerToken) {
    return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const token = bearerToken.replace(/^Bearer\s+/i, "").trim();
  const actor = await authenticateApiToken(token);
  if (!actor) {
    return Response.json({ ok: false, error: "invalid_token" }, { status: 401 });
  }

  const rows = await db
    .select({ id: schema.fn.id })
    .from(schema.fn)
    .where(and(eq(schema.fn.id, fnId), eq(schema.fn.orgId, actor.orgId)))
    .limit(1);

  if (!rows[0]) {
    return Response.json({ ok: false, error: "fn_not_in_org" }, { status: 403 });
  }

  return Response.json({ ok: true });
}
