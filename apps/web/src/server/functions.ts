import "server-only";

import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { env } from "@/lib/env";
import { DEFAULT_FUNCTION_SDK, type FunctionPackageRecord } from "@/lib/function-packages";
import { getLatestNpmVersion } from "@/lib/npm-registry";
import { getEffectivePlan } from "@/server/plans";
import { db, genId, schema, sql } from "@hostfunc/db";
const DEFAULT_NODE_TYPES = "@types/node";


type DbInsertExecutor = Pick<typeof db, "insert">;

function compat<T>(value: T): T {
  return value;
}

function buildDeployedUrl(
  orgSlug: string,
  slug: string,
  currentVersionId: string | null,
): string | null {
  if (!currentVersionId) return null;
  return `${env.HOSTFUNC_RUNTIME_URL}/run/${orgSlug}/${slug}`;
}

export interface FunctionExplorerItem {
  id: string;
  createdById: string;
  orgSlug: string;
  slug: string;
  description: string | null;
  visibility: "public" | "private";
  currentVersionId: string | null;
  packageCount: number;
  envVarCount: number;
  executionCount: number;
  latestExecutionStatus: "ok" | "fn_error" | "limit_exceeded" | "infra_error" | null;
  hasGithubBinding: boolean;
  updatedAt: Date;
  deployedUrl: string | null;
}

export interface FunctionPaginationResult {
  items: FunctionExplorerItem[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

export type FunctionSort = "updated_desc" | "name_asc" | "execs_desc" | "failures_desc";

export type FunctionLastRun = "ok" | "error" | "none";
export type FunctionStatus = "deployed" | "draft";
export type FunctionGithubFilter = "linked" | "unlinked";
export type FunctionEnvFilter = "any" | "none";
export type FunctionTriggerKind = "http" | "cron" | "email" | "mcp";
export type FunctionUpdatedWithin = "24h" | "7d" | "30d" | "90d";
export type MarketplaceCategory =
  | "utilities"
  | "ai"
  | "data"
  | "integrations"
  | "notifications"
  | "webhooks"
  | "automation";
export type MarketplaceSort = "featured" | "trending" | "recent" | "stars" | "forks";

export const MARKETPLACE_CATEGORIES: MarketplaceCategory[] = [
  "utilities",
  "ai",
  "data",
  "integrations",
  "notifications",
  "webhooks",
  "automation",
];

export interface FunctionSearchFilters {
  query?: string;
  visibility?: "public" | "private";
  status?: FunctionStatus;
  lastRun?: FunctionLastRun[];
  github?: FunctionGithubFilter;
  env?: FunctionEnvFilter;
  triggers?: FunctionTriggerKind[];
  updatedWithin?: FunctionUpdatedWithin;
  sort?: FunctionSort;
}

type FunctionCursor =
  | { s: "updated_desc"; t: string; id: string }
  | { s: "name_asc"; slug: string; id: string }
  | { s: "execs_desc"; n: number; id: string }
  | { s: "failures_desc"; n: number; id: string };

function encodeFunctionCursor(cursor: FunctionCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeFunctionCursor(cursor?: string): FunctionCursor | null {
  if (!cursor) return null;
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      s?: string;
      t?: string;
      slug?: string;
      n?: number;
      id?: string;
    };
    if (!decoded.id || !decoded.s) return null;
    switch (decoded.s) {
      case "updated_desc":
        if (!decoded.t) return null;
        return { s: "updated_desc", t: decoded.t, id: decoded.id };
      case "name_asc":
        if (typeof decoded.slug !== "string") return null;
        return { s: "name_asc", slug: decoded.slug, id: decoded.id };
      case "execs_desc":
        if (typeof decoded.n !== "number") return null;
        return { s: "execs_desc", n: decoded.n, id: decoded.id };
      case "failures_desc":
        if (typeof decoded.n !== "number") return null;
        return { s: "failures_desc", n: decoded.n, id: decoded.id };
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function toPackageRecord(
  name: string,
  source: FunctionPackageRecord["source"],
  version: string | null,
): FunctionPackageRecord {
  return {
    name,
    source,
    version,
    updatedAt: new Date().toISOString(),
  };
}

function encodeOffsetCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ offset }), "utf8").toString("base64url");
}

function decodeOffsetCursor(cursor?: string): number {
  if (!cursor) return 0;
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      offset?: unknown;
    };
    return typeof decoded.offset === "number" && decoded.offset >= 0 ? decoded.offset : 0;
  } catch {
    return 0;
  }
}

function normalizePackages(
  packages: FunctionPackageRecord[] | null | undefined,
): FunctionPackageRecord[] {
  const byName = new Map<string, FunctionPackageRecord>();
  for (const pkg of packages ?? []) {
    if (!pkg?.name) continue;
    byName.set(pkg.name, pkg);
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function ensureDefaultSdk(
  packages: FunctionPackageRecord[] | null | undefined,
): Promise<FunctionPackageRecord[]> {
  const normalized = normalizePackages(packages);
  if (normalized.some((pkg) => pkg.name === DEFAULT_FUNCTION_SDK)) return normalized;
  const latest = await getLatestNpmVersion(DEFAULT_FUNCTION_SDK);
  return normalizePackages([
    ...normalized,
    toPackageRecord(DEFAULT_FUNCTION_SDK, "default", latest),
  ]);
}

export async function listFunctionsForOrg(orgId: string) {
  const rows = await db
    .select({
      id: schema.fn.id,
      createdById: schema.fn.createdById,
      orgSlug: schema.organization.slug,
      slug: schema.fn.slug,
      description: schema.fn.description,
      visibility: schema.fn.visibility,
      currentVersionId: schema.fn.currentVersionId,
      packageCount: sql<number>`coalesce(jsonb_array_length(${schema.fn.packages}), 0)`,
      envVarCount: sql<number>`(
        select count(*)::int
        from ${schema.secret}
        where ${schema.secret.orgId} = ${schema.fn.orgId}
          and ${schema.secret.fnId} = ${schema.fn.id}
      )`,
      executionCount: sql<number>`(
        select count(*)::int
        from ${schema.execution}
        where ${schema.execution.fnId} = ${schema.fn.id}
      )`,
      latestExecutionStatus: sql<"ok" | "fn_error" | "limit_exceeded" | "infra_error" | null>`(
        select ${schema.execution.status}
        from ${schema.execution}
        where ${schema.execution.fnId} = ${schema.fn.id}
        order by ${schema.execution.startedAt} desc
        limit 1
      )`,
      hasGithubBinding: sql<boolean>`exists(
        select 1
        from ${schema.functionGitBinding}
        where ${schema.functionGitBinding.orgId} = ${schema.fn.orgId}
          and ${schema.functionGitBinding.fnId} = ${schema.fn.id}
          and ${schema.functionGitBinding.provider} = 'github'
      )`,
      updatedAt: schema.fn.updatedAt,
    })
    .from(schema.fn)
    .innerJoin(schema.organization, sql`${schema.organization.id} = ${schema.fn.orgId}`)
    .where(compat(sql`${schema.fn.orgId} = ${orgId}`) as never)
    .orderBy(compat(sql`${schema.fn.updatedAt} desc`) as never);

  return rows.map((row) => ({
    ...row,
    deployedUrl: buildDeployedUrl(row.orgSlug, row.slug, row.currentVersionId),
  }));
}
export async function searchFunctionsForOrg(orgId: string, query?: string, visibility?: string) {
  const conditions = [sql`${schema.fn.orgId} = ${orgId}`];

  if (query) {
    const q = `%${query}%`;
    conditions.push(sql`(${schema.fn.slug} ilike ${q} or ${schema.fn.description} ilike ${q})`);
  }

  if (visibility && (visibility === "public" || visibility === "private")) {
    conditions.push(sql`${schema.fn.visibility} = ${visibility}`);
  }

  const whereClause = conditions.reduce((acc, condition) => sql`${acc} and ${condition}`);

  const rows = await db
    .select({
      id: schema.fn.id,
      createdById: schema.fn.createdById,
      orgSlug: schema.organization.slug,
      slug: schema.fn.slug,
      description: schema.fn.description,
      visibility: schema.fn.visibility,
      currentVersionId: schema.fn.currentVersionId,
      packageCount: sql<number>`coalesce(jsonb_array_length(${schema.fn.packages}), 0)`,
      envVarCount: sql<number>`(
        select count(*)::int
        from ${schema.secret}
        where ${schema.secret.orgId} = ${schema.fn.orgId}
          and ${schema.secret.fnId} = ${schema.fn.id}
      )`,
      executionCount: sql<number>`(
        select count(*)::int
        from ${schema.execution}
        where ${schema.execution.fnId} = ${schema.fn.id}
      )`,
      latestExecutionStatus: sql<"ok" | "fn_error" | "limit_exceeded" | "infra_error" | null>`(
        select ${schema.execution.status}
        from ${schema.execution}
        where ${schema.execution.fnId} = ${schema.fn.id}
        order by ${schema.execution.startedAt} desc
        limit 1
      )`,
      hasGithubBinding: sql<boolean>`exists(
        select 1
        from ${schema.functionGitBinding}
        where ${schema.functionGitBinding.orgId} = ${schema.fn.orgId}
          and ${schema.functionGitBinding.fnId} = ${schema.fn.id}
          and ${schema.functionGitBinding.provider} = 'github'
      )`,
      updatedAt: schema.fn.updatedAt,
    })
    .from(schema.fn)
    .innerJoin(schema.organization, sql`${schema.organization.id} = ${schema.fn.orgId}`)
    .where(compat(whereClause) as never)
    .orderBy(compat(sql`${schema.fn.updatedAt} desc`) as never);

  return rows.map((row) => ({
    ...row,
    deployedUrl: buildDeployedUrl(row.orgSlug, row.slug, row.currentVersionId),
  }));
}

const EXEC_COUNT_SQL = sql<number>`(
  select count(*)::int
  from ${schema.execution}
  where ${schema.execution.fnId} = ${schema.fn.id}
)`;

const FAILURE_COUNT_SQL = sql<number>`(
  select count(*)::int
  from ${schema.execution}
  where ${schema.execution.fnId} = ${schema.fn.id}
    and ${schema.execution.status} <> 'ok'
)`;

const LATEST_EXEC_STATUS_SQL = sql<"ok" | "fn_error" | "limit_exceeded" | "infra_error" | null>`(
  select ${schema.execution.status}
  from ${schema.execution}
  where ${schema.execution.fnId} = ${schema.fn.id}
  order by ${schema.execution.startedAt} desc
  limit 1
)`;

const HAS_GITHUB_BINDING_SQL = sql<boolean>`exists(
  select 1
  from ${schema.functionGitBinding}
  where ${schema.functionGitBinding.orgId} = ${schema.fn.orgId}
    and ${schema.functionGitBinding.fnId} = ${schema.fn.id}
    and ${schema.functionGitBinding.provider} = 'github'
)`;

const ENV_COUNT_SQL = sql<number>`(
  select count(*)::int
  from ${schema.secret}
  where ${schema.secret.orgId} = ${schema.fn.orgId}
    and ${schema.secret.fnId} = ${schema.fn.id}
)`;

function buildFunctionSearchConditions(
  orgId: string,
  filters: FunctionSearchFilters,
): ReturnType<typeof sql>[] {
  const conditions: ReturnType<typeof sql>[] = [sql`${schema.fn.orgId} = ${orgId}`];

  if (filters.query) {
    const q = `%${filters.query}%`;
    conditions.push(sql`(${schema.fn.slug} ilike ${q} or ${schema.fn.description} ilike ${q})`);
  }

  if (filters.visibility === "public" || filters.visibility === "private") {
    conditions.push(sql`${schema.fn.visibility} = ${filters.visibility}`);
  }

  if (filters.status === "deployed") {
    conditions.push(sql`${schema.fn.currentVersionId} is not null`);
  } else if (filters.status === "draft") {
    conditions.push(sql`${schema.fn.currentVersionId} is null`);
  }

  if (filters.lastRun && filters.lastRun.length > 0) {
    const parts: ReturnType<typeof sql>[] = [];
    for (const v of filters.lastRun) {
      if (v === "ok") {
        parts.push(sql`${LATEST_EXEC_STATUS_SQL} = 'ok'`);
      } else if (v === "error") {
        parts.push(sql`${LATEST_EXEC_STATUS_SQL} in ('fn_error','limit_exceeded','infra_error')`);
      } else if (v === "none") {
        parts.push(sql`${LATEST_EXEC_STATUS_SQL} is null`);
      }
    }
    if (parts.length > 0) {
      const joined = parts.reduce((acc, p) => sql`${acc} or ${p}`);
      conditions.push(sql`(${joined})`);
    }
  }

  if (filters.github === "linked") {
    conditions.push(sql`${HAS_GITHUB_BINDING_SQL}`);
  } else if (filters.github === "unlinked") {
    conditions.push(sql`not ${HAS_GITHUB_BINDING_SQL}`);
  }

  if (filters.env === "any") {
    conditions.push(sql`${ENV_COUNT_SQL} > 0`);
  } else if (filters.env === "none") {
    conditions.push(sql`${ENV_COUNT_SQL} = 0`);
  }

  if (filters.triggers && filters.triggers.length > 0) {
    const kinds = filters.triggers;
    const tuple = sql.join(
      kinds.map((k) => sql`${k}`),
      sql`, `,
    );
    conditions.push(sql`exists(
      select 1 from ${schema.trigger}
      where ${schema.trigger.fnId} = ${schema.fn.id}
        and ${schema.trigger.kind} in (${tuple})
    )`);
  }

  if (filters.updatedWithin) {
    const interval =
      filters.updatedWithin === "24h"
        ? "24 hours"
        : filters.updatedWithin === "7d"
          ? "7 days"
          : filters.updatedWithin === "30d"
            ? "30 days"
            : "90 days";
    conditions.push(sql`${schema.fn.updatedAt} >= now() - ${sql.raw(`interval '${interval}'`)}`);
  }

  return conditions;
}

function buildCursorCondition(cursor: FunctionCursor): ReturnType<typeof sql> {
  switch (cursor.s) {
    case "updated_desc":
      return sql`(${schema.fn.updatedAt} < ${cursor.t} or (${schema.fn.updatedAt} = ${cursor.t} and ${schema.fn.id} < ${cursor.id}))`;
    case "name_asc":
      return sql`(${schema.fn.slug} > ${cursor.slug} or (${schema.fn.slug} = ${cursor.slug} and ${schema.fn.id} > ${cursor.id}))`;
    case "execs_desc":
      return sql`(${EXEC_COUNT_SQL} < ${cursor.n} or (${EXEC_COUNT_SQL} = ${cursor.n} and ${schema.fn.id} < ${cursor.id}))`;
    case "failures_desc":
      return sql`(${FAILURE_COUNT_SQL} < ${cursor.n} or (${FAILURE_COUNT_SQL} = ${cursor.n} and ${schema.fn.id} < ${cursor.id}))`;
  }
}

function orderByForSort(sort: FunctionSort): ReturnType<typeof sql> {
  switch (sort) {
    case "updated_desc":
      return sql`${schema.fn.updatedAt} desc, ${schema.fn.id} desc`;
    case "name_asc":
      return sql`${schema.fn.slug} asc, ${schema.fn.id} asc`;
    case "execs_desc":
      return sql`${EXEC_COUNT_SQL} desc, ${schema.fn.id} desc`;
    case "failures_desc":
      return sql`${FAILURE_COUNT_SQL} desc, ${schema.fn.id} desc`;
  }
}

function cursorForRow(
  sort: FunctionSort,
  row: FunctionExplorerItem,
  failureCount: number,
): FunctionCursor {
  switch (sort) {
    case "updated_desc":
      return { s: "updated_desc", t: row.updatedAt.toISOString(), id: row.id };
    case "name_asc":
      return { s: "name_asc", slug: row.slug, id: row.id };
    case "execs_desc":
      return { s: "execs_desc", n: row.executionCount, id: row.id };
    case "failures_desc":
      return { s: "failures_desc", n: failureCount, id: row.id };
  }
}

export async function searchFunctionsForOrgPaginated(input: {
  orgId: string;
  query?: string;
  visibility?: string;
  status?: FunctionStatus;
  lastRun?: FunctionLastRun[];
  github?: FunctionGithubFilter;
  env?: FunctionEnvFilter;
  triggers?: FunctionTriggerKind[];
  updatedWithin?: FunctionUpdatedWithin;
  sort?: FunctionSort;
  limit?: number;
  cursor?: string;
}): Promise<FunctionPaginationResult> {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 50);
  const sort: FunctionSort = input.sort ?? "updated_desc";

  const visibilityNormalized: "public" | "private" | undefined =
    input.visibility === "public" || input.visibility === "private" ? input.visibility : undefined;

  const filters: FunctionSearchFilters = {
    ...(input.query ? { query: input.query } : {}),
    ...(visibilityNormalized ? { visibility: visibilityNormalized } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.lastRun && input.lastRun.length > 0 ? { lastRun: input.lastRun } : {}),
    ...(input.github ? { github: input.github } : {}),
    ...(input.env ? { env: input.env } : {}),
    ...(input.triggers && input.triggers.length > 0 ? { triggers: input.triggers } : {}),
    ...(input.updatedWithin ? { updatedWithin: input.updatedWithin } : {}),
    sort,
  };

  const baseConditions = buildFunctionSearchConditions(input.orgId, filters);

  const cursor = decodeFunctionCursor(input.cursor);
  const hasValidCursor = cursor && cursor.s === sort;
  const conditions = hasValidCursor
    ? [...baseConditions, buildCursorCondition(cursor)]
    : baseConditions;
  const whereClause = conditions.reduce((acc, condition) => sql`${acc} and ${condition}`);

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: schema.fn.id,
        createdById: schema.fn.createdById,
        orgSlug: schema.organization.slug,
        slug: schema.fn.slug,
        description: schema.fn.description,
        visibility: schema.fn.visibility,
        currentVersionId: schema.fn.currentVersionId,
        packageCount: sql<number>`coalesce(jsonb_array_length(${schema.fn.packages}), 0)`,
        envVarCount: ENV_COUNT_SQL,
        executionCount: EXEC_COUNT_SQL,
        failureCount: FAILURE_COUNT_SQL,
        latestExecutionStatus: LATEST_EXEC_STATUS_SQL,
        hasGithubBinding: HAS_GITHUB_BINDING_SQL,
        updatedAt: schema.fn.updatedAt,
      })
      .from(schema.fn)
      .innerJoin(schema.organization, sql`${schema.organization.id} = ${schema.fn.orgId}`)
      .where(compat(whereClause) as never)
      .orderBy(compat(orderByForSort(sort)) as never)
      .limit(limit + 1),
    // Total is computed against base conditions (ignoring cursor) so it's stable across pages.
    (async () => {
      const baseWhere = baseConditions.reduce((acc, condition) => sql`${acc} and ${condition}`);
      const result = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(schema.fn)
        .where(compat(baseWhere) as never);
      return result[0]?.total ?? 0;
    })(),
  ]);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const items: FunctionExplorerItem[] = page.map((row) => ({
    id: row.id,
    createdById: row.createdById,
    orgSlug: row.orgSlug,
    slug: row.slug,
    description: row.description,
    visibility: row.visibility,
    currentVersionId: row.currentVersionId,
    packageCount: row.packageCount,
    envVarCount: row.envVarCount,
    executionCount: row.executionCount,
    latestExecutionStatus: row.latestExecutionStatus,
    hasGithubBinding: row.hasGithubBinding,
    updatedAt: row.updatedAt,
    deployedUrl: buildDeployedUrl(row.orgSlug, row.slug, row.currentVersionId),
  }));
  const lastRowRaw = page[page.length - 1];
  const nextCursor =
    hasMore && lastRowRaw
      ? encodeFunctionCursor(
          cursorForRow(
            sort,
            items[items.length - 1] as FunctionExplorerItem,
            lastRowRaw.failureCount,
          ),
        )
      : null;

  return { items, nextCursor, hasMore, total: totalRow };
}

export interface FunctionSlugSuggestion {
  id: string;
  slug: string;
  description: string;
  visibility: "public" | "private";
}

export async function suggestFunctionSlugs(
  orgId: string,
  query: string,
  limit = 5,
): Promise<FunctionSlugSuggestion[]> {
  const q = query.trim();
  if (!q) return [];
  const pattern = `%${q}%`;
  const rows = await db
    .select({
      id: schema.fn.id,
      slug: schema.fn.slug,
      description: schema.fn.description,
      visibility: schema.fn.visibility,
    })
    .from(schema.fn)
    .where(
      compat(
        sql`${schema.fn.orgId} = ${orgId} and (${schema.fn.slug} ilike ${pattern} or ${schema.fn.description} ilike ${pattern})`,
      ) as never,
    )
    .orderBy(
      compat(
        sql`case when ${schema.fn.slug} ilike ${`${q}%`} then 0 else 1 end, ${schema.fn.slug} asc`,
      ) as never,
    )
    .limit(Math.min(Math.max(limit, 1), 10));
  return rows;
}

export async function getFunctionForOrg(orgId: string, fnId: string) {
  const rows = await db
    .select()
    .from(schema.fn)
    .where(compat(sql`${schema.fn.orgId} = ${orgId} and ${schema.fn.id} = ${fnId}`) as never)
    .limit(1);
  return rows[0] ?? null;
}

export async function assertCanUsePrivateFunctions(orgId: string) {
  const plan = await getEffectivePlan(orgId);
  if (plan.planSlug === "free") {
    throw new Error("private_functions_require_upgrade");
  }
}

export async function updateFunctionVisibility(input: {
  orgId: string;
  fnId: string;
  visibility: "public" | "private";
}) {
  const current = await getFunctionForOrg(input.orgId, input.fnId);
  if (!current) throw new Error("not found");
  if (current.visibility === input.visibility) return current.visibility;
  if (input.visibility === "private") {
    await assertCanUsePrivateFunctions(input.orgId);
  }
  await db
    .update(schema.fn)
    .set({ visibility: input.visibility, updatedAt: new Date() })
    .where(
      compat(sql`${schema.fn.orgId} = ${input.orgId} and ${schema.fn.id} = ${input.fnId}`) as never,
    );
  return input.visibility;
}

export interface MarketplaceFunctionItem {
  id: string;
  orgSlug: string;
  orgName: string;
  authorName: string;
  authorImage: string | null;
  slug: string;
  description: string;
  category: MarketplaceCategory;
  useCases: string[];
  shortDescription: string;
  starCount: number;
  commentCount: number;
  forkCount: number;
  packageCount: number;
  currentVersionId: string | null;
  forkedFromFnId: string | null;
  updatedAt: Date;
  publishedAt: Date | null;
  codePreview: string | null;
  hasStarred: boolean;
}

export interface MarketplacePaginationResult {
  items: MarketplaceFunctionItem[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

export interface MarketplaceFunctionDetail extends MarketplaceFunctionItem {
  readme: string;
  code: string | null;
}

function normalizeMarketplaceCategory(
  value: string | null | undefined,
): MarketplaceCategory | undefined {
  return value && (MARKETPLACE_CATEGORIES as string[]).includes(value)
    ? (value as MarketplaceCategory)
    : undefined;
}

function normalizeUseCases(value: string[] | null | undefined): string[] {
  return (value ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function marketplaceOrderBy(sort: MarketplaceSort): ReturnType<typeof sql> {
  switch (sort) {
    case "featured":
      return sql`${schema.fnMarketplaceProfile.featuredRank} asc nulls last, ${schema.fnMarketplaceProfile.starCount} desc, ${schema.fn.updatedAt} desc`;
    case "trending":
      return sql`${schema.fnMarketplaceProfile.starCount} + ${schema.fnMarketplaceProfile.forkCount} + ${schema.fnMarketplaceProfile.commentCount} desc, ${schema.fn.updatedAt} desc`;
    case "stars":
      return sql`${schema.fnMarketplaceProfile.starCount} desc, ${schema.fn.updatedAt} desc`;
    case "forks":
      return sql`${schema.fnMarketplaceProfile.forkCount} desc, ${schema.fn.updatedAt} desc`;
    case "recent":
      return sql`${schema.fn.updatedAt} desc, ${schema.fn.id} desc`;
  }
}

function marketplaceSelect(userId?: string) {
  return {
    id: schema.fn.id,
    orgSlug: schema.organization.slug,
    orgName: schema.organization.name,
    authorName: schema.user.name,
    authorImage: schema.user.image,
    slug: schema.fn.slug,
    description: schema.fn.description,
    category: sql<MarketplaceCategory>`coalesce(${schema.fnMarketplaceProfile.category}, 'utilities')`,
    useCases: sql<string[]>`coalesce(${schema.fnMarketplaceProfile.useCases}, '[]'::jsonb)`,
    shortDescription: sql<string>`coalesce(nullif(${schema.fnMarketplaceProfile.shortDescription}, ''), ${schema.fn.description}, '')`,
    readme: sql<string>`coalesce(${schema.fnMarketplaceProfile.readme}, '')`,
    starCount: sql<number>`coalesce(${schema.fnMarketplaceProfile.starCount}, 0)`,
    commentCount: sql<number>`coalesce(${schema.fnMarketplaceProfile.commentCount}, 0)`,
    forkCount: sql<number>`coalesce(${schema.fnMarketplaceProfile.forkCount}, 0)`,
    packageCount: sql<number>`coalesce(jsonb_array_length(${schema.fn.packages}), 0)`,
    currentVersionId: schema.fn.currentVersionId,
    forkedFromFnId: schema.fn.forkedFromFnId,
    updatedAt: schema.fn.updatedAt,
    publishedAt: schema.fnMarketplaceProfile.publishedAt,
    code: schema.fnVersion.code,
    hasStarred: userId
      ? sql<boolean>`exists(
          select 1 from ${schema.fnStar}
          where ${schema.fnStar.fnId} = ${schema.fn.id}
            and ${schema.fnStar.userId} = ${userId}
        )`
      : sql<boolean>`false`,
  };
}

function toMarketplaceItem(
  row: ReturnType<typeof marketplaceSelect> extends infer _T
    ? {
        id: string;
        orgSlug: string;
        orgName: string;
        authorName: string;
        authorImage: string | null;
        slug: string;
        description: string;
        category: MarketplaceCategory;
        useCases: string[];
        shortDescription: string;
        starCount: number;
        commentCount: number;
        forkCount: number;
        packageCount: number;
        currentVersionId: string | null;
        forkedFromFnId: string | null;
        updatedAt: Date;
        publishedAt: Date | null;
        code: string | null;
        hasStarred: boolean;
      }
    : never,
): MarketplaceFunctionItem {
  return {
    id: row.id,
    orgSlug: row.orgSlug,
    orgName: row.orgName,
    authorName: row.authorName,
    authorImage: row.authorImage,
    slug: row.slug,
    description: row.description ?? "",
    category: row.category,
    useCases: normalizeUseCases(row.useCases),
    shortDescription: row.shortDescription || row.description || "",
    starCount: row.starCount,
    commentCount: row.commentCount,
    forkCount: row.forkCount,
    packageCount: row.packageCount,
    currentVersionId: row.currentVersionId,
    forkedFromFnId: row.forkedFromFnId,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
    codePreview: row.code ? row.code.slice(0, 1800) : null,
    hasStarred: row.hasStarred,
  };
}

export async function searchMarketplaceFunctions(input: {
  query?: string;
  category?: string;
  useCase?: string;
  sort?: MarketplaceSort;
  limit?: number;
  cursor?: string;
  userId?: string;
}): Promise<MarketplacePaginationResult> {
  const limit = Math.min(Math.max(input.limit ?? 12, 1), 48);
  const offset = decodeOffsetCursor(input.cursor);
  const sort = input.sort ?? "featured";
  const conditions: ReturnType<typeof sql>[] = [sql`${schema.fn.visibility} = 'public'`];
  const category = normalizeMarketplaceCategory(input.category);

  if (input.query?.trim()) {
    const q = `%${input.query.trim()}%`;
    conditions.push(sql`(
      ${schema.fn.slug} ilike ${q}
      or ${schema.fn.description} ilike ${q}
      or ${schema.fnMarketplaceProfile.shortDescription} ilike ${q}
      or ${schema.fnMarketplaceProfile.readme} ilike ${q}
    )`);
  }
  if (category) conditions.push(sql`${schema.fnMarketplaceProfile.category} = ${category}`);
  if (input.useCase?.trim()) {
    conditions.push(
      sql`${schema.fnMarketplaceProfile.useCases} @> ${JSON.stringify([input.useCase.trim()])}::jsonb`,
    );
  }
  const whereClause = conditions.reduce((acc, condition) => sql`${acc} and ${condition}`);

  const [rows, totalRow] = await Promise.all([
    db
      .select(marketplaceSelect(input.userId))
      .from(schema.fn)
      .innerJoin(schema.organization, sql`${schema.organization.id} = ${schema.fn.orgId}`)
      .innerJoin(schema.user, sql`${schema.user.id} = ${schema.fn.createdById}`)
      .leftJoin(
        schema.fnMarketplaceProfile,
        sql`${schema.fnMarketplaceProfile.fnId} = ${schema.fn.id}`,
      )
      .leftJoin(schema.fnVersion, sql`${schema.fnVersion.id} = ${schema.fn.currentVersionId}`)
      .where(compat(whereClause) as never)
      .orderBy(compat(marketplaceOrderBy(sort)) as never)
      .limit(limit + 1)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(schema.fn)
      .leftJoin(
        schema.fnMarketplaceProfile,
        sql`${schema.fnMarketplaceProfile.fnId} = ${schema.fn.id}`,
      )
      .where(compat(whereClause) as never),
  ]);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    items: page.map(toMarketplaceItem),
    nextCursor: hasMore ? encodeOffsetCursor(offset + limit) : null,
    hasMore,
    total: totalRow[0]?.total ?? 0,
  };
}

export async function getMarketplaceFunction(fnId: string, userId?: string) {
  const rows = await db
    .select(marketplaceSelect(userId))
    .from(schema.fn)
    .innerJoin(schema.organization, sql`${schema.organization.id} = ${schema.fn.orgId}`)
    .innerJoin(schema.user, sql`${schema.user.id} = ${schema.fn.createdById}`)
    .leftJoin(
      schema.fnMarketplaceProfile,
      sql`${schema.fnMarketplaceProfile.fnId} = ${schema.fn.id}`,
    )
    .leftJoin(schema.fnVersion, sql`${schema.fnVersion.id} = ${schema.fn.currentVersionId}`)
    .where(compat(sql`${schema.fn.id} = ${fnId} and ${schema.fn.visibility} = 'public'`) as never)
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    ...toMarketplaceItem(row),
    readme: row.readme,
    code: row.code,
  } satisfies MarketplaceFunctionDetail;
}

async function assertPublicFunction(fnId: string) {
  const rows = await db
    .select({ id: schema.fn.id })
    .from(schema.fn)
    .where(compat(sql`${schema.fn.id} = ${fnId} and ${schema.fn.visibility} = 'public'`) as never)
    .limit(1);
  if (!rows[0]) throw new Error("not found");
}

async function ensureMarketplaceProfile(tx: DbInsertExecutor, fnId: string, orgId: string) {
  await tx
    .insert(schema.fnMarketplaceProfile)
    .values({ fnId, orgId, publishedAt: new Date() })
    .onConflictDoNothing();
}

export async function upsertFunctionMarketplaceProfile(input: {
  orgId: string;
  fnId: string;
  category: MarketplaceCategory;
  useCases: string[];
  shortDescription: string;
  readme: string;
}) {
  const fnRow = await getFunctionForOrg(input.orgId, input.fnId);
  if (!fnRow) throw new Error("not found");
  const now = new Date();
  await db
    .insert(schema.fnMarketplaceProfile)
    .values({
      fnId: input.fnId,
      orgId: input.orgId,
      category: input.category,
      useCases: normalizeUseCases(input.useCases),
      shortDescription: input.shortDescription.trim().slice(0, 280),
      readme: input.readme.trim().slice(0, 8000),
      publishedAt: fnRow.visibility === "public" ? now : null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.fnMarketplaceProfile.fnId,
      set: {
        category: input.category,
        useCases: normalizeUseCases(input.useCases),
        shortDescription: input.shortDescription.trim().slice(0, 280),
        readme: input.readme.trim().slice(0, 8000),
        publishedAt: fnRow.visibility === "public" ? now : null,
        updatedAt: now,
      },
    });
}

export async function getFunctionMarketplaceProfileForOrg(orgId: string, fnId: string) {
  const rows = await db
    .select({
      fnId: schema.fnMarketplaceProfile.fnId,
      category: schema.fnMarketplaceProfile.category,
      useCases: schema.fnMarketplaceProfile.useCases,
      shortDescription: schema.fnMarketplaceProfile.shortDescription,
      readme: schema.fnMarketplaceProfile.readme,
      starCount: schema.fnMarketplaceProfile.starCount,
      commentCount: schema.fnMarketplaceProfile.commentCount,
      forkCount: schema.fnMarketplaceProfile.forkCount,
      publishedAt: schema.fnMarketplaceProfile.publishedAt,
    })
    .from(schema.fnMarketplaceProfile)
    .innerJoin(schema.fn, sql`${schema.fn.id} = ${schema.fnMarketplaceProfile.fnId}`)
    .where(
      compat(
        sql`${schema.fnMarketplaceProfile.orgId} = ${orgId} and ${schema.fnMarketplaceProfile.fnId} = ${fnId}`,
      ) as never,
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function setFunctionStar(input: {
  fnId: string;
  userId: string;
  starred: boolean;
}) {
  await assertPublicFunction(input.fnId);
  await db.transaction(async (tx) => {
    const fnRow = await tx
      .select({ orgId: schema.fn.orgId })
      .from(schema.fn)
      .where(compat(sql`${schema.fn.id} = ${input.fnId}`) as never)
      .limit(1);
    const orgId = fnRow[0]?.orgId;
    if (!orgId) throw new Error("not found");
    await ensureMarketplaceProfile(tx, input.fnId, orgId);
    if (input.starred) {
      await tx
        .insert(schema.fnStar)
        .values({ fnId: input.fnId, userId: input.userId })
        .onConflictDoNothing();
    } else {
      await tx
        .delete(schema.fnStar)
        .where(
          compat(
            sql`${schema.fnStar.fnId} = ${input.fnId} and ${schema.fnStar.userId} = ${input.userId}`,
          ) as never,
        );
    }
    await tx
      .update(schema.fnMarketplaceProfile)
      .set({
        starCount: sql<number>`(
          select count(*)::int from ${schema.fnStar}
          where ${schema.fnStar.fnId} = ${input.fnId}
        )`,
        updatedAt: new Date(),
      })
      .where(compat(sql`${schema.fnMarketplaceProfile.fnId} = ${input.fnId}`) as never);
  });
}

export interface FunctionCommentItem {
  id: string;
  fnId: string;
  authorUserId: string;
  authorName: string;
  authorImage: string | null;
  parentCommentId: string | null;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function listFunctionComments(fnId: string): Promise<FunctionCommentItem[]> {
  await assertPublicFunction(fnId);
  return db
    .select({
      id: schema.fnComment.id,
      fnId: schema.fnComment.fnId,
      authorUserId: schema.fnComment.authorUserId,
      authorName: schema.user.name,
      authorImage: schema.user.image,
      parentCommentId: schema.fnComment.parentCommentId,
      body: schema.fnComment.body,
      createdAt: schema.fnComment.createdAt,
      updatedAt: schema.fnComment.updatedAt,
    })
    .from(schema.fnComment)
    .innerJoin(schema.user, sql`${schema.user.id} = ${schema.fnComment.authorUserId}`)
    .where(compat(sql`${schema.fnComment.fnId} = ${fnId}`) as never)
    .orderBy(compat(sql`${schema.fnComment.createdAt} asc`) as never);
}

export async function createFunctionComment(input: {
  fnId: string;
  userId: string;
  body: string;
  parentCommentId?: string | null;
}) {
  const body = input.body.trim();
  if (body.length < 2 || body.length > 2000) throw new Error("invalid_comment");
  await assertPublicFunction(input.fnId);
  const id = genId("fmc");
  await db.transaction(async (tx) => {
    const fnRow = await tx
      .select({ orgId: schema.fn.orgId })
      .from(schema.fn)
      .where(compat(sql`${schema.fn.id} = ${input.fnId}`) as never)
      .limit(1);
    const orgId = fnRow[0]?.orgId;
    if (!orgId) throw new Error("not found");
    await ensureMarketplaceProfile(tx, input.fnId, orgId);
    if (input.parentCommentId) {
      const parent = await tx
        .select({ id: schema.fnComment.id })
        .from(schema.fnComment)
        .where(
          compat(
            sql`${schema.fnComment.id} = ${input.parentCommentId} and ${schema.fnComment.fnId} = ${input.fnId}`,
          ) as never,
        )
        .limit(1);
      if (!parent[0]) throw new Error("parent_comment_not_found");
    }
    await tx.insert(schema.fnComment).values({
      id,
      fnId: input.fnId,
      authorUserId: input.userId,
      parentCommentId: input.parentCommentId ?? null,
      body,
    });
    await tx
      .update(schema.fnMarketplaceProfile)
      .set({
        commentCount: sql<number>`(
          select count(*)::int from ${schema.fnComment}
          where ${schema.fnComment.fnId} = ${input.fnId}
        )`,
        updatedAt: new Date(),
      })
      .where(compat(sql`${schema.fnMarketplaceProfile.fnId} = ${input.fnId}`) as never);
  });
  return id;
}

export async function deleteFunctionComment(input: {
  fnId: string;
  commentId: string;
  userId: string;
}) {
  await db.transaction(async (tx) => {
    await tx
      .delete(schema.fnComment)
      .where(
        compat(
          sql`${schema.fnComment.id} = ${input.commentId} and ${schema.fnComment.fnId} = ${input.fnId} and ${schema.fnComment.authorUserId} = ${input.userId}`,
        ) as never,
      );
    await tx
      .update(schema.fnMarketplaceProfile)
      .set({
        commentCount: sql<number>`(
          select count(*)::int from ${schema.fnComment}
          where ${schema.fnComment.fnId} = ${input.fnId}
        )`,
        updatedAt: new Date(),
      })
      .where(compat(sql`${schema.fnMarketplaceProfile.fnId} = ${input.fnId}`) as never);
  });
}

async function uniqueForkSlug(orgId: string, baseSlug: string) {
  const base = `${baseSlug}-fork`.slice(0, 56).replace(/-+$/g, "") || "forked-function";
  for (let i = 0; i < 100; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const existing = await db
      .select({ id: schema.fn.id })
      .from(schema.fn)
      .where(
        compat(sql`${schema.fn.orgId} = ${orgId} and ${schema.fn.slug} = ${candidate}`) as never,
      )
      .limit(1);
    if (!existing[0]) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`.slice(0, 64);
}

export async function forkFunction(input: {
  sourceFnId: string;
  targetOrgId: string;
  userId: string;
  slug?: string;
}) {
  const sourceRows = await db
    .select({
      id: schema.fn.id,
      orgId: schema.fn.orgId,
      slug: schema.fn.slug,
      description: schema.fn.description,
      packages: schema.fn.packages,
      currentVersionId: schema.fn.currentVersionId,
      currentCode: schema.fnVersion.code,
      draftCode: schema.fnDraft.code,
    })
    .from(schema.fn)
    .leftJoin(schema.fnVersion, sql`${schema.fnVersion.id} = ${schema.fn.currentVersionId}`)
    .leftJoin(
      schema.fnDraft,
      sql`${schema.fnDraft.fnId} = ${schema.fn.id} and ${schema.fnDraft.userId} = ${schema.fn.createdById}`,
    )
    .where(
      compat(
        sql`${schema.fn.id} = ${input.sourceFnId} and ${schema.fn.visibility} = 'public'`,
      ) as never,
    )
    .limit(1);
  const source = sourceRows[0];
  if (!source) throw new Error("not found");
  const slug = input.slug?.trim() || (await uniqueForkSlug(input.targetOrgId, source.slug));
  const starterCode = source.currentCode ?? source.draftCode ?? "";
  const fnId = genId("fn");

  const nodeTypesVersion = await getLatestNpmVersion(DEFAULT_NODE_TYPES);
  await db.transaction(async (tx) => {
    const sourcePackages = normalizePackages(source.packages);
    const forkPackages = sourcePackages.some((pkg) => pkg.name === DEFAULT_NODE_TYPES)
      ? sourcePackages
      : normalizePackages([
          ...sourcePackages,
          toPackageRecord(DEFAULT_NODE_TYPES, "default", nodeTypesVersion),
        ]);
    await tx.insert(schema.fn).values({
      id: fnId,
      orgId: input.targetOrgId,
      createdById: input.userId,
      slug,
      description: source.description,
      packages: forkPackages,
      visibility: "public",
      forkedFromFnId: source.id,
    });
    await tx.insert(schema.fnDraft).values({
      fnId,
      userId: input.userId,
      code: starterCode,
    });
    await tx.insert(schema.trigger).values({
      id: genId("trg"),
      fnId,
      orgId: input.targetOrgId,
      kind: "http",
      config: { http: { requireAuth: false } },
    });
    await ensureMarketplaceProfile(tx, source.id, source.orgId);
    await tx.insert(schema.fnFork).values({
      sourceFnId: source.id,
      forkedFnId: fnId,
      forkedByUserId: input.userId,
    });
    await tx
      .update(schema.fnMarketplaceProfile)
      .set({
        forkCount: sql<number>`(
          select count(*)::int from ${schema.fnFork}
          where ${schema.fnFork.sourceFnId} = ${source.id}
        )`,
        updatedAt: new Date(),
      })
      .where(compat(sql`${schema.fnMarketplaceProfile.fnId} = ${source.id}`) as never);
  });
  return fnId;
}

export async function getDraft(fnId: string, userId: string) {
  const rows = await db
    .select()
    .from(schema.fnDraft)
    .where(
      compat(
        sql`${schema.fnDraft.fnId} = ${fnId} and ${schema.fnDraft.userId} = ${userId}`,
      ) as never,
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getCurrentVersionCodeForFunction(
  orgId: string,
  fnId: string,
): Promise<string | null> {
  const rows = await db
    .select({ code: schema.fnVersion.code })
    .from(schema.fn)
    .innerJoin(schema.fnVersion, sql`${schema.fnVersion.id} = ${schema.fn.currentVersionId}`)
    .where(compat(sql`${schema.fn.orgId} = ${orgId} and ${schema.fn.id} = ${fnId}`) as never)
    .limit(1);
  return rows[0]?.code ?? null;
}

export async function listSecretsForFunction(orgId: string, fnId: string) {
  const rows = await db
    .select({
      id: schema.secret.id,
      key: schema.secret.key,
      updatedAt: schema.secret.updatedAt,
    })
    .from(schema.secret)
    .where(
      compat(sql`${schema.secret.orgId} = ${orgId} and ${schema.secret.fnId} = ${fnId}`) as never,
    )
    .orderBy(compat(sql`${schema.secret.key} asc`) as never);
  return rows;
}

export async function setSecretForFunction(input: {
  orgId: string;
  fnId: string;
  key: string;
  value: string;
  userId: string;
}) {
  const ciphertext = encryptSecret(input.value);
  const existing = await db
    .select({ id: schema.secret.id })
    .from(schema.secret)
    .where(
      compat(
        sql`${schema.secret.orgId} = ${input.orgId} and ${schema.secret.fnId} = ${input.fnId} and ${schema.secret.key} = ${input.key}`,
      ) as never,
    )
    .limit(1);

  if (existing[0]?.id) {
    await db
      .update(schema.secret)
      .set({ ciphertext, updatedAt: new Date() })
      .where(compat(sql`${schema.secret.id} = ${existing[0].id}`) as never);
    return existing[0].id;
  }

  const id = genId("sec");
  await db.insert(schema.secret).values({
    id,
    orgId: input.orgId,
    fnId: input.fnId,
    key: input.key,
    ciphertext,
    createdById: input.userId,
  });
  return id;
}

export async function deleteSecretForFunction(orgId: string, fnId: string, key: string) {
  await db
    .delete(schema.secret)
    .where(
      compat(
        sql`${schema.secret.orgId} = ${orgId} and ${schema.secret.fnId} = ${fnId} and ${schema.secret.key} = ${key}`,
      ) as never,
    );
}

export async function getSecretValueForFunction(orgId: string, fnId: string, key: string) {
  const rows = await db
    .select({ ciphertext: schema.secret.ciphertext })
    .from(schema.secret)
    .where(
      compat(
        sql`${schema.secret.orgId} = ${orgId} and ${schema.secret.fnId} = ${fnId} and ${schema.secret.key} = ${key}`,
      ) as never,
    )
    .limit(1);
  const row = rows[0];
  return row ? decryptSecret(row.ciphertext) : null;
}

export interface CreateFunctionInput {
  orgId: string;
  createdById: string;
  slug: string;
  description?: string;
  starterCode: string;
  visibility?: "public" | "private";
  forkedFromFnId?: string | null;
}

export async function createFunction(input: CreateFunctionInput) {
  if (input.visibility === "private") {
    await assertCanUsePrivateFunctions(input.orgId);
  }
  const fnId = genId("fn");
  const [sdkVersion, nodeTypesVersion] = await Promise.all([
    getLatestNpmVersion(DEFAULT_FUNCTION_SDK),
    getLatestNpmVersion(DEFAULT_NODE_TYPES),
  ]);
  await db.transaction(async (tx) => {
    await tx.insert(schema.fn).values({
      id: fnId,
      orgId: input.orgId,
      createdById: input.createdById,
      slug: input.slug,
      description: input.description ?? "",
      packages: normalizePackages([
        toPackageRecord(DEFAULT_FUNCTION_SDK, "default", sdkVersion),
        toPackageRecord(DEFAULT_NODE_TYPES, "default", nodeTypesVersion),
      ]),
      visibility: input.visibility ?? "public",
      forkedFromFnId: input.forkedFromFnId ?? null,
    });
    await tx.insert(schema.fnDraft).values({
      fnId,
      userId: input.createdById,
      code: input.starterCode,
    });
    // Every function gets a default HTTP trigger.
    await tx.insert(schema.trigger).values({
      id: genId("trg"),
      fnId,
      orgId: input.orgId,
      kind: "http",
      config: { http: { requireAuth: false } },
    });
  });
  return fnId;
}

export async function getFunctionPackagesForOrg(
  orgId: string,
  fnId: string,
): Promise<FunctionPackageRecord[]> {
  const rows = await db
    .select({ packages: schema.fn.packages })
    .from(schema.fn)
    .where(compat(sql`${schema.fn.orgId} = ${orgId} and ${schema.fn.id} = ${fnId}`) as never)
    .limit(1);
  const ensured = await ensureDefaultSdk(rows[0]?.packages ?? []);
  if ((rows[0]?.packages?.length ?? 0) !== ensured.length) {
    await setFunctionPackagesForOrg(orgId, fnId, ensured);
  }
  return ensured;
}

export async function setFunctionPackagesForOrg(
  orgId: string,
  fnId: string,
  packages: FunctionPackageRecord[],
) {
  const ensured = await ensureDefaultSdk(packages);
  await db
    .update(schema.fn)
    .set({ packages: ensured, updatedAt: new Date() })
    .where(compat(sql`${schema.fn.orgId} = ${orgId} and ${schema.fn.id} = ${fnId}`) as never);
  return ensured;
}
