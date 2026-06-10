import { z } from "zod";

/** Hostnames hostfunc itself owns — never allow a user to claim one. */
export const RESERVED_SUFFIXES = ["hostfunc.app", "hostfunc.io", "hostfunc.dev"];

/** Soft abuse cap on custom domains per workspace. */
export const MAX_CUSTOM_DOMAINS_PER_ORG = 20;

export const domainInputSchema = z.object({
  hostname: z
    .string()
    .trim()
    .toLowerCase()
    .min(4, "Enter a valid domain")
    .max(253, "Domain is too long")
    .regex(
      /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/,
      "Enter a bare domain like www.example.com — no http:// or paths",
    )
    .refine(
      (h) => !RESERVED_SUFFIXES.some((s) => h === s || h.endsWith(`.${s}`)),
      "That domain is reserved by hostfunc",
    )
    .refine(
      (h) => !h.split(".").some((label) => label.startsWith("xn--")),
      "Internationalized (punycode) domain names aren't supported yet",
    ),
  fnId: z.string().min(1),
});
