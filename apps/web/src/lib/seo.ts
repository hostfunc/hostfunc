import { BRAND } from "@/lib/brand";
import { docsSections, getDocsPage } from "@/lib/docs-content";
import { env } from "@/lib/env";
import { marketingContent } from "@/lib/marketing-content";
import type { Metadata } from "next";

const siteUrl = env.NEXT_PUBLIC_SITE_URL;

/** Public profiles used for the `sameAs` graph edges in Organization JSON-LD. */
export const SOCIAL_LINKS = [
  "https://github.com/hostfunc/hostfunc",
  "https://discord.gg/hostfunc",
] as const;

/** The generic brand social card served at `/opengraph-image`. */
export const DEFAULT_OG_IMAGE = "/opengraph-image";

interface PageMetadataInput {
  /** Page title — the `%s · hostfunc` template appends the brand suffix. */
  title: string;
  description: string;
  /** Canonical path, e.g. "/marketplace". Resolved against `metadataBase`. */
  path: string;
  /** Set for non-public surfaces (auth, dashboard) so they stay out of the index. */
  noindex?: boolean;
  /**
   * OG/Twitter card image path. Defaults to the brand card. Pass `false` when
   * the route has its OWN colocated `opengraph-image`/`twitter-image` file
   * (Next auto-injects those, and they must not be duplicated here).
   */
  image?: string | false;
}

/**
 * Build per-page `Metadata` with a unique title, description, self-canonical,
 * and matching Open Graph / Twitter tags.
 *
 * Next only auto-injects `og:image` for the segment that *colocates* an
 * `opengraph-image` file — it is not inherited by descendant routes. So unless
 * a route opts out with `image: false`, this attaches an explicit card URL to
 * guarantee every page previews with an image when shared.
 */
export function pageMetadata(input: PageMetadataInput): Metadata {
  const { title, description, path, noindex, image } = input;
  const url = `${siteUrl}${path}`;
  const imagePath = image === false ? null : (image ?? DEFAULT_OG_IMAGE);
  const images = imagePath ? [{ url: imagePath, width: 1200, height: 630, alt: title }] : undefined;

  const metadata: Metadata = {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: BRAND.name,
      url,
      title,
      description,
      locale: "en_US",
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(images ? { images } : {}),
    },
  };

  if (noindex) {
    metadata.robots = { index: false, follow: false };
  }

  return metadata;
}

/** schema.org Organization — rendered site-wide from the root layout. */
export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND.name,
    url: siteUrl,
    logo: `${siteUrl}/logo.svg`,
    description: BRAND.description,
    sameAs: [...SOCIAL_LINKS],
  };
}

/** schema.org WebSite — rendered site-wide from the root layout. */
export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND.name,
    url: siteUrl,
    description: BRAND.description,
  };
}

/**
 * schema.org SoftwareApplication for the product itself, including the public
 * pricing tiers as Offers. Rendered on the homepage.
 */
export function softwareApplicationJsonLd(): Record<string, unknown> {
  const offers = marketingContent.pricing.plans.map((plan) => ({
    "@type": "Offer",
    name: plan.name,
    price: plan.priceMonthly.replace(/[^0-9.]/g, "") || "0",
    priceCurrency: "USD",
    description: plan.description,
  }));

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: BRAND.name,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    url: siteUrl,
    description: BRAND.description,
    offers,
    sameAs: [...SOCIAL_LINKS],
  };
}

/** schema.org BreadcrumbList from an ordered list of `{ name, path }` crumbs. */
export function breadcrumbJsonLd(
  crumbs: Array<{ name: string; path: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${siteUrl}${crumb.path}`,
    })),
  };
}

/** Per-page `Metadata` for a docs route, sourced from its `docsPages` content. */
export function docsMetadata(path: string): Metadata {
  const page = getDocsPage(path);
  // All docs routes share the "Documentation" section card. Pointing at it
  // explicitly (rather than relying on file-convention inheritance, which Next
  // does not propagate to descendant routes) guarantees a consistent card.
  return pageMetadata({
    title: page.title,
    description: page.summary,
    path,
    image: "/og/docs",
  });
}

/** Home → Docs → [Section] → [Page] breadcrumb trail for a docs route. */
export function docsBreadcrumbs(path: string): Array<{ name: string; path: string }> {
  const crumbs: Array<{ name: string; path: string }> = [
    { name: "Home", path: "/" },
    { name: "Docs", path: "/docs" },
  ];
  if (path === "/docs") return crumbs;

  const section = docsSections.find((s) => s.links.some((link) => link.href === path));
  const link = section?.links.find((l) => l.href === path);
  if (link) crumbs.push({ name: link.name, path });
  return crumbs;
}

/** schema.org SoftwareSourceCode — rendered on a marketplace function page. */
export function softwareSourceCodeJsonLd(input: {
  name: string;
  description: string;
  path: string;
  author: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: input.name,
    description: input.description,
    url: `${siteUrl}${input.path}`,
    codeRepository: `${siteUrl}${input.path}`,
    programmingLanguage: "TypeScript",
    runtimePlatform: "hostfunc",
    author: { "@type": "Organization", name: input.author },
  };
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
    url: `${siteUrl}${input.path}`,
    author: { "@type": "Organization", name: BRAND.name },
    publisher: {
      "@type": "Organization",
      name: BRAND.name,
      logo: { "@type": "ImageObject", url: `${siteUrl}/logo.svg` },
    },
  };
}
