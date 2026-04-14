import type {
  BackendCapabilities,
  ExecutorBackend,
} from "../backend.js";
import type {
  DeployInput,
  DeployResult,
  ExecuteInput,
  ExecuteResult,
  LogLine,
} from "../types.js";

export class LocalExecutor implements ExecutorBackend {
  readonly id = "selfhost" as const;

  readonly capabilities: BackendCapabilities = {
    maxWallMs: 30_000,
    maxMemoryMb: 512,
    supportsCron: true,
    supportsWebsockets: false,
    supportsLongPoll: true,
    coldStartP50Ms: 1,
  };

  async deploy(input: DeployInput): Promise<DeployResult> {
    return {
      versionId: input.versionId,
      handle: `local:${input.functionId}:${input.versionId}`,
      deployedAt: new Date().toISOString(),
      warnings: ["local executor fallback in use; deploy is control-plane only"],
    };
  }

  async execute(_input: ExecuteInput): Promise<ExecuteResult> {
    return {
      status: "infra_error",
      error: {
        code: "INFRA_EXECUTE_FAILED",
        message: "Local executor does not support direct execute() yet",
        userFault: false,
      },
      metrics: {
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        wallMs: 0,
        cpuMs: 0,
        memoryPeakMb: 0,
        egressBytes: 0,
        subrequestCount: 0,
        costUnits: 0,
      },
      logs: [],
    };
  }

  async delete(): Promise<void> {}

  logs(): AsyncIterable<LogLine> {
    return (async function* emptyLogs() {})();
  }

  async health() {
    return { ok: true, checkedAt: new Date().toISOString(), details: "local executor fallback" };
  }
}
