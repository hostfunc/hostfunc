import { env } from "@/lib/env";
import { isAuthorizedBearer } from "@/lib/timing-safe";
import { type InboundEmailMessage, dispatchInboundEmail } from "@/server/inbound-email";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isAuthorizedBearer(req.headers.get("authorization"), [env.TRIGGER_CONTROL_TOKEN])) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as Partial<InboundEmailMessage> | null;
  if (!body?.to || !body.from) return Response.json({ error: "invalid_body" }, { status: 400 });

  const result = await dispatchInboundEmail(
    {
      to: body.to,
      from: body.from,
      ...(body.subject !== undefined ? { subject: body.subject } : {}),
      ...(body.text !== undefined ? { text: body.text } : {}),
      ...(body.rawSize !== undefined ? { rawSize: body.rawSize } : {}),
      ...(body.headers !== undefined ? { headers: body.headers } : {}),
    },
    { source: "email" },
  );

  if (!result.matched) return Response.json({ ok: true, matched: false });
  return Response.json({
    ok: true,
    matched: true,
    status: result.status,
    executionId: result.executionId,
  });
}
