import { requireInternalExec } from "@/server/internal-auth";
import { KvError, kvGetMany } from "@/server/kv-store";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireInternalExec(req);
  if (!auth.ok) return auth.response;
  const body = (await req.json().catch(() => null)) as { keys?: string[] } | null;
  if (!Array.isArray(body?.keys)) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  try {
    const values = await kvGetMany(auth.payload.fnId, body.keys);
    return Response.json({ values });
  } catch (error) {
    if (error instanceof KvError) {
      return Response.json({ error: error.code, message: error.message }, { status: error.status });
    }
    return Response.json(
      { error: "kv_get_many_failed", detail: error instanceof Error ? error.message : "unknown" },
      { status: 502 },
    );
  }
}
