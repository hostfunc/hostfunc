import "server-only";

import { env } from "@/lib/env";
import {
  type DispatchResult,
  type InboundEmailMessage,
  matchesAllowlist,
  toEmailTriggerRuntimeBody,
} from "@/lib/inbound-email-shared";
import { db, genId, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";

export {
  matchesAllowlist,
  toEmailTriggerRuntimeBody,
  type DispatchResult,
  type InboundEmailMessage,
  type NormalizedInboundEmail,
} from "@/lib/inbound-email-shared";

/**
 * Matches an inbound email to its trigger (indexed lookup on
 * `trigger.email_address`), invokes the function through the runtime, and
 * records a webhook event. Shared by the Email Worker route (source "email")
 * and the Resend Inbound webhook (source "resend").
 */
export async function dispatchInboundEmail(
  msg: InboundEmailMessage,
  opts: { source: "email" | "resend"; externalId?: string },
): Promise<DispatchResult> {
  const to = msg.to.toLowerCase();
  const from = msg.from.toLowerCase();

  const match = await db
    .select({
      triggerId: schema.trigger.id,
      orgSlug: schema.organization.slug,
      fnSlug: schema.fn.slug,
      config: schema.trigger.config,
    })
    .from(schema.trigger)
    .innerJoin(schema.fn, eq(schema.fn.id, schema.trigger.fnId))
    .innerJoin(schema.organization, eq(schema.organization.id, schema.trigger.orgId))
    .where(
      and(
        eq(schema.trigger.kind, "email"),
        eq(schema.trigger.enabled, true),
        eq(schema.trigger.emailAddress, to),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!match || !matchesAllowlist(match.config?.email?.allowlist, from)) {
    return { matched: false };
  }

  const text = msg.text ?? "";
  const rawSize =
    typeof msg.rawSize === "number" && Number.isFinite(msg.rawSize) ? msg.rawSize : text.length;
  const runtimeBody = toEmailTriggerRuntimeBody({
    to: msg.to,
    from: msg.from,
    subject: msg.subject ?? "",
    textBody: text,
    rawSize,
    receivedAt: new Date(),
  });

  if (env.NODE_ENV === "development") {
    // biome-ignore lint/suspicious/noConsole: intentional dev-mode mock visibility
    console.info("[inbound-email:dev]", JSON.stringify(runtimeBody, null, 2));
  }

  const res = await fetch(`${env.HOSTFUNC_RUNTIME_URL}/run/${match.orgSlug}/${match.fnSlug}`, {
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
    source: opts.source,
    externalId: opts.externalId ?? `${to}:${Date.now()}`,
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

  return { matched: true, status: res.status, executionId: execId, triggerId: match.triggerId };
}
