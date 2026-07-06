import { requireInternalExec } from "@/server/internal-auth";
import { KvError, kvGet } from "@/server/kv-store";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireInternalExec(req);
  if (!auth.ok) return auth.response;
  const body = (await req.json().catch(() => null)) as { key?: string } | null;
  if (typeof body?.key !== "string") {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  try {
    const result = await kvGet(auth.payload.fnId, body.key);
    return Response.json(result);
  } catch (error) {
    if (error instanceof KvError) {
      return Response.json({ error: error.code, message: error.message }, { status: error.status });
    }
    return Response.json(
      { error: "kv_get_failed", detail: error instanceof Error ? error.message : "unknown" },
      { status: 502 },
    );
  }
}
