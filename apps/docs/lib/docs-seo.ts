import type { Metadata } from "next";
import { BRAND } from "./brand";
import { docsSections, getDocsPage } from "./docs-content";
import { DOCS_URL, SITE_URL, SOCIAL_LINKS } from "./site";

/** The shared "Documentation" social card, served at `/og/docs`. */
export const DOCS_OG_IMAGE = "/og/docs";

interface PageMetadataInput {
  title: string;
  description: string;
  /** Canonical path on the docs origin, e.g. "/cli" or "/". */
  path: string;
}

/**
 * Build per-page `Metadata` with a unique title, description, self-canonical,
 * and matching Open Graph / Twitter tags. Canonicals resolve against the docs
 * `metadataBase` set in the root layout.
 */
export function pageMetadata({ title, description, path }: PageMetadataInput): Metadata {
  const url = `${DOCS_URL}${path}`;
  const images = [{ url: DOCS_OG_IMAGE, width: 1200, height: 630, alt: title }];

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: `${BRAND.name} Docs`,
      url,
      title,
      description,
      locale: "en_US",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
  };
}

/** Per-page `Metadata` for a docs route, sourced from its `docsPages` content. */
export function docsMetadata(path: string): Metadata {
  const page = getDocsPage(path);
  return pageMetadata({ title: page.title, description: page.summary, path });
}

/** schema.org BreadcrumbList from an ordered list of `{ name, url }` crumbs. */
export function breadcrumbJsonLd(
  crumbs: Array<{ name: string; url: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

/** Home (marketing) → Docs → [Page] breadcrumb trail for a docs route. */
export function docsBreadcrumbs(path: string): Array<{ name: string; url: string }> {
  const crumbs: Array<{ name: string; url: string }> = [
    { name: "Home", url: SITE_URL },
    { name: "Docs", url: DOCS_URL },
  ];
  if (path === "/") return crumbs;

  const section = docsSections.find((s) => s.links.some((link) => link.href === path));
  const link = section?.links.find((l) => l.href === path);
  if (link) crumbs.push({ name: link.name, url: `${DOCS_URL}${path}` });
  return crumbs;
}

/** schema.org TechArticle — rendered on docs pages for rich + AI search results. */
export function techArticleJsonLd(input: {
  title: string;
  description: string;
  path: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: input.title,
    description: input.description,
    url: `${DOCS_URL}${input.path}`,
    author: { "@type": "Organization", name: BRAND.name },
    publisher: {
      "@type": "Organization",
      name: BRAND.name,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.svg` },
    },
  };
}

/** schema.org Organization — rendered site-wide from the root layout. */
export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND.name,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.svg`,
    description: BRAND.description,
    sameAs: [...SOCIAL_LINKS],
  };
}

/** schema.org WebSite for the docs property — rendered site-wide. */
export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: `${BRAND.name} Docs`,
    url: DOCS_URL,
    description: BRAND.description,
  };
}
