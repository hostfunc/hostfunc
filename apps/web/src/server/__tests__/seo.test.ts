import assert from "node:assert/strict";
import test from "node:test";

// The SEO modules import `@/lib/env`, which validates `process.env` at load
// time. Populate the required vars before dynamically importing them. A
// bogus, connection-refusing DATABASE_URL keeps the sitemap's marketplace
// lookup from ever reaching a real database during the test.
process.env.DATABASE_URL ??= "postgres://127.0.0.1:1/test";
process.env.BETTER_AUTH_SECRET ??= "x".repeat(32);
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.EMAIL_FROM ??= "test@hostfunc.io";
process.env.SECRETS_MASTER_KEY ??= "x".repeat(44);
process.env.EXEC_TOKEN_SECRET ??= "y".repeat(44);
process.env.HOSTFUNC_RUNTIME_URL ??= "http://localhost:8787";
process.env.RUNTIME_LOOKUP_TOKEN ??= "lookup-token";
process.env.NEXT_PUBLIC_SITE_URL ??= "https://hostfunc.io";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

const seo = await import("../../lib/seo");
const robotsModule = await import("../../app/robots");
const sitemapModule = await import("../../app/sitemap");

test("pageMetadata sets a self-canonical and matching OG/Twitter", () => {
  const meta = seo.pageMetadata({
    title: "Marketplace",
    description: "Browse functions.",
    path: "/marketplace",
  });
  assert.equal(meta.alternates?.canonical, "/marketplace");
  assert.equal(meta.title, "Marketplace");
  // openGraph.url is absolute against the site origin.
  assert.equal((meta.openGraph as { url?: string }).url, `${siteUrl}/marketplace`);
  assert.equal((meta.twitter as { card?: string }).card, "summary_large_image");
  // Public pages stay indexable (no robots override).
  assert.equal(meta.robots, undefined);
});

test("pageMetadata attaches the brand card by default and supports opt-out", () => {
  const withDefault = seo.pageMetadata({ title: "T", description: "D", path: "/x" });
  const ogImages = (withDefault.openGraph as { images?: Array<{ url: string }> }).images;
  assert.equal(ogImages?.[0]?.url, "/opengraph-image");

  // Routes with their own colocated opengraph-image opt out to avoid duplicates.
  const optedOut = seo.pageMetadata({ title: "T", description: "D", path: "/x", image: false });
  assert.equal((optedOut.openGraph as { images?: unknown }).images, undefined);
  assert.equal((optedOut.twitter as { images?: unknown }).images, undefined);
});

test("pageMetadata noindex flag emits a no-index robots directive", () => {
  const meta = seo.pageMetadata({
    title: "Function not found",
    description: "Missing.",
    path: "/marketplace/nope",
    noindex: true,
  });
  assert.deepEqual(meta.robots, { index: false, follow: false });
});

test("organization JSON-LD carries the brand identity and social profiles", () => {
  const data = seo.organizationJsonLd();
  assert.equal(data["@type"], "Organization");
  assert.equal(data.url, siteUrl);
  assert.ok(Array.isArray(data.sameAs) && (data.sameAs as string[]).length >= 2);
});

test("breadcrumb JSON-LD numbers positions from 1 with absolute items", () => {
  const data = seo.breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Docs", path: "/docs" },
  ]);
  const items = data.itemListElement as Array<{ position: number; item: string }>;
  assert.equal(items[0]?.position, 1);
  assert.equal(items[1]?.item, `${siteUrl}/docs`);
});

test("docsBreadcrumbs builds Home -> Docs -> Page for a leaf route", () => {
  const crumbs = seo.docsBreadcrumbs("/docs/cli");
  assert.deepEqual(
    crumbs.map((c) => c.path),
    ["/", "/docs", "/docs/cli"],
  );
  // The root docs page has no third crumb.
  assert.equal(seo.docsBreadcrumbs("/docs").length, 2);
});

test("robots allows crawling but disallows the app surface and points to the sitemap", () => {
  const robots = robotsModule.default();
  const rules = robots.rules as { allow?: string; disallow?: string[] };
  assert.equal(rules.allow, "/");
  assert.ok(rules.disallow?.includes("/dashboard"));
  assert.ok(rules.disallow?.includes("/api/"));
  assert.equal(robots.sitemap, `${siteUrl}/sitemap.xml`);
});

test("sitemap lists public routes, excludes the app and redirect aliases", async () => {
  const entries = await sitemapModule.default();
  const urls = entries.map((e) => e.url);
  assert.ok(urls.includes(`${siteUrl}/`));
  assert.ok(urls.includes(`${siteUrl}/marketplace`));
  assert.ok(urls.includes(`${siteUrl}/docs/cli`));
  // /templates is a redirect alias and the app surface is private.
  assert.ok(!urls.includes(`${siteUrl}/templates`));
  assert.ok(!urls.some((u) => u.includes("/dashboard")));
  assert.ok(!urls.some((u) => u.includes("/login")));
  // The two orphan docs content keys without route folders are not advertised.
  assert.ok(!urls.includes(`${siteUrl}/docs/limits`));
});
