/**
 * Constant-time string equality. Hash-then-compare: SHA-256 length-equalizes
 * the inputs, so neither length nor prefix match leaks through timing.
 */
export async function timingSafeEqualStr(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const ba = new Uint8Array(da);
  const bb = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < ba.length; i++) {
    diff |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

/**
 * True when `authHeader` is exactly `Bearer <expectedToken>`. False when the
 * header or token is missing or empty.
 */
export async function isAuthorizedBearer(
  authHeader: string | null,
  expectedToken: string | undefined,
): Promise<boolean> {
  if (!authHeader || !expectedToken) return false;
  return timingSafeEqualStr(authHeader, `Bearer ${expectedToken}`);
}
