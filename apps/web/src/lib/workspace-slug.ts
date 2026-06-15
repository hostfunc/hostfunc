import { z } from "zod";

/**
 * A team-tier workspace can expose itself at `<slug>.hostfunc.io`, so the slug
 * doubles as a public DNS label. These are the subdomains hostfunc keeps for its
 * own infrastructure and product surface — a workspace must never claim one, or
 * it could shadow `api.hostfunc.io`, `run.hostfunc.io`, the docs, etc.
 */
export const RESERVED_WORKSPACE_SLUGS: ReadonlySet<string> = new Set([
  // Infra / DNS
  "api",
  "app",
  "apps",
  "www",
  "mail",
  "smtp",
  "imap",
  "pop",
  "mx",
  "ns",
  "ns1",
  "ns2",
  "dns",
  "ftp",
  "run",
  "edge",
  "cdn",
  "assets",
  "static",
  "cname",
  "fallback",
  "staging",
  "staging-run",
  "staging-mail",
  // Product surface
  "dashboard",
  "docs",
  "blog",
  "status",
  "support",
  "help",
  "admin",
  "auth",
  "login",
  "logout",
  "signup",
  "signin",
  "register",
  "account",
  "accounts",
  "billing",
  "pricing",
  "settings",
  "console",
  "internal",
  "webhook",
  "webhooks",
  "mcp",
  "vector",
  "graphql",
  // Brand / safety
  "hostfunc",
  "about",
  "legal",
  "privacy",
  "terms",
  "security",
  "abuse",
  "root",
]);

export function isReservedWorkspaceSlug(slug: string): boolean {
  return RESERVED_WORKSPACE_SLUGS.has(slug.trim().toLowerCase());
}

/**
 * Canonical workspace slug rules. The slug is the workspace URL identifier and,
 * for team-tier workspaces, the subdomain label — so it must be a valid DNS
 * label: lowercase letters, digits and internal hyphens only, 3–63 chars, no
 * leading/trailing hyphen, no punycode prefix, and not a reserved name.
 */
export const workspaceSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Workspace URL must be at least 3 characters")
  .max(63, "Workspace URL must be 63 characters or fewer")
  .regex(
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
    "Use lowercase letters, numbers, and hyphens only — no leading or trailing hyphen",
  )
  .refine(
    (s) => !s.startsWith("xn--"),
    "Internationalized (punycode) workspace URLs aren't supported",
  )
  .refine((s) => !isReservedWorkspaceSlug(s), "That workspace URL is reserved by hostfunc");
