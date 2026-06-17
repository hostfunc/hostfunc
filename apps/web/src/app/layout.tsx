import { Providers } from "@/components/providers";
import { BRAND } from "@/lib/brand";
import { env } from "@/lib/env";
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
