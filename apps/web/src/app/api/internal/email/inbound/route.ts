import { env } from "@/lib/env";
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

  const res = await fetch(`${env.HOSTFUNC_RUNTIME_URL}/run/${match.orgSlug}/${match.slug}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hostfunc-trigger-kind": "email",
    },
    body: JSON.stringify({
      trigger: "email",
      email: {
        to: body.to,
        from: body.from,
        subject: body.subject ?? "",
        text: body.text ?? "",
        headers: body.headers ?? {},
      },
    }),
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
