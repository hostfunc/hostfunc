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

export interface CloudflareConfig {
  accountId: string;
  apiToken: string;
  namespace: string;
  runtimeSdkUrl: string;
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

  deploy(_input: DeployInput): Promise<DeployResult> {
    throw new HostFuncError("INFRA_DEPLOY_FAILED", "not implemented");
  }

  execute(_input: ExecuteInput): Promise<ExecuteResult> {
    throw new HostFuncError("INFRA_EXECUTE_FAILED", "not implemented");
  }

  delete(_functionId: FunctionId, _versionId: VersionId): Promise<void> {
    throw new HostFuncError("INFRA_EXECUTE_FAILED", "not implemented");
  }

  // biome-ignore lint/correctness/useYield: skeleton
  async *logs(_executionId: string): AsyncIterable<LogLine> {
    throw new HostFuncError("INFRA_EXECUTE_FAILED", "not implemented");
  }

  async health() {
    return { ok: true, checkedAt: new Date().toISOString() };
  }
}
