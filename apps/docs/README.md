# apps/docs

The standalone hostfunc documentation site (Next.js 16), deployed at
[docs.hostfunc.io](https://docs.hostfunc.io).

## Authoring

Docs content is a typed model in [`lib/docs-content.ts`](./lib/docs-content.ts): `docsSections`
drives the sidebar nav, `docsPages` holds the content for each route (keyed by its root-relative
path, e.g. `/cli`, `/sdk/ai`). The whole site renders from a single catch-all route at
[`app/[[...slug]]/page.tsx`](./app/%5B%5B...slug%5D%5D/page.tsx) — add a page by adding an entry to
`docsPages` (and a nav link in `docsSections`); `generateStaticParams` and the sitemap pick it up
automatically. `assertDocsContentIntegrity()` fails the build if a nav link points at a missing
page.

## Develop

```bash
pnpm dev:docs            # http://localhost:3001
pnpm --filter @hostfunc/docs build
```

## Config

- `NEXT_PUBLIC_DOCS_URL` — canonical docs origin (default `https://docs.hostfunc.io`). Drives
  `metadataBase`, canonicals, robots, and the sitemap.
- `NEXT_PUBLIC_GA_ID` — GA4 measurement ID (analytics off when unset).
- `NEXT_PUBLIC_DOCS_GOOGLE_VERIFICATION` — Google Search Console verification token.
