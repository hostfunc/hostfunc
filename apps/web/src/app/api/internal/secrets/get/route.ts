import { authenticateCallback } from "@/server/exec-registry";
import { verifyExecToken } from "@/lib/exec-token";
import { getSecretValueForFunction } from "@/server/functions";
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
  if (!payload) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { key?: string } | null;
  if (!body?.key) {
    return Response.json({ error: "missing_key" }, { status: 400 });
  }

  const value = await getSecretValueForFunction(
    payload.orgId,
    payload.fnId,
    body.key,
  );
  if (value == null) {
    return Response.json({ found: false }, { status: 404 });
  }
  return Response.json({ found: true, value });
}
