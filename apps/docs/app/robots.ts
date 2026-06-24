import type { MetadataRoute } from "next";

const docsUrl = process.env.NEXT_PUBLIC_DOCS_URL ?? "https://docs.hostfunc.io";

/**
 * Pre-launch: disallow all crawling so the unfinished scaffold can't compete
 * with the live docs at `hostfunc.io/docs`. When this site goes live, switch
 * `disallow` to `[]` (and flip `SCAFFOLD_NOINDEX` in `layout.tsx`).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
    sitemap: `${docsUrl}/sitemap.xml`,
    host: docsUrl,
  };
}
