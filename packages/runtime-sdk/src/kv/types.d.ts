export interface KvSetOptions {
  /** Seconds until the key expires. Omit for no TTL. */
  ttlSeconds?: number;
}
export interface KvListOptions {
  /** Only return keys starting with this prefix. */
  prefix?: string;
  /** Max keys per page (1–1000, default 100). */
  limit?: number;
  /** Cursor from a previous page. */
  cursor?: string;
}
export interface KvListResult {
  keys: string[];
  /** Pass back via `options.cursor` to fetch the next page. Null when done. */
  cursor: string | null;
}
//# sourceMappingURL=types.d.ts.map
