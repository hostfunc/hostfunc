import "server-only";

import { env } from "@/lib/env";
import { db, schema } from "@hostfunc/db";
import type { DcvRecord } from "@hostfunc/db";
import { CloudflareApi } from "@hostfunc/executor-cloudflare/api";
import {
  CloudflareCustomHostnames,
  type CustomHostnameRecord,
} from "@hostfunc/executor-cloudflare/custom-hostnames";
import { eq } from "drizzle-orm";

export type CustomDomainStatus = (typeof schema.customDomainStatusEnum.enumValues)[number];

/** Thrown when the Cloudflare for SaaS integration isn't configured (dev/CI). */
export class CustomDomainNotConfiguredError extends Error {
  constructor() {
    super("Custom domains are not configured on this deployment.");
    this.name = "CustomDomainNotConfiguredError";
  }
}

/** True when all env needed to provision + route custom domains is present. */
export function isCustomDomainsConfigured(): boolean {
  return Boolean(env.CF_SAAS_ZONE_ID && env.CF_API_TOKEN && env.CF_DOMAIN_INDEX_KV_ID);
}

/** The CNAME target users point their domain at; safe to show even when unconfigured. */
export function cnameTarget(): string {
  return env.CF_SAAS_CNAME_TARGET;
}

function hostnamesClient(): CloudflareCustomHostnames {
  if (!env.CF_SAAS_ZONE_ID || !env.CF_API_TOKEN) throw new CustomDomainNotConfiguredError();
  return new CloudflareCustomHostnames({
    apiToken: env.CF_API_TOKEN,
    zoneId: env.CF_SAAS_ZONE_ID,
  });
}

function kvClient(): { api: CloudflareApi; namespaceId: string } {
  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN || !env.CF_DOMAIN_INDEX_KV_ID) {
    throw new CustomDomainNotConfiguredError();
  }
  return {
    api: new CloudflareApi({ accountId: env.CF_ACCOUNT_ID, apiToken: env.CF_API_TOKEN }),
    namespaceId: env.CF_DOMAIN_INDEX_KV_ID,
  };
}

/**
 * Map a Cloudflare custom hostname record onto our coarser lifecycle enum.
 * `active` requires both the hostname and its certificate to be live.
 */
export function mapCfStatus(record: CustomHostnameRecord): CustomDomainStatus {
  const { status, ssl } = record;
  if (status === "moved" || status === "deleted" || status === "blocked") return "failed";
  if (
    ssl.status === "expired" ||
    ssl.status === "validation_timed_out" ||
    ssl.status === "deployment_timed_out" ||
    ssl.status === "deletion_timed_out"
  ) {
    return "failed";
  }
  if (status === "active" && ssl.status === "active") return "active";
  // Still waiting on the user's DCV/ownership records before issuance can start.
  if (ssl.status === "pending_validation") return "pending_dns";
  return "pending_ssl";
}

/** Flatten the CF validation + ownership records into the DNS rows we display. */
export function collectDcvRecords(record: CustomHostnameRecord): DcvRecord[] {
  const rows: DcvRecord[] = [...record.ssl.validationRecords];
  if (record.ownershipVerification) rows.push(record.ownershipVerification);
  return rows;
}

/** Create the custom hostname in Cloudflare and return its provisioning record. */
export async function provisionDomain(hostname: string): Promise<CustomHostnameRecord> {
  return hostnamesClient().create(hostname);
}

/** Remove the custom hostname from Cloudflare (404-tolerant). */
export async function deprovisionDomain(cfHostnameId: string): Promise<void> {
  await hostnamesClient().delete(cfHostnameId);
}

/** Point an active hostname at a function by writing the runtime KV index entry. */
export async function writeDomainIndex(
  hostname: string,
  target: { orgSlug: string; fnSlug: string },
): Promise<void> {
  const { api, namespaceId } = kvClient();
  await api.putKvBytes(
    namespaceId,
    hostname.toLowerCase(),
    new TextEncoder().encode(JSON.stringify(target)),
    { contentType: "application/json" },
  );
}

/** Remove a hostname from the runtime KV index (404-tolerant). */
export async function deleteDomainIndex(hostname: string): Promise<void> {
  const { api, namespaceId } = kvClient();
  await api.deleteKvKey(namespaceId, hostname.toLowerCase());
}

export interface RefreshResult {
  status: CustomDomainStatus;
  sslStatus: string;
  dcvRecords: DcvRecord[];
  ownershipVerification: DcvRecord | null;
}

/**
 * Re-fetch a domain's status from Cloudflare, persist it, and — on the
 * transition into `active` — publish the runtime KV index entry so the edge
 * starts routing the hostname. Returns the latest state for the UI poller.
 */
export async function refreshDomainStatus(domainId: string): Promise<RefreshResult | null> {
  const row = await db.query.customDomain.findFirst({
    where: eq(schema.customDomain.id, domainId),
    with: {
      fn: { columns: { slug: true } },
      organization: { columns: { slug: true } },
    },
  });
  if (!row || !row.cfHostnameId) return null;

  const record = await hostnamesClient().get(row.cfHostnameId);
  const status = mapCfStatus(record);
  const dcvRecords = collectDcvRecords(record);

  // Publish the route only once the hostname is fully live, and only on the
  // transition — never route an unvalidated host the user may not control.
  if (status === "active" && row.status !== "active") {
    await writeDomainIndex(row.hostname, {
      orgSlug: row.organization.slug,
      fnSlug: row.fn.slug,
    });
  }

  await db
    .update(schema.customDomain)
    .set({
      status,
      sslStatus: record.ssl.status,
      dcvRecords,
      ownershipVerification: record.ownershipVerification,
      lastError: status === "failed" ? `cloudflare: ${record.status}/${record.ssl.status}` : null,
      updatedAt: new Date(),
    })
    .where(eq(schema.customDomain.id, domainId));

  return {
    status,
    sslStatus: record.ssl.status,
    dcvRecords,
    ownershipVerification: record.ownershipVerification,
  };
}
