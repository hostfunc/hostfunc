// packages/executor-core/src/types.ts

/* ───────────────────────────── Identity ───────────────────────────── */

export type FunctionId = string; // "fn_01HY..." (ulid)
export type VersionId = string; // "ver_01HY..."
export type ExecutionId = string; // "exec_01HY..."
export type OrgId = string;

/* ───────────────────────────── Deploy ───────────────────────────── */

export interface DeployInput {
  functionId: FunctionId;
  versionId: VersionId;
  orgId: OrgId;
  /** Optional runtime auth key passed to hosted SDK context. */
  runtimeApiKey?: string;

  /** Bundled, tree-shaken ESM. Must export `main(input?)`. */
  bundle: {
    code: string; // utf8 source
    sourceMap?: string; // optional
    sizeBytes: number;
    sha256: string;
  };

  /** Schemas the function declared (zod-to-json-schema). */
  inputSchema?: unknown;
  outputSchema?: unknown;

  /** Per-deploy resource ceiling. Plan-derived, server-enforced. */
  limits: ResourceLimits;

  /** Encrypted secret references — never plaintext at this layer. */
  secretRefs: SecretRef[];
}

export interface DeployResult {
  versionId: VersionId;
  /** Backend-internal handle (e.g. CF script name, Lambda ARN). */
  handle: string;
  deployedAt: string; // ISO
  warnings?: string[]; // bundler warnings, missing schemas, etc.
}

/* ───────────────────────────── Execute ───────────────────────────── */

export interface ExecuteInput {
  executionId: ExecutionId;
  functionId: FunctionId;
  versionId: VersionId;
  orgId: OrgId;

  /** Already-validated against inputSchema by the runtime edge. */
  payload: unknown;

  trigger: TriggerContext;

  /** Always present. Used for fn-call loop detection. */
  callChain: CallChainEntry[];

  /** OTel propagation. */
  traceparent?: string;
  tracestate?: string;

  /** Plan-derived, never trusts client. */
  limits: ResourceLimits;

  /** Idempotency key from caller, if any. */
  idempotencyKey?: string;
}

export interface ExecuteResult {
  status: "ok" | "fn_error" | "limit_exceeded" | "infra_error";
  output?: unknown;
  error?: ExecutionError;
  metrics: ExecutionMetrics;
  logs: LogLine[]; // structured, secret-redacted
}

export interface ExecutionMetrics {
  startedAt: string;
  endedAt: string;
  wallMs: number;
  cpuMs: number;
  memoryPeakMb: number;
  egressBytes: number;
  subrequestCount: number;
  /** Backend-specific cost units, normalized later. */
  costUnits: number;
}

export interface ExecutionError {
  code: ErrorCode;
  message: string;
  /** Stack with user-frame paths only (system frames stripped). */
  stack?: string;
  /** True if the error originated in user code, false if infra. */
  userFault: boolean;
}

export type ErrorCode =
  | "FN_THREW"
  | "FN_TIMEOUT_WALL"
  | "FN_TIMEOUT_CPU"
  | "FN_OOM"
  | "FN_EGRESS_LIMIT"
  | "FN_SUBREQUEST_LIMIT"
  | "FN_CALL_DEPTH"
  | "FN_CALL_TIMEOUT"
  | "FN_EXECUTE_FAILED"
  | "FN_NOT_FOUND"
  | "FN_INPUT_INVALID"
  | "FN_OUTPUT_INVALID"
  | "MISSING_SECRET"
  | "INFRA_DEPLOY_FAILED"
  | "INFRA_EXECUTE_FAILED"
  | "INFRA_UNAVAILABLE";

/* ───────────────────────────── Triggers ───────────────────────────── */

export type TriggerContext =
  | { kind: "http"; method: string; headers: Record<string, string>; ip: string }
  | { kind: "cron"; schedule: string; scheduledFor: string }
  | { kind: "email"; from: string; to: string; subject: string; messageId: string }
  | { kind: "mcp"; agent: string; userId: string; toolCallId: string }
  | { kind: "fn_call"; parentExecutionId: ExecutionId; parentFn: string };

export interface CallChainEntry {
  functionId: FunctionId;
  executionId: ExecutionId;
}

/* ───────────────────────────── Limits & Secrets ───────────────────────────── */

export interface ResourceLimits {
  wallMs: number;
  cpuMs: number;
  memoryMb: number;
  egressKb: number;
  subrequests: number;
  maxCallDepth: number;
}

export interface SecretRef {
  /** The name the user accesses it by inside their fn. */
  key: string;
  /** Wrapped DEK + ciphertext pointer. Decryption is backend-side. */
  wrapped: string;
}

/* ───────────────────────────── Logs ───────────────────────────── */

export interface LogLine {
  ts: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  /** Structured fields if user used console.log({...}) */
  fields?: Record<string, unknown>;
}

export interface LogQuery {
  since?: string;
  until?: string;
  cursor?: string;
  limit?: number;
}
