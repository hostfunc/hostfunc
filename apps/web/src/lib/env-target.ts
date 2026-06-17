/**
 * Decide whether to enforce production-grade environment requirements (real
 * social-login credentials, https URLs, rotated service tokens).
 *
 * Vercel sets `NODE_ENV=production` for *every* build — including Preview and
 * Development deployments — so keying prod-only checks off `NODE_ENV` alone
 * over-triggers them on preview builds, which legitimately lack production
 * secrets. When running on Vercel, prefer the real deploy target via
 * `VERCEL_ENV`; everywhere else (CI prerender guard, self-hosted, local prod
 * builds) fall back to `NODE_ENV`.
 */
export function isProductionEnv(vars: {
  NODE_ENV?: string | undefined;
  VERCEL_ENV?: string | undefined;
}): boolean {
  if (vars.VERCEL_ENV) return vars.VERCEL_ENV === "production";
  return vars.NODE_ENV === "production";
}
