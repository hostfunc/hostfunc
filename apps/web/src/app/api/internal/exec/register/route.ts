import { env } from "@/lib/env";
import { registerExecution } from "@/server/exec-registry";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.RUNTIME_LOOKUP_TOKEN}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    execId?: string;
    fnId?: string;
    orgId?: string;
    wallMs?: number;
    callChain?: Array<{ fnId: string; execId: string }>;
  } | null;

  if (!body?.execId || !body.fnId || !body.orgId || !body.wallMs) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = await registerExecution({
    execId: body.execId,
    fnId: body.fnId,
    orgId: body.orgId,
    wallMs: body.wallMs,
    callChain: body.callChain ?? [],
  });

  return Response.json(result);
}
