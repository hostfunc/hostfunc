import { DocsShell } from "@/app/_components/docs-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { BRAND } from "@/lib/brand";
import { organizationJsonLd, websiteJsonLd } from "@/lib/docs-seo";
import { DOCS_URL, GA_ID, GOOGLE_VERIFICATION } from "@/lib/site";
import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { geist, jetbrainsMono, pixelifySans, plusJakartaSans } from "./fonts";

export const metadata: Metadata = {
  metadataBase: new URL(DOCS_URL),
  title: {
    default: "hostfunc Docs",
    template: "%s · hostfunc Docs",
  },
  description: "Documentation for hostfunc — tiny, composable TypeScript functions.",
  applicationName: "hostfunc Docs",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  ...(GOOGLE_VERIFICATION ? { verification: { google: GOOGLE_VERIFICATION } } : {}),
};

export const viewport: Viewport = {
  themeColor: BRAND.ink,
  colorScheme: "dark",
};

export default function DocsRootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} ${pixelifySans.variable}`}
    >
      <body>
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
        <DocsShell>{children}</DocsShell>
      </body>
      {GA_ID ? <GoogleAnalytics gaId={GA_ID} /> : null}
    </html>
  );
}
