const CF_API = "https://api.cloudflare.com/client/v4";

export interface CloudflareApiConfig {
  accountId: string;
  apiToken: string;
}

interface DeleteKvResult {
  success: boolean;
}

export interface CloudflareApiError {
  code: number;
  message: string;
}

export class CloudflareApiCallError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors: CloudflareApiError[],
  ) {
    super(message);
    this.name = "CloudflareApiCallError";
  }
}

interface CfEnvelope<T> {
  success: boolean;
  errors: CloudflareApiError[];
  messages: unknown[];
  result: T;
}

export interface UploadScriptInput {
  /** Either { kind: "wfp", namespace } or { kind: "regular" }. */
  target:
    | { kind: "wfp"; namespace: string }
    | { kind: "regular" };
  scriptName: string;
  /** The bundled ES module source. */
  moduleCode: string;
  /** Optional source map (uploaded as a separate part). */
  sourceMap?: string;
  /** Tags for bulk operations later (org id, plan, etc.). */
  tags?: string[];
  /** Bindings to inject. Empty for v0. */
  bindings?: ScriptBinding[];
}

export type ScriptBinding =
  | { type: "plain_text"; name: string; text: string }
  | { type: "secret_text"; name: string; text: string }
  | { type: "kv_namespace"; name: string; namespace_id: string };

export interface UploadScriptResult {
  id: string;
  startupTimeMs: number;
  modifiedOn: string;
}

export class CloudflareApi {
  constructor(private readonly cfg: CloudflareApiConfig) {}

  async uploadScript(input: UploadScriptInput): Promise<UploadScriptResult> {
    const url = this.scriptUrl(input.target, input.scriptName);

    const metadata = {
      main_module: "worker.mjs",
      compatibility_date: "2025-01-01",
      compatibility_flags: ["nodejs_compat"],
      tags: input.tags ?? [],
      bindings: input.bindings ?? [],
    };

    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" }),
    );
    form.append(
      "worker.mjs",
      new Blob([input.moduleCode], { type: "application/javascript+module" }),
      "worker.mjs",
    );
    if (input.sourceMap) {
      form.append(
        "worker.mjs.map",
        new Blob([input.sourceMap], { type: "application/source-map" }),
        "worker.mjs.map",
      );
    }

    const res = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${this.cfg.apiToken}` },
      body: form,
    });

    const json = (await res.json()) as CfEnvelope<{
      id: string;
      startup_time_ms: number;
      modified_on: string;
    }>;

    if (!res.ok || !json.success) {
      throw new CloudflareApiCallError(
        `cloudflare upload failed (${res.status})`,
        res.status,
        json.errors ?? [],
      );
    }

    return {
      id: json.result.id,
      startupTimeMs: json.result.startup_time_ms,
      modifiedOn: json.result.modified_on,
    };
  }

  async deleteScript(
    target: UploadScriptInput["target"],
    scriptName: string,
  ): Promise<void> {
    const url = this.scriptUrl(target, scriptName);
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${this.cfg.apiToken}` },
    });
    // 200 or 404 are both fine — we want it gone either way.
    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      throw new CloudflareApiCallError(
        `cloudflare delete failed (${res.status}): ${text}`,
        res.status,
        [],
      );
    }
  }

  async deleteKvKey(namespaceId: string, key: string): Promise<DeleteKvResult> {
    const url = `${CF_API}/accounts/${this.cfg.accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${this.cfg.apiToken}` },
    });
    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      throw new CloudflareApiCallError(
        `cloudflare kv delete failed (${res.status}): ${text}`,
        res.status,
        [],
      );
    }
    return { success: res.ok || res.status === 404 };
  }

  private scriptUrl(target: UploadScriptInput["target"], scriptName: string): string {
    if (target.kind === "wfp") {
      return `${CF_API}/accounts/${this.cfg.accountId}/workers/dispatch/namespaces/${target.namespace}/scripts/${scriptName}`;
    }
    return `${CF_API}/accounts/${this.cfg.accountId}/workers/scripts/${scriptName}`;
  }
}