import { env } from "@/lib/env";
import { trackServerEvent } from "@/server/analytics";
import { enforceRateLimit } from "@/server/rate-limit";
import { genId } from "@hostfunc/db";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && env.ALLOWED_ORIGINS) {
    const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((v) => v.trim());
    if (!allowedOrigins.includes(origin)) {
      return Response.json({ error: "forbidden_origin" }, { status: 403 });
    }
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = await enforceRateLimit({
    key: `analytics:${ip}`,
    limit: 120,
    windowSeconds: 60,
  });
  if (!limit.ok) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        event?: string;
        distinctId?: string;
        props?: Record<string, unknown>;
      }
    | null;
  if (!body?.event) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  await trackServerEvent({
    event: body.event,
    distinctId: body.distinctId ?? genId("usr"),
    props: {
      ...body.props,
      ipHashHint: forwarded.slice(0, 7),
      ua: req.headers.get("user-agent") ?? "unknown",
    },
  });
  return Response.json({ ok: true });
}
