import { index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { fn } from "./functions.js";
import { organization } from "./organizations.js";

/**
 * A single DNS record the user must create at their registrar for either domain
 * control validation (DCV, for SSL issuance) or ownership/routing verification.
 * Surfaced verbatim from the Cloudflare Custom Hostnames API response.
 */
export interface DcvRecord {
  kind: "txt" | "cname";
  name: string;
  value: string;
}

/**
 * A DNS record the user must create for inbound email on their custom domain
 * (MX + verification records). Surfaced from the Resend Domains API response.
 */
export interface InboundEmailRecord {
  kind: "mx" | "txt" | "cname";
  name: string;
  value: string;
  priority?: number;
  /** Raw Resend per-record status, display only. */
  status?: string;
}

/**
 * Provisioning lifecycle for a custom domain:
 * - `pending_dns`  — created in Cloudflare; waiting for the user's DNS / ownership records.
 * - `pending_ssl`  — ownership verified; Cloudflare is issuing the TLS certificate.
 * - `active`       — hostname + certificate live; the runtime KV index routes it.
 * - `failed`       — Cloudflare reported an unrecoverable state (see `lastError`).
 */
export const customDomainStatusEnum = pgEnum("custom_domain_status", [
  "pending_dns",
  "pending_ssl",
  "active",
  "failed",
]);

export const customDomain = pgTable(
  "custom_domain",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** The deployed website/function this domain serves. */
    fnId: text("fn_id")
      .notNull()
      .references(() => fn.id, { onDelete: "cascade" }),
    /** The user-owned hostname, lowercased (e.g. `www.example.com`). */
    hostname: text("hostname").notNull(),
    /** Cloudflare custom hostname id; null until the CF create call succeeds. */
    cfHostnameId: text("cf_hostname_id"),
    status: customDomainStatusEnum("status").notNull().default("pending_dns"),
    /** Raw Cloudflare `ssl.status` string, kept for display only. */
    sslStatus: text("ssl_status"),
    /** DNS records (DCV + CNAME) the user must add at their registrar. */
    dcvRecords: jsonb("dcv_records").$type<DcvRecord[]>(),
    /** Cloudflare ownership-verification record, when CF requires one. */
    ownershipVerification: jsonb("ownership_verification").$type<DcvRecord | null>(),
    /** Last error surfaced by Cloudflare, shown when `status = failed`. */
    lastError: text("last_error"),
    /** Resend domain id once the domain is registered for inbound email. */
    resendDomainId: text("resend_domain_id"),
    /** Raw Resend domain status (e.g. not_started/pending/verified/failed). */
    emailStatus: text("email_status"),
    /** DNS records (MX + verification) the user must add for inbound email. */
    emailRecords: jsonb("email_records").$type<InboundEmailRecord[]>(),
    /** Last time we refreshed the Resend domain status. */
    emailStatusCheckedAt: timestamp("email_status_checked_at", { withTimezone: true }),
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // A hostname can only be claimed once across the whole platform.
    hostnameUnique: uniqueIndex("custom_domain_hostname_unique").on(t.hostname),
    orgIdx: index("custom_domain_org_idx").on(t.orgId),
    fnIdx: index("custom_domain_fn_idx").on(t.fnId),
  }),
);
