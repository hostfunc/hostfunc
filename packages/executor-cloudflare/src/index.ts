import { createHash } from "node:crypto";
import {
  type BackendCapabilities,
  type DeployInput,
  type DeployResult,
  type ExecuteInput,
  type ExecuteResult,
  type ExecutorBackend,
  type FunctionId,
  HostFuncError,
  type LogLine,
  type VersionId,
} from "@hostfunc/executor-core";
import { CloudflareApi, CloudflareApiCallError } from "./api.js";
import { BundleError, type BundleResult, bundleFunction } from "./bundler.js";

export { BundleError, bundleFunction } from "./bundler.js";
export type { BundleAsset, BundleOptions, BundleResult } from "./bundler.js";

export interface CloudflareConfig {
  accountId: string;
  apiToken: string;
  /** Set to false to use regular Workers instead of WfP. */
  useWfp?: boolean;
  /** Required if useWfp = true. */
  namespace?: string;
  /** Where the dispatch worker lives, used by `execute()` for cron/email triggers. */
  runtimeBaseUrl?: string;
  fnIndexKvId?: string;
  /** KV namespace id for per-function asset blobs (binding name: FN_ASSETS_KV). */
  assetsKvId?: string;
}

export class CloudflareExecutor implements ExecutorBackend {
  readonly id = "cloudflare" as const;

  readonly capabilities: BackendCapabilities = {
    maxWallMs: 30_000,
    maxMemoryMb: 128,
    supportsCron: true,
    supportsWebsockets: true,
    supportsLongPoll: false,
    coldStartP50Ms: 5,
  };

  private readonly api: CloudflareApi;

  constructor(private readonly cfg: CloudflareConfig) {
    this.api = new CloudflareApi({
      accountId: cfg.accountId,
      apiToken: cfg.apiToken,
    });
  }

  async deploy(input: DeployInput): Promise<DeployResult> {
    const bundle: BundleResult = await bundleFunction({
      code: input.bundle.code,
      fnId: input.functionId,
      versionId: input.versionId,
      ...(input.assets ? { assets: input.assets } : {}),
    }).catch((e) => {
      if (e instanceof BundleError) {
        throw new HostFuncError("INFRA_DEPLOY_FAILED", e.message, e);
      }
      throw e;
    });

    const scriptName = scriptNameFor(input.functionId, input.versionId);

    try {
      const result = await this.api.uploadScript({
        target: this.target(),
        scriptName,
        moduleCode: bundle.code,
        ...(bundle.sourceMap ? { sourceMap: bundle.sourceMap } : {}),
        tags: [`org:${input.orgId}`, `fn:${input.functionId}`],
        // No FN_ASSETS_KV binding: user code runs in this isolate and could
        // read/enumerate/overwrite other tenants' asset blobs through a shared
        // KV binding. Non-embedded assets are served from the DB via the
        // control-plane asset route, scoped to this function+version.
        bindings: [
          { type: "plain_text", name: "HOSTFUNC_FN_ID", text: input.functionId },
          { type: "plain_text", name: "HOSTFUNC_VERSION_ID", text: input.versionId },
          { type: "plain_text", name: "HOSTFUNC_ORG_ID", text: input.orgId },
          ...(input.runtimeApiKey
            ? [{ type: "plain_text" as const, name: "HOSTFUNC_API_KEY", text: input.runtimeApiKey }]
            : []),
        ],
      });

      const deployResult: DeployResult & {
        sourceMap?: string;
        sourceMapSha256?: string;
      } = {
        versionId: input.versionId,
        handle: scriptName,
        deployedAt: result.modifiedOn,
        warnings: bundle.warnings,
        ...(bundle.sourceMap ? { sourceMap: bundle.sourceMap } : {}),
        ...(bundle.sourceMap
          ? { sourceMapSha256: createHash("sha256").update(bundle.sourceMap).digest("hex") }
          : {}),
      };
      return deployResult;
    } catch (e) {
      if (e instanceof CloudflareApiCallError) {
        const detail = e.errors.map((err) => `[${err.code}] ${err.message}`).join("; ");
        throw new HostFuncError(
          "INFRA_DEPLOY_FAILED",
          `cloudflare upload: ${detail || e.message}`,
          e,
        );
      }
      throw e;
    }
  }

  async execute(_input: ExecuteInput): Promise<ExecuteResult> {
    // Component 5: this routes through the dispatch worker.
    throw new HostFuncError("INFRA_EXECUTE_FAILED", "execute() not implemented until Component 5");
  }

  async delete(functionId: FunctionId, versionId: VersionId): Promise<void> {
    await this.api.deleteScript(this.target(), scriptNameFor(functionId, versionId));
  }

  // biome-ignore lint/correctness/useYield: skeleton until Component 5
  async *logs(_executionId: string): AsyncIterable<LogLine> {
    throw new HostFuncError("INFRA_EXECUTE_FAILED", "logs() not implemented until Component 5");
  }

  async health() {
    return { ok: true, checkedAt: new Date().toISOString() };
  }

  async purgeLookupCache(key: string): Promise<void> {
    if (!this.cfg.fnIndexKvId) return;
    await this.api.deleteKvKey(this.cfg.fnIndexKvId, key);
  }

  private target(): { kind: "wfp"; namespace: string } | { kind: "regular" } {
    if (this.cfg.useWfp === false) return { kind: "regular" };
    if (!this.cfg.namespace) {
      throw new HostFuncError("INFRA_DEPLOY_FAILED", "useWfp=true requires a namespace");
    }
    return { kind: "wfp", namespace: this.cfg.namespace };
  }
}

/**
 * Cloudflare script names: 1-63 chars, [a-z0-9_-], must start with [a-z0-9].
 * Our ids are like `fn_01HY...` and `ver_01HY...`. ULIDs are uppercase, so we
 * lowercase and strip the underscore prefixes to fit the regex.
 */
function scriptNameFor(fnId: FunctionId, versionId: VersionId): string {
  const f = fnId.replace(/^fn_/, "").toLowerCase();
  const v = versionId.replace(/^ver_/, "").toLowerCase();
  return `f-${f}-v-${v}`;
}
