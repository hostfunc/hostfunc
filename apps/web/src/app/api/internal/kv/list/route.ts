import { requireInternalExec } from "@/server/internal-auth";
import { KvError, kvList } from "@/server/kv-store";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireInternalExec(req);
  if (!auth.ok) return auth.response;
  const body = (await req.json().catch(() => null)) as {
    prefix?: string;
    limit?: number;
    cursor?: string;
  } | null;
  if (body === null) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  try {
    const result = await kvList(auth.payload.fnId, {
      ...(typeof body.prefix === "string" ? { prefix: body.prefix } : {}),
      ...(typeof body.limit === "number" ? { limit: body.limit } : {}),
      ...(typeof body.cursor === "string" ? { cursor: body.cursor } : {}),
    });
    return Response.json(result);
  } catch (error) {
    if (error instanceof KvError) {
      return Response.json({ error: error.code, message: error.message }, { status: error.status });
    }
    return Response.json(
      { error: "kv_list_failed", detail: error instanceof Error ? error.message : "unknown" },
      { status: 502 },
    );
  }
}
