"use client";

import { ConnectorsShowcase } from "@/components/marketing/connectors-showcase";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { assertMarketingContent, marketingContent } from "@/lib/marketing-content";
import { ArrowRight, ArrowUpRight, Hexagon } from "lucide-react";
import Link from "next/link";

export default function ConnectorsPage() {
  const { data: session, isPending } = useSession();
  assertMarketingContent();
  const primaryHref = session ? "/dashboard/settings/integrations" : "/login";

  return (
    <main className="relative min-h-screen bg-[var(--color-ink)] text-[var(--color-bone)]">
      <div className="gradient-radial-amber pointer-events-none absolute inset-x-0 top-0 h-[560px]" />
      <div className="border-grid pointer-events-none absolute inset-0 opacity-35" />

      <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border)] bg-[var(--color-ink)]/85 backdrop-blur-xl">
        <div className="flex w-full items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Hexagon className="size-5 text-[var(--color-amber)]" strokeWidth={1.5} />
            <span className="font-display text-xl text-[var(--color-bone)]">hostfunc</span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {marketingContent.navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                target={link.label === "Docs" ? "_blank" : undefined}
                rel={link.label === "Docs" ? "noopener noreferrer" : undefined}
                className="text-sm text-[var(--color-bone-muted)] transition-colors hover:text-[var(--color-bone)]"
              >
                <span className="inline-flex items-center gap-1">
                  {link.label}
                  {link.label === "Docs" ? <ArrowUpRight className="size-3.5" /> : null}
                </span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {isPending ? (
              <div className="h-9 w-24 animate-pulse rounded-full bg-white/5" />
            ) : session ? (
              <Button
                asChild
                size="sm"
                className="rounded-full bg-[var(--color-bone)] px-5 font-medium text-[var(--color-ink)] hover:bg-white"
              >
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
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
              </>
            )}
            <Button
              asChild
              size="icon"
              variant="outline"
              className="size-9 rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
            >
              <Link
                href="https://github.com/hostfunc/hostfunc"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open GitHub repository"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
                  <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56l-.01-1.98c-3.2.7-3.88-1.37-3.88-1.37-.52-1.34-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.15.08 1.76 1.2 1.76 1.2 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.72-1.53-2.56-.3-5.24-1.28-5.24-5.7 0-1.26.45-2.3 1.2-3.1-.12-.3-.52-1.5.11-3.12 0 0 .98-.32 3.2 1.19a10.9 10.9 0 0 1 5.82 0c2.22-1.5 3.2-1.19 3.2-1.19.63 1.62.23 2.82.11 3.12.75.8 1.2 1.84 1.2 3.1 0 4.43-2.69 5.4-5.26 5.69.41.36.78 1.08.78 2.18l-.01 3.23c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
                </svg>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative border-b border-[var(--color-border)] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-4xl text-center">
            <div className="text-xs uppercase tracking-[0.24em] text-[var(--color-amber)]">
              Connectors
            </div>
            <h1 className="mt-6 text-balance font-display text-5xl leading-[1.03] tracking-tight md:text-7xl">
              <span className="text-[var(--color-bone)]">Plug your tools in.</span>{" "}
              <span className="italic text-[var(--color-amber)]">Ship automations faster.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--color-bone-muted)]">
              Connect external providers once, then let your functions and agents use those integrations
              safely across your workspace.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full bg-[var(--color-amber)] px-7 text-base font-medium text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
              >
                <Link href={primaryHref}>
                  Connect your first provider
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="h-12 rounded-full px-7 text-base font-medium text-[var(--color-bone-muted)] hover:bg-white/[0.04] hover:text-[var(--color-bone)]"
              >
                <Link href="/docs">Read docs</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-20">
        <div className="mx-auto max-w-screen-2xl px-6">
          <ConnectorsShowcase
            connectors={marketingContent.connectors}
            primaryHref={primaryHref}
            integrationsHref="/dashboard/settings/integrations"
          />
        </div>
      </section>
      <footer className="border-t border-[var(--color-border)] bg-[#070706] py-12">
        <div className="w-full px-6">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="flex items-center gap-2">
              <Hexagon
                className="size-5 text-[var(--color-bone-faint)]"
                strokeWidth={1.5}
              />
              <span className="font-display text-lg text-[var(--color-bone-muted)]">
                hostfunc
              </span>
              <span className="ml-3 text-xs text-[var(--color-bone-faint)]">
                © {new Date().getFullYear()}
              </span>
            </div>
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
    </main>
  );
}
