import { CloudflareApiCallError, type CloudflareApiError } from "./api.js";

const CF_API = "https://api.cloudflare.com/client/v4";

export interface CustomHostnameConfig {
  apiToken: string;
  /** Zone id of the dedicated Cloudflare for SaaS zone (e.g. `hostfunc.app`). */
  zoneId: string;
}

interface CfEnvelope<T> {
  success: boolean;
  errors: CloudflareApiError[];
  messages: unknown[];
  result: T;
}

/** Cloudflare custom hostname lifecycle (the `status` field). */
export type CustomHostnameStatus =
  | "pending"
  | "pending_deletion"
  | "active"
  | "active_redeploying"
  | "moved"
  | "deleted"
  | "blocked";

/** Cloudflare SSL state for the hostname's certificate (`ssl.status`). */
export type CustomHostnameSslStatus =
  | "initializing"
  | "pending_validation"
  | "pending_issuance"
  | "pending_deployment"
  | "pending_deletion"
  | "active"
  | "expired"
  | "deleted"
  | "deployment_timed_out"
  | "deletion_timed_out"
  | "validation_timed_out";

/** A single DNS record the user must add at their registrar. */
export interface CustomHostnameDnsRecord {
  kind: "txt" | "cname";
  name: string;
  value: string;
}

export interface CustomHostnameRecord {
  id: string;
  hostname: string;
  status: CustomHostnameStatus;
  ssl: {
    status: CustomHostnameSslStatus;
    /** TXT/CNAME records the user must add to prove control for DCV. */
    validationRecords: CustomHostnameDnsRecord[];
  };
  /** Ownership-verification record CF requires before activating the hostname. */
  ownershipVerification: CustomHostnameDnsRecord | null;
}

// --- Raw Cloudflare response shapes (subset we consume) ---

interface CfSslValidationRecord {
  txt_name?: string;
  txt_value?: string;
  cname?: string;
  cname_target?: string;
  http_url?: string;
  http_body?: string;
}

interface CfCustomHostname {
  id: string;
  hostname: string;
  status: CustomHostnameStatus;
  ssl: {
    status: CustomHostnameSslStatus;
    validation_records?: CfSslValidationRecord[];
  };
  ownership_verification?: { type?: string; name?: string; value?: string };
}

function mapValidationRecords(
  records: CfSslValidationRecord[] | undefined,
): CustomHostnameDnsRecord[] {
  const out: CustomHostnameDnsRecord[] = [];
  for (const r of records ?? []) {
    if (r.txt_name && r.txt_value) {
      out.push({ kind: "txt", name: r.txt_name, value: r.txt_value });
    }
    if (r.cname && r.cname_target) {
      out.push({ kind: "cname", name: r.cname, value: r.cname_target });
    }
  }
  return out;
}

function mapRecord(raw: CfCustomHostname): CustomHostnameRecord {
  const ownership =
    raw.ownership_verification?.name && raw.ownership_verification?.value
      ? {
          kind: (raw.ownership_verification.type === "cname" ? "cname" : "txt") as "txt" | "cname",
          name: raw.ownership_verification.name,
          value: raw.ownership_verification.value,
        }
      : null;

  return {
    id: raw.id,
    hostname: raw.hostname,
    status: raw.status,
    ssl: {
      status: raw.ssl.status,
      validationRecords: mapValidationRecords(raw.ssl.validation_records),
    },
    ownershipVerification: ownership,
  };
}

/**
 * Thin client for the Cloudflare for SaaS Custom Hostnames API, scoped to the
 * dedicated SaaS zone. Mirrors the envelope/error style of {@link CloudflareApi}.
 */
export class CloudflareCustomHostnames {
  constructor(private readonly cfg: CustomHostnameConfig) {}

  /** Provision a new custom hostname with TXT-based DCV for SSL. */
  async create(hostname: string): Promise<CustomHostnameRecord> {
    const res = await fetch(this.collectionUrl(), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        hostname,
        ssl: {
          method: "txt",
          type: "dv",
          settings: { min_tls_version: "1.2" },
        },
      }),
    });
    return this.parse(res, "create");
  }

  /** Fetch the current status (lifecycle + SSL + validation records). */
  async get(id: string): Promise<CustomHostnameRecord> {
    const res = await fetch(this.recordUrl(id), {
      method: "GET",
      headers: this.headers(),
    });
    return this.parse(res, "get");
  }

  /** Remove a custom hostname. A 404 is treated as success (already gone). */
  async delete(id: string): Promise<void> {
    const res = await fetch(this.recordUrl(id), {
      method: "DELETE",
      headers: this.headers(),
    });
    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      throw new CloudflareApiCallError(
        `cloudflare custom hostname delete failed (${res.status}): ${text}`,
        res.status,
        [],
      );
    }
  }

  private async parse(res: Response, op: string): Promise<CustomHostnameRecord> {
    const json = (await res.json()) as CfEnvelope<CfCustomHostname>;
    if (!res.ok || !json.success) {
      throw new CloudflareApiCallError(
        `cloudflare custom hostname ${op} failed (${res.status})`,
        res.status,
        json.errors ?? [],
      );
    }
    return mapRecord(json.result);
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.cfg.apiToken}`,
      "content-type": "application/json",
    };
  }

  private collectionUrl(): string {
    return `${CF_API}/zones/${this.cfg.zoneId}/custom_hostnames`;
  }

  private recordUrl(id: string): string {
    return `${CF_API}/zones/${this.cfg.zoneId}/custom_hostnames/${id}`;
  }
}
