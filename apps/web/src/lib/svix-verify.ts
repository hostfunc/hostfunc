import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TOLERANCE_SECONDS = 300;

/**
 * Verifies a Svix-style webhook signature (the scheme Resend uses):
 * HMAC-SHA256 over `{id}.{timestamp}.{payload}` keyed with the base64-decoded
 * secret (after stripping the `whsec_` prefix). The signature header carries
 * space-separated `v1,<base64>` entries; any match passes. Timestamps outside
 * the tolerance window are rejected to stop replays.
 */
export function verifySvixSignature(input: {
  secret: string;
  payload: string;
  id: string;
  timestamp: string;
  signature: string;
  toleranceSeconds?: number;
  /** Injectable clock for tests; returns ms since epoch. */
  now?: () => number;
}): boolean {
  const { secret, payload, id, timestamp, signature } = input;
  if (!secret || !payload || !id || !timestamp || !signature) return false;

  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return false;
  const nowSeconds = Math.floor((input.now ?? Date.now)() / 1000);
  const tolerance = input.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  if (Math.abs(nowSeconds - ts) > tolerance) return false;

  let key: Buffer;
  try {
    key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  } catch {
    return false;
  }
  if (key.length === 0) return false;

  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${payload}`).digest();

  let valid = false;
  for (const entry of signature.split(" ")) {
    const [version, value] = entry.split(",", 2);
    if (version !== "v1" || !value) continue;
    let candidate: Buffer;
    try {
      candidate = Buffer.from(value, "base64");
    } catch {
      continue;
    }
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) {
      valid = true;
    }
  }
  return valid;
}
