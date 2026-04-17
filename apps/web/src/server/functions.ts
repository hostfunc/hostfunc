import "server-only";

import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { env } from "@/lib/env";
import { DEFAULT_FUNCTION_SDK, type FunctionPackageRecord } from "@/lib/function-packages";
import { getLatestNpmVersion } from "@/lib/npm-registry";
import { db, genId, schema, sql } from "@hostfunc/db";

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
  updatedAt: Date;
  deployedUrl: string | null;
}

export interface FunctionPaginationResult {
  items: FunctionExplorerItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

function encodeFunctionCursor(updatedAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ updatedAt: updatedAt.toISOString(), id }), "utf8").toString(
    "base64url",
  );
}

function decodeFunctionCursor(cursor?: string): { updatedAt: Date; id: string } | null {
  if (!cursor) return null;
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      updatedAt?: string;
      id?: string;
    };
    if (!decoded.updatedAt || !decoded.id) return null;
    const updatedAt = new Date(decoded.updatedAt);
    if (Number.isNaN(updatedAt.getTime())) return null;
    return { updatedAt, id: decoded.id };
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

export async function searchFunctionsForOrgPaginated(input: {
  orgId: string;
  query?: string;
  visibility?: string;
  limit?: number;
  cursor?: string;
}): Promise<FunctionPaginationResult> {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 50);
  const conditions = [sql`${schema.fn.orgId} = ${input.orgId}`];

  if (input.query) {
    const q = `%${input.query}%`;
    conditions.push(sql`(${schema.fn.slug} ilike ${q} or ${schema.fn.description} ilike ${q})`);
  }

  if (input.visibility && (input.visibility === "public" || input.visibility === "private")) {
    conditions.push(sql`${schema.fn.visibility} = ${input.visibility}`);
  }

  const cursor = decodeFunctionCursor(input.cursor);
  if (cursor) {
    conditions.push(
      sql`(${schema.fn.updatedAt} < ${cursor.updatedAt} or (${schema.fn.updatedAt} = ${cursor.updatedAt} and ${schema.fn.id} < ${cursor.id}))`,
    );
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
      updatedAt: schema.fn.updatedAt,
    })
    .from(schema.fn)
    .innerJoin(schema.organization, sql`${schema.organization.id} = ${schema.fn.orgId}`)
    .where(compat(whereClause) as never)
    .orderBy(compat(sql`${schema.fn.updatedAt} desc, ${schema.fn.id} desc`) as never)
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const items = page.map((row) => ({
    ...row,
    deployedUrl: buildDeployedUrl(row.orgSlug, row.slug, row.currentVersionId),
  }));
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? encodeFunctionCursor(last.updatedAt, last.id) : null;

  return { items, nextCursor, hasMore };
}

export async function getFunctionForOrg(orgId: string, fnId: string) {
  const rows = await db
    .select()
    .from(schema.fn)
    .where(compat(sql`${schema.fn.orgId} = ${orgId} and ${schema.fn.id} = ${fnId}`) as never)
    .limit(1);
  return rows[0] ?? null;
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

export async function getCurrentVersionCodeForFunction(orgId: string, fnId: string): Promise<string | null> {
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
}

export async function createFunction(input: CreateFunctionInput) {
  const fnId = genId("fn");
  const sdkVersion = await getLatestNpmVersion(DEFAULT_FUNCTION_SDK);
  await db.transaction(async (tx) => {
    await tx.insert(schema.fn).values({
      id: fnId,
      orgId: input.orgId,
      createdById: input.createdById,
      slug: input.slug,
      description: input.description ?? "",
      packages: [toPackageRecord(DEFAULT_FUNCTION_SDK, "default", sdkVersion)],
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
      config: { http: { requireAuth: true } },
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
