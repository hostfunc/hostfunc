import "server-only";

import { db, schema } from "@hostfunc/db";
import { and, asc, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { getOrgPlan } from "./plan";

export const KV_MAX_KEY_LENGTH = 512;
export const KV_DEFAULT_MAX_VALUE_BYTES = 64 * 1024;
export const KV_DEFAULT_MAX_KEYS_PER_FUNCTION = 1000;
export const KV_MAX_GET_MANY_KEYS = 100;
export const KV_MAX_LIST_LIMIT = 1000;
export const KV_DEFAULT_LIST_LIMIT = 100;
/** TTLs are clamped to one year. */
export const KV_MAX_TTL_SECONDS = 365 * 24 * 60 * 60;

export class KvError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "KvError";
    this.code = code;
    this.status = status;
  }
}

function assertValidKey(key: unknown): asserts key is string {
  if (typeof key !== "string" || key.length === 0 || key.length > KV_MAX_KEY_LENGTH) {
    throw new KvError(
      "kv_invalid_key",
      `key must be a string of 1-${KV_MAX_KEY_LENGTH} characters`,
      400,
    );
  }
}

function notExpired() {
  return or(isNull(schema.fnKv.expiresAt), gt(schema.fnKv.expiresAt, new Date()));
}

function ttlToExpiresAt(ttlSeconds: number | undefined): Date | null {
  if (ttlSeconds === undefined) return null;
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    throw new KvError("kv_invalid_ttl", "ttlSeconds must be a positive number", 400);
  }
  const clamped = Math.min(Math.floor(ttlSeconds), KV_MAX_TTL_SECONDS);
  return new Date(Date.now() + clamped * 1000);
}

async function resolveLimits(orgId: string): Promise<{ maxKeys: number; maxValueBytes: number }> {
  const plan = await getOrgPlan(orgId);
  return {
    maxKeys: plan?.limits.maxKvKeysPerFunction ?? KV_DEFAULT_MAX_KEYS_PER_FUNCTION,
    maxValueBytes: plan?.limits.maxKvValueBytes ?? KV_DEFAULT_MAX_VALUE_BYTES,
  };
}

/** Delete this function's expired rows so they don't count against the quota. */
async function sweepExpired(fnId: string): Promise<void> {
  await db
    .delete(schema.fnKv)
    .where(and(eq(schema.fnKv.fnId, fnId), lt(schema.fnKv.expiresAt, new Date())));
}

async function assertQuotaForNewKey(fnId: string, key: string, maxKeys: number): Promise<void> {
  const existing = await db
    .select({ key: schema.fnKv.key })
    .from(schema.fnKv)
    .where(and(eq(schema.fnKv.fnId, fnId), eq(schema.fnKv.key, key)))
    .limit(1);
  if (existing.length > 0) return; // overwriting never hits the quota
  await sweepExpired(fnId);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.fnKv)
    .where(eq(schema.fnKv.fnId, fnId));
  if ((row?.count ?? 0) >= maxKeys) {
    throw new KvError("kv_quota_exceeded", `function kv store is full (max ${maxKeys} keys)`, 409);
  }
}

export async function kvGet(
  fnId: string,
  key: string,
): Promise<{ found: boolean; value: unknown }> {
  assertValidKey(key);
  const rows = await db
    .select({ value: schema.fnKv.value })
    .from(schema.fnKv)
    .where(and(eq(schema.fnKv.fnId, fnId), eq(schema.fnKv.key, key), notExpired()))
    .limit(1);
  const row = rows[0];
  if (!row) return { found: false, value: null };
  return { found: true, value: row.value };
}

export async function kvSet(
  fnId: string,
  orgId: string,
  key: string,
  value: unknown,
  ttlSeconds?: number,
): Promise<void> {
  assertValidKey(key);
  if (value === undefined) {
    throw new KvError("kv_invalid_value", "value is required", 400);
  }
  const { maxKeys, maxValueBytes } = await resolveLimits(orgId);
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, "utf8") > maxValueBytes) {
    throw new KvError("kv_value_too_large", `value exceeds the ${maxValueBytes} byte limit`, 413);
  }
  const expiresAt = ttlToExpiresAt(ttlSeconds);
  await assertQuotaForNewKey(fnId, key, maxKeys);
  await db
    .insert(schema.fnKv)
    .values({ fnId, orgId, key, value, expiresAt })
    .onConflictDoUpdate({
      target: [schema.fnKv.fnId, schema.fnKv.key],
      set: { value, expiresAt, updatedAt: new Date() },
    });
}

export async function kvDelete(fnId: string, key: string): Promise<boolean> {
  assertValidKey(key);
  const deleted = await db
    .delete(schema.fnKv)
    .where(and(eq(schema.fnKv.fnId, fnId), eq(schema.fnKv.key, key)))
    .returning({ key: schema.fnKv.key });
  return deleted.length > 0;
}

/**
 * Atomically add `delta` to a numeric value, creating the key at 0 first.
 * A single upsert statement — concurrent increments serialize on the row.
 * An expired key restarts from 0 with no TTL; a non-numeric value is left
 * untouched and reported as a 409.
 */
export async function kvIncr(
  fnId: string,
  orgId: string,
  key: string,
  delta: number,
): Promise<number> {
  assertValidKey(key);
  if (!Number.isFinite(delta)) {
    throw new KvError("kv_invalid_delta", "delta must be a finite number", 400);
  }
  const { maxKeys } = await resolveLimits(orgId);
  await assertQuotaForNewKey(fnId, key, maxKeys);
  const rows = (await db.execute(sql`
    insert into ${schema.fnKv} (fn_id, org_id, key, value, expires_at)
    values (${fnId}, ${orgId}, ${key}, to_jsonb(${delta}::numeric), null)
    on conflict (fn_id, key) do update set
      value = case
        when fn_kv.expires_at is not null and fn_kv.expires_at <= now()
          then to_jsonb(${delta}::numeric)
        when jsonb_typeof(fn_kv.value) = 'number'
          then to_jsonb((fn_kv.value #>> '{}')::numeric + ${delta}::numeric)
        else fn_kv.value
      end,
      expires_at = case
        when fn_kv.expires_at is not null and fn_kv.expires_at <= now() then null
        else fn_kv.expires_at
      end,
      updated_at = now()
    returning (value #>> '{}') as value_text, jsonb_typeof(value) as value_type
  `)) as Array<{ value_text: string; value_type: string }>;
  const row = rows[0];
  if (!row || row.value_type !== "number") {
    throw new KvError("kv_not_a_number", `value at "${key}" is not a number`, 409);
  }
  return Number(row.value_text);
}

export async function kvGetMany(fnId: string, keys: string[]): Promise<Record<string, unknown>> {
  if (!Array.isArray(keys) || keys.length === 0) return {};
  if (keys.length > KV_MAX_GET_MANY_KEYS) {
    throw new KvError(
      "kv_too_many_keys",
      `getMany accepts at most ${KV_MAX_GET_MANY_KEYS} keys`,
      400,
    );
  }
  for (const key of keys) assertValidKey(key);
  const rows = await db
    .select({ key: schema.fnKv.key, value: schema.fnKv.value })
    .from(schema.fnKv)
    .where(and(eq(schema.fnKv.fnId, fnId), inArray(schema.fnKv.key, keys), notExpired()));
  const out: Record<string, unknown> = {};
  for (const row of rows) out[row.key] = row.value;
  return out;
}

function escapeLikePattern(prefix: string): string {
  return prefix.replace(/([\\%_])/g, "\\$1");
}

export async function kvList(
  fnId: string,
  options: { prefix?: string; limit?: number; cursor?: string },
): Promise<{ keys: string[]; cursor: string | null }> {
  const limit = Math.min(
    Math.max(1, Math.floor(options.limit ?? KV_DEFAULT_LIST_LIMIT)),
    KV_MAX_LIST_LIMIT,
  );
  const conditions = [eq(schema.fnKv.fnId, fnId), notExpired()];
  if (options.prefix) {
    conditions.push(sql`${schema.fnKv.key} like ${`${escapeLikePattern(options.prefix)}%`}`);
  }
  if (options.cursor) {
    conditions.push(gt(schema.fnKv.key, options.cursor));
  }
  const rows = await db
    .select({ key: schema.fnKv.key })
    .from(schema.fnKv)
    .where(and(...conditions))
    .orderBy(asc(schema.fnKv.key))
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const keys = page.map((r) => r.key);
  return { keys, cursor: hasMore ? (keys.at(-1) ?? null) : null };
}
