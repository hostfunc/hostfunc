import { env } from "@/lib/env";
import { type NormalizedInboundEmail, toEmailTriggerRuntimeBody } from "@/server/inbound-email";
import { db, genId, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${env.TRIGGER_CONTROL_TOKEN}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as {
    to?: string;
    from?: string;
    subject?: string;
    text?: string;
    rawSize?: number;
    headers?: Record<string, string>;
  } | null;
  if (!body?.to || !body.from) return Response.json({ error: "invalid_body" }, { status: 400 });

  const to = body.to.toLowerCase();
  const from = body.from.toLowerCase();

  const rows = await db
    .select({
      triggerId: schema.trigger.id,
      fnId: schema.trigger.fnId,
      orgId: schema.trigger.orgId,
      orgSlug: schema.organization.slug,
      slug: schema.fn.slug,
      config: schema.trigger.config,
    })
    .from(schema.trigger)
    .innerJoin(schema.fn, eq(schema.fn.id, schema.trigger.fnId))
    .innerJoin(schema.organization, eq(schema.organization.id, schema.trigger.orgId))
    .where(and(eq(schema.trigger.kind, "email"), eq(schema.trigger.enabled, true)));

  const match = rows.find((row) => {
    const email = row.config?.email;
    if (!email?.address) return false;
    if (email.address.toLowerCase() !== to) return false;
    const allowlist = email.allowlist ?? [];
    return allowlist.length === 0 || allowlist.map((value) => value.toLowerCase()).includes(from);
  });

  if (!match) return Response.json({ ok: true, matched: false });

  const text = body.text ?? "";
  const rawSize =
    typeof body.rawSize === "number" && Number.isFinite(body.rawSize) ? body.rawSize : text.length;
  const normalized: NormalizedInboundEmail = {
    to: body.to,
    from: body.from,
    subject: body.subject ?? "",
    textBody: text,
    rawSize,
    receivedAt: new Date(),
  };
  const runtimeBody = toEmailTriggerRuntimeBody(normalized);

  const res = await fetch(`${env.HOSTFUNC_RUNTIME_URL}/run/${match.orgSlug}/${match.slug}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.RUNTIME_INVOKE_TOKEN}`,
    },
    body: JSON.stringify(runtimeBody),
  });
  const execId = res.headers.get("x-hostfunc-exec-id");

  await db.insert(schema.webhookEvent).values({
    id: genId("evt"),
    source: "email",
    externalId: `${to}:${Date.now()}`,
    kind: "email_inbound",
    payload: {
      triggerId: match.triggerId,
      executionId: execId,
      to,
      from,
      status: res.status,
    },
    processedAt: res.ok ? new Date() : null,
    error: res.ok ? null : `runtime_status_${res.status}`,
  });

  return Response.json({ ok: true, matched: true, status: res.status, executionId: execId });
}
