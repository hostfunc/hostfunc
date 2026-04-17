import { env } from "@/lib/env";
import { db, schema } from "@hostfunc/db";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * Verifies a parent execution exists and shares an org with the child function
 * (used by runtime dispatch to allow nested executeFunction without workspace API key).
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.RUNTIME_LOOKUP_TOKEN}`) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    parentExecutionId?: string;
    childFnId?: string;
  } | null;
  const parentExecutionId = body?.parentExecutionId?.trim();
  const childFnId = body?.childFnId?.trim();
  if (!parentExecutionId || !childFnId) {
    return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const parentRows = await db
    .select({ orgId: schema.fn.orgId })
    .from(schema.execution)
    .innerJoin(schema.fn, eq(schema.fn.id, schema.execution.fnId))
    .where(eq(schema.execution.id, parentExecutionId))
    .limit(1);

  const childRows = await db
    .select({ orgId: schema.fn.orgId })
    .from(schema.fn)
    .where(eq(schema.fn.id, childFnId))
    .limit(1);

  const pOrg = parentRows[0]?.orgId;
  const cOrg = childRows[0]?.orgId;
  if (!pOrg || !cOrg || pOrg !== cOrg) {
    return Response.json({ ok: false, error: "parent_not_found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
