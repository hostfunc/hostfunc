/**
 * Restrict post-auth redirects to same-origin relative paths only.
 */
export function safeCallbackUrl(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (raw == null) return fallback;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return fallback;
  return t;
}
