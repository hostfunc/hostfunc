import { env } from "@/lib/env";
import { unregisterExecution } from "@/server/exec-registry";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.RUNTIME_LOOKUP_TOKEN}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { execId?: string } | null;
  if (!body?.execId) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  await unregisterExecution(body.execId);
  return Response.json({ ok: true });
}
