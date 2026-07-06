import { getContext, requireControlPlane } from "../core/context";
import { SdkError } from "../core/types";
import type { KvListOptions, KvListResult, KvSetOptions } from "./types";

async function postKv<T>(path: string, body: unknown): Promise<T> {
  const controlPlane = requireControlPlane();
  const token = getContext().token;
  const res = await fetch(`${controlPlane}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new SdkError(
      "KV_REQUEST_FAILED",
      `kv request failed (${res.status})${detail ? `: ${detail}` : ""}`,
    );
  }
  return (await res.json()) as T;
}

/**
 * Built-in key-value storage, scoped to this function. Values are JSON.
 *
 * `incr` is atomic; a `get` followed by `set` is not — don't use read-modify-write
 * for counters.
 */
export const kv = {
  async get<T = unknown>(key: string): Promise<T | null> {
    const result = await postKv<{ found: boolean; value: unknown }>("/api/internal/kv/get", {
      key,
    });
    return result.found ? (result.value as T) : null;
  },

  async set(key: string, value: unknown, options?: KvSetOptions): Promise<void> {
    await postKv<{ ok: boolean }>("/api/internal/kv/set", {
      key,
      value,
      ...(options?.ttlSeconds !== undefined ? { ttlSeconds: options.ttlSeconds } : {}),
    });
  },

  async delete(key: string): Promise<boolean> {
    const result = await postKv<{ deleted: boolean }>("/api/internal/kv/delete", { key });
    return result.deleted;
  },

  /** Atomically add `delta` (default 1) to a numeric value, creating it at 0 first. */
  async incr(key: string, delta = 1): Promise<number> {
    const result = await postKv<{ value: number }>("/api/internal/kv/incr", { key, delta });
    return result.value;
  },

  /** Fetch up to 100 keys in one round-trip. Missing keys map to null. */
  async getMany<T = unknown>(keys: string[]): Promise<Record<string, T | null>> {
    const result = await postKv<{ values: Record<string, unknown> }>("/api/internal/kv/get-many", {
      keys,
    });
    const out: Record<string, T | null> = {};
    for (const key of keys) {
      out[key] = (result.values[key] ?? null) as T | null;
    }
    return out;
  },

  async list(options?: KvListOptions): Promise<KvListResult> {
    const result = await postKv<{ keys: string[]; cursor: string | null }>(
      "/api/internal/kv/list",
      {
        ...(options?.prefix !== undefined ? { prefix: options.prefix } : {}),
        ...(options?.limit !== undefined ? { limit: options.limit } : {}),
        ...(options?.cursor !== undefined ? { cursor: options.cursor } : {}),
      },
    );
    return { keys: result.keys ?? [], cursor: result.cursor ?? null };
  },
};

export type { KvListOptions, KvListResult, KvSetOptions } from "./types";
