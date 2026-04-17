import "server-only";

import { authenticateCallback } from "@/server/exec-registry";
import { verifyExecToken } from "@/lib/exec-token";
import type { NextRequest } from "next/server";

export async function requireInternalExec(req: NextRequest): Promise<{
  ok: true;
  payload: { fnId: string; orgId: string };
} | { ok: false; response: Response }> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return { ok: false, response: Response.json({ error: "unauthorized" }, { status: 401 }) };
  }
  const token = auth.slice("Bearer ".length);
  const callback = await authenticateCallback(token);
  const payload = callback?.payload ?? verifyExecToken(token);
  if (!payload) {
    return { ok: false, response: Response.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { ok: true, payload: { fnId: payload.fnId, orgId: payload.orgId } };
}
