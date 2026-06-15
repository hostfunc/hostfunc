import "server-only";

import { env } from "@/lib/env";
import { type InboundEmailRecord, db, schema } from "@hostfunc/db";
import { eq } from "drizzle-orm";

/**
 * Resend Inbound integration for custom-domain email triggers. Platform
 * domains (hostfunc.io / staging-mail.hostfunc.io) are received via Cloudflare
 * Email Routing; customer domains can't be (they aren't zones in our CF
 * account), so they're registered in our Resend account as receiving-only
 * domains and the customer adds the MX/TXT records Resend returns.
 */

const RESEND_API = "https://api.resend.com";

export class ResendInboundNotConfiguredError extends Error {
  constructor() {
    super("Resend inbound email is not configured on this deployment.");
    this.name = "ResendInboundNotConfiguredError";
  }
}

export function isResendInboundConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY && env.RESEND_INBOUND_WEBHOOK_SECRET);
}

interface ResendDomainResponse {
  id: string;
  status?: string;
  records?: Array<{
    record?: string;
    type?: string;
    name?: string;
    value?: string;
    priority?: number;
    status?: string;
  }>;
}

function toInboundEmailRecords(records: ResendDomainResponse["records"]): InboundEmailRecord[] {
  const out: InboundEmailRecord[] = [];
  for (const record of records ?? []) {
    const type = record.type?.toLowerCase();
    if (type !== "mx" && type !== "txt" && type !== "cname") continue;
    if (!record.name || !record.value) continue;
    out.push({
      kind: type,
      name: record.name,
      value: record.value,
      ...(record.priority !== undefined ? { priority: record.priority } : {}),
      ...(record.status !== undefined ? { status: record.status } : {}),
    });
  }
  return out;
}

async function resendRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!env.RESEND_API_KEY) throw new ResendInboundNotConfiguredError();
  const res = await fetch(`${RESEND_API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`resend_${res.status}: ${detail.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

/** Registers a receiving-only domain in Resend; returns id + DNS records. */
export async function createResendDomain(hostname: string): Promise<{
  id: string;
  status: string;
  records: InboundEmailRecord[];
}> {
  const created = await resendRequest<ResendDomainResponse>("/domains", {
    method: "POST",
    body: JSON.stringify({
      name: hostname,
      capabilities: { sending: "disabled", receiving: "enabled" },
    }),
  });
  // The create response may omit records; fetch the full view.
  const full = await resendRequest<ResendDomainResponse>(`/domains/${created.id}`);
  return {
    id: created.id,
    status: full.status ?? created.status ?? "not_started",
    records: toInboundEmailRecords(full.records ?? created.records),
  };
}

export async function getResendDomain(id: string): Promise<{
  status: string;
  records: InboundEmailRecord[];
}> {
  const domain = await resendRequest<ResendDomainResponse>(`/domains/${id}`);
  return {
    status: domain.status ?? "unknown",
    records: toInboundEmailRecords(domain.records),
  };
}

export async function triggerResendDomainVerify(id: string): Promise<void> {
  await resendRequest(`/domains/${id}/verify`, { method: "POST" });
}

/** 404-tolerant — deletion must never block custom-domain teardown. */
export async function deleteResendDomain(id: string): Promise<void> {
  try {
    await resendRequest(`/domains/${id}`, { method: "DELETE" });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("resend_404")) return;
    throw error;
  }
}

export interface ReceivedEmail {
  to: string[];
  from: string;
  subject: string | null;
  text: string | null;
  html: string | null;
}

/** Full content of a received email — webhook payloads carry metadata only. */
export async function getReceivedEmail(emailId: string): Promise<ReceivedEmail> {
  const email = await resendRequest<{
    to?: string[];
    from?: string;
    subject?: string | null;
    text?: string | null;
    html?: string | null;
  }>(`/emails/receiving/${emailId}`);
  return {
    to: email.to ?? [],
    from: email.from ?? "",
    subject: email.subject ?? null,
    text: email.text ?? null,
    html: email.html ?? null,
  };
}

/**
 * Lazily registers a custom domain for inbound email the first time an
 * address is generated on it, persisting the Resend id + DNS records.
 */
export async function ensureResendDomain(domainRow: {
  id: string;
  hostname: string;
  resendDomainId: string | null;
}): Promise<void> {
  if (!isResendInboundConfigured()) throw new ResendInboundNotConfiguredError();
  if (domainRow.resendDomainId) return;
  const created = await createResendDomain(domainRow.hostname);
  await db
    .update(schema.customDomain)
    .set({
      resendDomainId: created.id,
      emailStatus: created.status,
      emailRecords: created.records,
      emailStatusCheckedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.customDomain.id, domainRow.id));
}

/** Re-fetches the Resend domain state and persists it. Null when not registered. */
export async function refreshResendDomainStatus(domainId: string): Promise<{
  emailStatus: string;
  emailRecords: InboundEmailRecord[];
} | null> {
  const row = await db.query.customDomain.findFirst({
    where: eq(schema.customDomain.id, domainId),
    columns: { id: true, resendDomainId: true, emailStatus: true },
  });
  if (!row?.resendDomainId) return null;

  // Nudge verification along while pending; best-effort.
  if (row.emailStatus !== "verified") {
    await triggerResendDomainVerify(row.resendDomainId).catch(() => {});
  }
  const domain = await getResendDomain(row.resendDomainId);
  // Deliberately leaves `updatedAt` alone — that column throttles the
  // separate Cloudflare HTTP-status refresh; email polling must not mask it.
  await db
    .update(schema.customDomain)
    .set({
      emailStatus: domain.status,
      emailRecords: domain.records,
      emailStatusCheckedAt: new Date(),
    })
    .where(eq(schema.customDomain.id, row.id));
  return { emailStatus: domain.status, emailRecords: domain.records };
}
