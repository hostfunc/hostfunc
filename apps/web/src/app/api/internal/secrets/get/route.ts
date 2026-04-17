import { authenticateCallback } from "@/server/exec-registry";
import { verifyExecToken } from "@/lib/exec-token";
import { authenticateApiToken } from "@/server/api-tokens";
import { getFunctionForOrg, getSecretValueForFunction } from "@/server/functions";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = auth.slice("Bearer ".length);
  const callback = await authenticateCallback(token);
  const payload = callback?.payload ?? verifyExecToken(token);
  const apiActor = payload ? null : await authenticateApiToken(token);
  if (!payload && !apiActor) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { key?: string; fnId?: string } | null;
  if (!body?.key) {
    return Response.json({ error: "missing_key" }, { status: 400 });
  }

  const fnId = payload?.fnId ?? body.fnId ?? null;
  const orgId = payload?.orgId ?? apiActor?.orgId ?? null;
  if (!fnId || !orgId) {
    return Response.json({ error: "missing_fn_id" }, { status: 400 });
  }

  if (!payload) {
    const fn = await getFunctionForOrg(orgId, fnId);
    if (!fn) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const value = await getSecretValueForFunction(orgId, fnId, body.key);
  if (value == null) {
    return Response.json({ found: false }, { status: 404 });
  }
  return Response.json({ found: true, value });
}
