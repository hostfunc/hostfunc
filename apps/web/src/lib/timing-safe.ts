import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time string equality. Hash-then-compare: SHA-256 length-equalizes
 * the inputs, so neither length nor prefix match leaks through timing.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const da = createHash("sha256").update(a).digest();
  const db = createHash("sha256").update(b).digest();
  return timingSafeEqual(da, db);
}

/**
 * True when `authHeader` is exactly `Bearer <token>` for ANY of
 * `expectedTokens`. Every candidate is evaluated (no early return) so the
 * token list order leaks nothing; empty/missing tokens are skipped.
 */
export function isAuthorizedBearer(
  authHeader: string | null,
  expectedTokens: readonly string[],
): boolean {
  if (!authHeader) return false;
  let authorized = false;
  for (const token of expectedTokens) {
    if (!token) continue;
    if (timingSafeEqualString(authHeader, `Bearer ${token}`)) {
      authorized = true;
    }
  }
  return authorized;
}
