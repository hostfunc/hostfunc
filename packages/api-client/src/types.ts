/**
 * Wire types for the hostfunc control-plane `/api/cli/*` surface.
 *
 * These mirror the route handlers under `apps/web/src/app/api/cli/**`. Keep them in sync when a
 * route's response shape changes — this package is the single typed contract shared by the CLI
 * (`@hostfunc/cli`) and the VS Code extension.
 */

export type TriggerKind = "http" | "cron" | "email" | "mcp";

export type ExecutionStatus = "ok" | "fn_error" | "limit_exceeded" | "infra_error";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface CliActor {
  tokenId: string;
  orgId: string;
  userId: string;
  name: string;
}

export interface OrgMembership {
  orgId: string;
  role: string;
  orgName: string;
  orgSlug: string;
}

export interface LoginCheckResult {
  ok: true;
  actor: CliActor;
  membership: OrgMembership | null;
}

export interface FunctionSummary {
  id: string;
  slug: string;
  orgSlug: string;
  description: string | null;
  logo: string | null;
  visibility: "public" | "private";
  currentVersionId: string | null;
  packageCount?: number;
  envVarCount?: number;
  executionCount?: number;
  latestExecutionStatus?: ExecutionStatus | null;
}

export interface ListFunctionsResult {
  ok: true;
  items: FunctionSummary[];
}

export interface DeployResult {
  ok: true;
  versionId: string;
  runUrl: string;
}

export interface RunResult {
  ok: boolean;
  status: number;
  executionId: string | null;
  result: unknown;
}

export interface LogLine {
  ts: string;
  level: LogLevel;
  message: string;
  fields: Record<string, unknown> | null;
}

export interface LogsResult {
  ok: true;
  executionId: string | null;
  logs: LogLine[];
}

export interface ListOrgsResult {
  ok: true;
  orgs: OrgMembership[];
}

export interface DeviceExchangeResult {
  ok: true;
  token: string;
  orgId: string;
  orgSlug: string;
  orgName: string;
  userId: string;
}

export interface CreateFunctionInput {
  slug: string;
  description?: string;
  starterCode?: string;
  visibility?: "public" | "private";
}

export interface CreateFunctionResult {
  ok: true;
  fnId: string;
  slug: string;
}

export interface DraftResult {
  ok: true;
  code: string;
  sha256: string;
  source: "draft" | "version" | "empty";
}

export interface PushDraftResult {
  ok: true;
  sha256: string;
}

/** Returned (HTTP 409) when a `push` conflicts with a newer server-side draft. */
export interface DraftConflict {
  error: "conflict";
  serverCode: string;
  serverSha256: string;
}
