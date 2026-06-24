import { Providers } from "@/components/providers";
import { JsonLd } from "@/components/seo/json-ld";
import { BRAND } from "@/lib/brand";
import { env } from "@/lib/env";
import { organizationJsonLd, softwareApplicationJsonLd, websiteJsonLd } from "@/lib/seo";
import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { geist, jetbrainsMono, pixelifySans, plusJakartaSans } from "./fonts";

const siteUrl = env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: BRAND.title,
    template: "%s · hostfunc",
  },
  description: BRAND.description,
  applicationName: BRAND.name,
  keywords: [
    "serverless",
    "typescript",
    "functions",
    "edge functions",
    "faas",
    "deploy",
    "webhooks",
    "cron",
    "hostfunc",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    url: siteUrl,
    title: BRAND.title,
    description: BRAND.description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.title,
    description: BRAND.description,
  },
  robots: { index: true, follow: true },
  ...(env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: env.GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export const viewport: Viewport = {
  themeColor: BRAND.ink,
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} ${pixelifySans.variable}`}
    >
      <body>
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
        <JsonLd data={softwareApplicationJsonLd()} />
        <Providers>{children}</Providers>
      </body>
      {env.NEXT_PUBLIC_GA_ID ? <GoogleAnalytics gaId={env.NEXT_PUBLIC_GA_ID} /> : null}
    </html>
  );
}
