import { env } from "@/lib/env";
import type { MetadataRoute } from "next";

const siteUrl = env.NEXT_PUBLIC_SITE_URL;

/**
 * Crawl rules. Public marketing, marketplace, and docs are open; the
 * authenticated app surface, auth flows, and API are kept out of the index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/onboarding",
        "/new-workspace",
        "/setup",
        "/device",
        "/login",
        "/join",
        "/api/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
