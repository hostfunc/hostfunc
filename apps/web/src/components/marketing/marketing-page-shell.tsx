import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { marketingContent } from "@/lib/marketing-content";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Server-rendered chrome (header + footer) shared by the static marketing content
 * pages — `/pricing`, `/compare/*`, `/use-cases/*`, `/blog`. The homepage keeps its
 * own client-side, auth-aware nav; these pages don't need session state, so a server
 * component keeps them fully static and crawlable, and the nav/footer links form the
 * internal link graph Google uses to discover and weight every page.
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

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border)] bg-[var(--color-ink)]/85 backdrop-blur-xl">
      <div className="flex w-full items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo wordmarkClassName="text-xl" />
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {marketingContent.navLinks.map((link) => {
            const external = link.label === "Docs";
            return (
              <Link
                key={link.label}
                href={link.href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                className="text-sm text-[var(--color-bone-muted)] transition-colors hover:text-[var(--color-bone)]"
              >
                <span className="inline-flex items-center gap-1">
                  {link.label}
                  {external ? <ArrowUpRight className="size-3.5" /> : null}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-sm text-[var(--color-bone-muted)] transition-colors hover:text-[var(--color-bone)] sm:inline"
          >
            Sign in
          </Link>
          <Button
            asChild
            size="sm"
            className="rounded-full bg-[var(--color-amber)] px-5 font-medium text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
          >
            <Link href="/login">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[#070706] py-12">
      <div className="w-full px-6">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <Link href="/" className="flex items-center gap-2">
            <Logo tone="muted" wordmarkClassName="text-lg text-[var(--color-bone-muted)]" />
          </Link>
          <div className="flex flex-wrap gap-x-7 gap-y-2 text-sm">
            {marketingContent.footerLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[var(--color-bone-muted)] transition-colors hover:text-[var(--color-bone)]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <p className="mt-8 max-w-md text-xs leading-relaxed text-[var(--color-bone-faint)]">
          {marketingContent.footerNote}
        </p>
      </div>
    </footer>
  );
}
