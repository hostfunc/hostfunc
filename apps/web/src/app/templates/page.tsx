"use client";

import { TemplatesShowcase } from "@/components/marketing/templates-showcase";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { assertMarketingContent, marketingContent } from "@/lib/marketing-content";
import { ArrowRight, Hexagon } from "lucide-react";
import Link from "next/link";

export default function TemplatesPage() {
  const { data: session, isPending } = useSession();
  assertMarketingContent();
  const primaryHref = session ? "/dashboard/new" : "/login";

  return (
    <main className="relative min-h-screen bg-[var(--color-ink)] text-[var(--color-bone)]">
      <div className="gradient-radial-amber pointer-events-none absolute inset-x-0 top-0 h-[560px]" />
      <div className="border-grid pointer-events-none absolute inset-0 opacity-35" />

      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-ink)]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Hexagon className="size-5 text-[var(--color-amber)]" strokeWidth={1.5} />
            <span className="font-display text-xl text-[var(--color-bone)]">hostfunc</span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {marketingContent.navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-[var(--color-bone-muted)] transition-colors hover:text-[var(--color-bone)]"
              >
                {link.label}
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
          </div>
        </div>
      </header>

      <section className="relative border-b border-[var(--color-border)] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-4xl text-center">
            <div className="text-xs uppercase tracking-[0.24em] text-[var(--color-amber)]">
              Templates
            </div>
            <h1 className="mt-6 text-balance font-display text-5xl leading-[1.03] tracking-tight md:text-7xl">
              <span className="text-[var(--color-bone)]">Ship fast.</span>{" "}
              <span className="italic text-[var(--color-amber)]">Fork smarter.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--color-bone-muted)]">
              Production-ready starting points for automations, AI workflows, webhooks, and utility
              services. Pick one and launch in minutes.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full bg-[var(--color-amber)] px-7 text-base font-medium text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
              >
                <Link href={primaryHref}>
                  Start with a template
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="h-12 rounded-full px-7 text-base font-medium text-[var(--color-bone-muted)] hover:bg-white/[0.04] hover:text-[var(--color-bone)]"
              >
                <Link href="/docs/getting-started">Read implementation guide</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-20">
        <div className="mx-auto max-w-7xl px-6">
          <TemplatesShowcase templates={marketingContent.templates} primaryHref={primaryHref} />
        </div>
      </section>

      <section className="relative border-t border-[var(--color-border)] py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-balance font-display text-4xl leading-[1.06] md:text-6xl">
            Build from proven foundations.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--color-bone-muted)]">
            Every template is designed to be customized, composed, and deployed with your existing
            hostfunc workflow.
          </p>
          <div className="mt-10">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-[var(--color-amber)] px-8 text-base font-medium text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
            >
              <Link href={primaryHref}>
                Launch your first one
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
