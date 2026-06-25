import { DOCS_URL } from "@/lib/site";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${DOCS_URL}/sitemap.xml`,
    host: DOCS_URL,
  };
}
