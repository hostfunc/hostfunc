import { blogPosts } from "@/lib/blog";
import { comparisons } from "@/lib/comparisons";
import { env } from "@/lib/env";
import { useCases } from "@/lib/use-cases";
import { searchMarketplaceFunctions } from "@/server/functions";
import type { MetadataRoute } from "next";

const siteUrl = env.NEXT_PUBLIC_SITE_URL;

/** Regenerate hourly so newly-published marketplace functions get indexed. */
export const revalidate = 3600;

/**
 * Static, indexable marketing & legal routes. Auth flows (`/login`, `/join`),
 * the authenticated app (`/dashboard`, `/onboarding`, `/new-workspace`), and
 * utility routes (`/setup`, `/device`) are intentionally excluded — they're
 * also disallowed in `robots.ts`.
 */
const staticRoutes: Array<{ path: string; changeFrequency: ChangeFrequency; priority: number }> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.9 },
  { path: "/marketplace", changeFrequency: "daily", priority: 0.9 },
  { path: "/compare", changeFrequency: "monthly", priority: 0.7 },
  { path: "/use-cases", changeFrequency: "monthly", priority: 0.7 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.6 },
  { path: "/connectors", changeFrequency: "weekly", priority: 0.7 },
  { path: "/changelog", changeFrequency: "weekly", priority: 0.6 },
  { path: "/security", changeFrequency: "monthly", priority: 0.5 },
  { path: "/release", changeFrequency: "monthly", priority: 0.4 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
];

/**
 * Docs routes that actually render (one `page.tsx` per path). Note that
 * `docsPages` in `docs-content.ts` also carries `/docs/marketplace` and
 * `/docs/limits` keys that have no route folder yet — those are deliberately
 * omitted here so the sitemap never advertises a 404.
 */
const docsRoutes = [
  "/docs",
  "/docs/getting-started",
  "/docs/functions",
  "/docs/triggers",
  "/docs/websites",
  "/docs/custom-domains",
  "/docs/executions",
  "/docs/security",
  "/docs/cli",
  "/docs/vscode-extension",
  "/docs/mcp",
  "/docs/sdk",
  "/docs/sdk/ai",
  "/docs/sdk/agent",
  "/docs/sdk/vector",
];

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  for (const path of docsRoutes) {
    entries.push({
      url: `${siteUrl}${path}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: path === "/docs" ? 0.8 : 0.7,
    });
  }

  // Comparison and use-case landing pages — static, content-driven routes.
  for (const comparison of comparisons) {
    entries.push({
      url: `${siteUrl}/compare/${comparison.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }
  for (const useCase of useCases) {
    entries.push({
      url: `${siteUrl}/use-cases/${useCase.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  // Blog posts — `lastModified` from each post's publish date.
  for (const post of blogPosts) {
    entries.push({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: new Date(`${post.date}T00:00:00Z`),
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  // Public marketplace functions. Degrade gracefully to the static set if the
  // DB is unavailable (e.g. during a prerender build without a database).
  try {
    const seen = new Set<string>();
    let cursor: string | undefined;
    // Cap the walk so a large marketplace can't run the sitemap forever.
    for (let page = 0; page < 50; page++) {
      const result = await searchMarketplaceFunctions({
        sort: "recent",
        limit: 48,
        ...(cursor ? { cursor } : {}),
      });
      for (const fn of result.items) {
        if (seen.has(fn.id)) continue;
        seen.add(fn.id);
        entries.push({
          url: `${siteUrl}/marketplace/${fn.id}`,
          lastModified: fn.updatedAt,
          changeFrequency: "weekly",
          priority: 0.6,
        });
      }
      if (!result.hasMore || !result.nextCursor) break;
      cursor = result.nextCursor;
    }
  } catch (error) {
    console.error("sitemap: failed to enumerate marketplace functions", error);
  }

  return entries;
}
