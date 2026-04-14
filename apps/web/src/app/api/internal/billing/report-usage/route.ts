import { env } from "@/lib/env";
import { reportUnreportedExecutionUsage } from "@/server/billing-usage";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${env.TRIGGER_CONTROL_TOKEN}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await reportUnreportedExecutionUsage(24);
  return Response.json({ ok: true, ...result });
}
