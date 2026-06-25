"use client";

import { ConnectorsShowcase } from "@/components/marketing/connectors-showcase";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { assertMarketingContent, marketingContent } from "@/lib/marketing-content";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function ConnectorsPage() {
  const { data: session } = useSession();
  assertMarketingContent();
  const primaryHref = session ? "/dashboard/settings/integrations" : "/login";

  return (
    <main className="relative min-h-screen bg-[var(--color-ink)] text-[var(--color-bone)]">
      <div className="gradient-radial-amber pointer-events-none absolute inset-x-0 top-0 h-[560px]" />

      <SiteHeader />

      <section className="relative border-b border-[var(--color-border)] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-4xl text-center">
            <div className="text-xs uppercase tracking-[0.24em] text-[var(--color-amber)]">
              Connectors
            </div>
            <h1 className="mt-6 text-balance font-display text-5xl leading-[1.03] tracking-tight md:text-7xl">
              <span className="text-[var(--color-bone)]">Plug your tools in.</span>{" "}
              <span className="text-[var(--color-amber)]">Ship automations faster.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--color-bone-muted)]">
              Connect external providers once, then let your functions and agents use those
              integrations safely across your workspace.
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
      <SiteFooter />
    </main>
  );
}
