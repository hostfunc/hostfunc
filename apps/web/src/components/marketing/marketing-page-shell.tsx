import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import type { ReactNode } from "react";

/**
 * Chrome (header + footer) shared by the static marketing content pages —
 * `/pricing`, `/compare/*`, `/use-cases/*`, `/blog`. The header is a client
 * island ({@link SiteHeader}) so it can show the right CTA for the session and
 * carry the mobile hamburger; the footer stays server-rendered. The page body
 * (`children`) remains a server component, keeping these pages crawlable.
 */
export function MarketingPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen bg-[var(--color-ink)] text-[var(--color-bone)]">
      <SiteHeader />
      {children}
      <SiteFooter />
    </main>
  );
}
