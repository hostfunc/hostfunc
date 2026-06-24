import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

/**
 * Canonical origin for the docs site. The live user docs currently render from
 * the web app at `hostfunc.io/docs`; this standalone site is a pre-launch
 * scaffold (see README). Override with `NEXT_PUBLIC_DOCS_URL` once it ships.
 */
const docsUrl = process.env.NEXT_PUBLIC_DOCS_URL ?? "https://docs.hostfunc.io";

/**
 * ⚠️ Launch toggle: while this scaffold is unfinished it is kept OUT of the
 * index so it can't compete with `hostfunc.io/docs` for the same queries.
 * When the docs migration goes live, set this to `false` (and flip the
 * `disallow` in `robots.ts`).
 */
const SCAFFOLD_NOINDEX = true;

export const metadata: Metadata = {
  metadataBase: new URL(docsUrl),
  title: {
    default: "hostfunc Docs",
    template: "%s · hostfunc Docs",
  },
  description: "Documentation for hostfunc — tiny, composable TypeScript functions.",
  applicationName: "hostfunc Docs",
  alternates: { canonical: "/" },
  ...(SCAFFOLD_NOINDEX ? { robots: { index: false, follow: false } } : {}),
};

export const viewport: Viewport = {
  colorScheme: "dark light",
};

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-sans-serif, system-ui", margin: 0 }}>
        <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>{children}</main>
      </body>
    </html>
  );
}
