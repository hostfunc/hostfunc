import { requireInternalExec } from "@/server/internal-auth";
import { KvError, kvSet } from "@/server/kv-store";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireInternalExec(req);
  if (!auth.ok) return auth.response;
  const body = (await req.json().catch(() => null)) as {
    key?: string;
    value?: unknown;
    ttlSeconds?: number;
  } | null;
  if (typeof body?.key !== "string" || !("value" in body)) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  try {
    await kvSet(auth.payload.fnId, auth.payload.orgId, body.key, body.value, body.ttlSeconds);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof KvError) {
      return Response.json({ error: error.code, message: error.message }, { status: error.status });
    }
    return Response.json(
      { error: "kv_set_failed", detail: error instanceof Error ? error.message : "unknown" },
      { status: 502 },
    );
  }
}
