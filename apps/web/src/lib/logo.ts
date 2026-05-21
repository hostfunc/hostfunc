/**
 * Shared workspace-logo constants and pure helpers.
 *
 * Safe to import from both client and server code — keep this module free of
 * any server-only dependencies. The Supabase storage logic lives in
 * `@/server/workspace-logo`.
 */

/** Hard cap on uploaded logo size. Mirrored by client and server validation. */
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/** Accepted logo MIME types mapped to their canonical file extension. */
export const ACCEPTED_LOGO_TYPES = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
} as const;

export type AcceptedLogoMime = keyof typeof ACCEPTED_LOGO_TYPES;

/** MIME list for the file `accept` attribute and client-side pre-checks. */
export const ACCEPTED_LOGO_MIME_LIST = Object.keys(ACCEPTED_LOGO_TYPES) as AcceptedLogoMime[];

export function isAcceptedLogoMime(type: string): type is AcceptedLogoMime {
  return type in ACCEPTED_LOGO_TYPES;
}

/**
 * True when a stored `organization.logo` value is an uploaded image URL — as
 * opposed to a legacy `brand-N` gradient preset id or `null`. This is the
 * single source of truth for that distinction.
 */
export function isHttpLogo(logo: string | null | undefined): boolean {
  return typeof logo === "string" && logo.startsWith("http");
}
