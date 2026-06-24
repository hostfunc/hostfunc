import type { MetadataRoute } from "next";

const docsUrl = process.env.NEXT_PUBLIC_DOCS_URL ?? "https://docs.hostfunc.io";

/**
 * Routes that exist in the scaffold today. Wired up and ready for launch — it
 * has no effect while the site is `disallow`-ed in `robots.ts`. Extend this as
 * the docs migration adds pages.
 */
const routes = [
  "/",
  "/getting-started/install",
  "/getting-started/quickstart",
  "/concepts/architecture",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return routes.map((path) => ({
    url: `${docsUrl}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
