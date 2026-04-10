// packages/executor-core/src/backend.ts

import type {
  DeployInput,
  DeployResult,
  ExecuteInput,
  ExecuteResult,
  ExecutionId,
  FunctionId,
  LogLine,
  LogQuery,
  VersionId,
} from "./types.ts";

export interface ExecutorBackend {
  readonly id: BackendId;
  readonly capabilities: BackendCapabilities;

  /** Provision/update a function version. Idempotent on (functionId, versionId). */
  deploy(input: DeployInput): Promise<DeployResult>;

  /** Run one invocation. Synchronous from caller's POV. */
  execute(input: ExecuteInput): Promise<ExecuteResult>;

  /** Tear down a version (after retention window). */
  delete(functionId: FunctionId, versionId: VersionId): Promise<void>;

  /** Stream logs for a past or in-flight execution. */
  logs(executionId: ExecutionId, opts?: LogQuery): AsyncIterable<LogLine>;

  /** Health check used by the runtime edge router. */
  health(): Promise<HealthStatus>;
}

export type BackendId = "cloudflare" | "lambda" | "fly" | "deno" | "selfhost";

export interface BackendCapabilities {
  maxWallMs: number;
  maxMemoryMb: number;
  supportsCron: boolean;
  supportsWebsockets: boolean;
  supportsLongPoll: boolean;
  /** Cold start p50 in ms — used by router for latency-sensitive routing. */
  coldStartP50Ms: number;
}

export interface HealthStatus {
  ok: boolean;
  details?: string;
  checkedAt: string;
}
