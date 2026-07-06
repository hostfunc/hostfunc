import type { KvListOptions, KvListResult, KvSetOptions } from "./types";
/**
 * Built-in key-value storage, scoped to this function. Values are JSON.
 *
 * `incr` is atomic; a `get` followed by `set` is not — don't use read-modify-write
 * for counters.
 */
export declare const kv: {
    get<T = unknown>(key: string): Promise<T | null>;
    set(key: string, value: unknown, options?: KvSetOptions): Promise<void>;
    delete(key: string): Promise<boolean>;
    /** Atomically add `delta` (default 1) to a numeric value, creating it at 0 first. */
    incr(key: string, delta?: number): Promise<number>;
    /** Fetch up to 100 keys in one round-trip. Missing keys map to null. */
    getMany<T = unknown>(keys: string[]): Promise<Record<string, T | null>>;
    list(options?: KvListOptions): Promise<KvListResult>;
};
export type { KvListOptions, KvListResult, KvSetOptions } from "./types";
//# sourceMappingURL=index.d.ts.map