import type {
  FunctionEnvFilter,
  FunctionGithubFilter,
  FunctionLastRun,
  FunctionSort,
  FunctionStatus,
  FunctionTriggerKind,
  FunctionUpdatedWithin,
} from "@/server/functions";

export const FUNCTION_SORTS: FunctionSort[] = [
  "updated_desc",
  "name_asc",
  "execs_desc",
  "failures_desc",
];

export const FUNCTION_LAST_RUNS: FunctionLastRun[] = ["ok", "error", "none"];
export const FUNCTION_TRIGGER_KINDS: FunctionTriggerKind[] = ["http", "cron", "email", "mcp"];
export const FUNCTION_UPDATED_WITHIN_VALUES: FunctionUpdatedWithin[] = ["24h", "7d", "30d", "90d"];

export interface ParsedFunctionFilters {
  q?: string;
  visibility?: "public" | "private";
  status?: FunctionStatus;
  lastRun?: FunctionLastRun[];
  github?: FunctionGithubFilter;
  env?: FunctionEnvFilter;
  trigger?: FunctionTriggerKind[];
  updatedWithin?: FunctionUpdatedWithin;
  sort?: FunctionSort;
  view?: "grid" | "list";
}

function oneOf<T extends string>(
  value: string | undefined | null,
  allowed: readonly T[],
): T | undefined {
  if (!value) return undefined;
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

function manyOf<T extends string>(values: string[], allowed: readonly T[]): T[] {
  const seen = new Set<T>();
  for (const v of values) {
    if ((allowed as readonly string[]).includes(v)) {
      seen.add(v as T);
    }
  }
  return [...seen];
}

/**
 * Parse a URLSearchParams / record into validated function filter state.
 * Supports repeated keys (e.g. `?lastRun=ok&lastRun=error`) and comma-separated (`?lastRun=ok,error`).
 */
export function parseFunctionFilters(params: URLSearchParams): ParsedFunctionFilters {
  const q = params.get("q")?.trim() || undefined;

  const rawLastRun = [
    ...params.getAll("lastRun"),
    ...(params.get("lastRun")?.includes(",") ? (params.get("lastRun") ?? "").split(",") : []),
  ].filter(Boolean);
  const rawTrigger = [
    ...params.getAll("trigger"),
    ...(params.get("trigger")?.includes(",") ? (params.get("trigger") ?? "").split(",") : []),
  ].filter(Boolean);

  const parsed: ParsedFunctionFilters = {};
  if (q) parsed.q = q;
  const visibility = oneOf(params.get("visibility"), ["public", "private"] as const);
  if (visibility) parsed.visibility = visibility;
  const status = oneOf(params.get("status"), ["deployed", "draft"] as const);
  if (status) parsed.status = status;
  const lastRun = manyOf(rawLastRun, FUNCTION_LAST_RUNS);
  if (lastRun.length > 0) parsed.lastRun = lastRun;
  const github = oneOf(params.get("github"), ["linked", "unlinked"] as const);
  if (github) parsed.github = github;
  const env = oneOf(params.get("env"), ["any", "none"] as const);
  if (env) parsed.env = env;
  const trigger = manyOf(rawTrigger, FUNCTION_TRIGGER_KINDS);
  if (trigger.length > 0) parsed.trigger = trigger;
  const updatedWithin = oneOf(params.get("updatedWithin"), FUNCTION_UPDATED_WITHIN_VALUES);
  if (updatedWithin) parsed.updatedWithin = updatedWithin;
  const sort = oneOf(params.get("sort"), FUNCTION_SORTS);
  if (sort) parsed.sort = sort;
  const view = oneOf(params.get("view"), ["grid", "list"] as const);
  if (view) parsed.view = view;
  return parsed;
}

/**
 * Convert structured filters back into a URLSearchParams for navigation.
 * Multi-select categories are serialized as repeated keys.
 */
export function serializeFunctionFilters(filters: ParsedFunctionFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.visibility) params.set("visibility", filters.visibility);
  if (filters.status) params.set("status", filters.status);
  if (filters.lastRun && filters.lastRun.length > 0) {
    for (const v of filters.lastRun) params.append("lastRun", v);
  }
  if (filters.github) params.set("github", filters.github);
  if (filters.env) params.set("env", filters.env);
  if (filters.trigger && filters.trigger.length > 0) {
    for (const v of filters.trigger) params.append("trigger", v);
  }
  if (filters.updatedWithin) params.set("updatedWithin", filters.updatedWithin);
  if (filters.sort && filters.sort !== "updated_desc") params.set("sort", filters.sort);
  if (filters.view && filters.view !== "grid") params.set("view", filters.view);
  return params;
}

export function filterCount(filters: ParsedFunctionFilters): number {
  let n = 0;
  if (filters.q) n += 1;
  if (filters.visibility) n += 1;
  if (filters.status) n += 1;
  if (filters.lastRun) n += filters.lastRun.length;
  if (filters.github) n += 1;
  if (filters.env) n += 1;
  if (filters.trigger) n += filters.trigger.length;
  if (filters.updatedWithin) n += 1;
  return n;
}
