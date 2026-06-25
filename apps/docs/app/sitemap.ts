import { docsPages } from "@/lib/docs-content";
import { DOCS_URL } from "@/lib/site";
import type { MetadataRoute } from "next";

/**
 * Every docs route, derived from the content registry so the sitemap can never
 * drift from what actually renders. Paths are already root-relative on the docs
 * origin (`/`, `/cli`, `/sdk/ai`, …).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return Object.keys(docsPages).map((path) => ({
    url: `${DOCS_URL}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
