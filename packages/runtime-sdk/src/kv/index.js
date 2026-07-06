import { getContext, requireControlPlane } from "../core/context";
import { SdkError } from "../core/types";
async function postKv(path, body) {
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
        throw new SdkError("KV_REQUEST_FAILED", `kv request failed (${res.status})${detail ? `: ${detail}` : ""}`);
    }
    return (await res.json());
}
/**
 * Built-in key-value storage, scoped to this function. Values are JSON.
 *
 * `incr` is atomic; a `get` followed by `set` is not — don't use read-modify-write
 * for counters.
 */
export const kv = {
    async get(key) {
        const result = await postKv("/api/internal/kv/get", {
            key,
        });
        return result.found ? result.value : null;
    },
    async set(key, value, options) {
        await postKv("/api/internal/kv/set", {
            key,
            value,
            ...(options?.ttlSeconds !== undefined ? { ttlSeconds: options.ttlSeconds } : {}),
        });
    },
    async delete(key) {
        const result = await postKv("/api/internal/kv/delete", { key });
        return result.deleted;
    },
    /** Atomically add `delta` (default 1) to a numeric value, creating it at 0 first. */
    async incr(key, delta = 1) {
        const result = await postKv("/api/internal/kv/incr", { key, delta });
        return result.value;
    },
    /** Fetch up to 100 keys in one round-trip. Missing keys map to null. */
    async getMany(keys) {
        const result = await postKv("/api/internal/kv/get-many", {
            keys,
        });
        const out = {};
        for (const key of keys) {
            out[key] = (result.values[key] ?? null);
        }
        return out;
    },
    async list(options) {
        const result = await postKv("/api/internal/kv/list", {
            ...(options?.prefix !== undefined ? { prefix: options.prefix } : {}),
            ...(options?.limit !== undefined ? { limit: options.limit } : {}),
            ...(options?.cursor !== undefined ? { cursor: options.cursor } : {}),
        });
        return { keys: result.keys ?? [], cursor: result.cursor ?? null };
    },
};
//# sourceMappingURL=index.js.map