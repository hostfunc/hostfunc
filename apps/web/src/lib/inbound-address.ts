import { randomBytes } from "node:crypto";

/** 32-char alphabet → 5 bits/char; 8 chars = 40 bits. 256 % 32 === 0, so byte % 32 is unbiased. */
const SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";
const SUFFIX_LENGTH = 8;
const MAX_SLUG_SEGMENT = 20;

/** Cryptographically random 8-char lowercase base32 suffix. */
export function generateAddressSuffix(): string {
  const bytes = randomBytes(SUFFIX_LENGTH);
  let out = "";
  for (const byte of bytes) {
    out += SUFFIX_ALPHABET[byte % SUFFIX_ALPHABET.length];
  }
  return out;
}

/** Lowercase, strip non-slug chars, truncate, and trim stray hyphens. */
function toAddressSegment(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, MAX_SLUG_SEGMENT)
    .replace(/^-+|-+$/g, "");
}

/**
 * Builds the inbound address `{fnSlug}-{orgSlug}-{suffix}@{domain}`. The local
 * part is never parsed back — inbound mail is matched against the exact stored
 * string — so hyphens inside slugs are fine.
 */
export function buildInboundAddress(input: {
  fnSlug: string;
  orgSlug: string;
  domain: string;
  /** Injectable for tests; defaults to a fresh random suffix. */
  suffix?: string;
}): string {
  const suffix = input.suffix ?? generateAddressSuffix();
  const segments = [toAddressSegment(input.fnSlug), toAddressSegment(input.orgSlug), suffix];
  const local = segments.filter(Boolean).join("-");
  return `${local}@${input.domain}`.toLowerCase();
}
