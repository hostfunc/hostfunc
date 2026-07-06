import { requireInternalExec } from "@/server/internal-auth";
import { KvError, kvIncr } from "@/server/kv-store";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireInternalExec(req);
  if (!auth.ok) return auth.response;
  const body = (await req.json().catch(() => null)) as {
    key?: string;
    delta?: number;
  } | null;
  if (typeof body?.key !== "string") {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  const delta = body.delta === undefined ? 1 : body.delta;
  if (typeof delta !== "number") {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  try {
    const value = await kvIncr(auth.payload.fnId, auth.payload.orgId, body.key, delta);
    return Response.json({ value });
  } catch (error) {
    if (error instanceof KvError) {
      return Response.json({ error: error.code, message: error.message }, { status: error.status });
    }
    return Response.json(
      { error: "kv_incr_failed", detail: error instanceof Error ? error.message : "unknown" },
      { status: 502 },
    );
  }
}
