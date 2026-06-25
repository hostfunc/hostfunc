/**
 * Origin + brand constants for the standalone docs site. The docs render at
 * `docs.hostfunc.io`; the marketing site and dashboard live on the apex/app
 * subdomains, so cross-links here are absolute.
 */

/** Canonical origin for the docs site — `metadataBase`, canonicals, sitemap. */
export const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL ?? "https://docs.hostfunc.io";

/** Marketing site origin (apex). Used for the "Home" breadcrumb + brand links. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hostfunc.io";

/** Dashboard / auth origin. */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.hostfunc.io";

/** Where the docs "Log in" / "Get started" CTAs point. */
export const LOGIN_URL = `${SITE_URL}/login`;

/** GA4 measurement ID (public). Analytics is off when unset. */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

/** Google Search Console verification token for the docs property. */
export const GOOGLE_VERIFICATION = process.env.NEXT_PUBLIC_DOCS_GOOGLE_VERIFICATION;

/** Public profiles for the `sameAs` graph edges in Organization JSON-LD. */
export const SOCIAL_LINKS = [
  "https://github.com/hostfunc/hostfunc",
  "https://discord.gg/hostfunc",
] as const;
