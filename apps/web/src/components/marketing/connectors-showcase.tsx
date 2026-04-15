"use client";

import { ConnectorStrip } from "@/components/marketing/connector-strip";
import { Button } from "@/components/ui/button";
import type { MarketingContent } from "@/lib/marketing-content";
import { ArrowRight, Lock, PlugZap, ShieldCheck } from "lucide-react";
import Link from "next/link";

interface ConnectorsShowcaseProps {
  connectors: MarketingContent["connectors"];
  primaryHref: string;
  integrationsHref: string;
}

export function ConnectorsShowcase({
  connectors,
  primaryHref,
  integrationsHref,
}: ConnectorsShowcaseProps) {
  return (
    <div className="space-y-20">
      <section className="space-y-8">
        <div className="max-w-3xl space-y-4">
          <div className="text-xs uppercase tracking-[0.24em] text-[var(--color-amber)]">
            Connector Catalog
          </div>
          <h2 className="font-display text-4xl tracking-tight text-[var(--color-bone)] md:text-5xl">
            Connect once, compose everywhere.
          </h2>
          <p className="text-lg leading-relaxed text-[var(--color-bone-muted)]">
            Link external providers and let every function in your workspace use those credentials
            securely, without manual credential wiring in each script.
          </p>
        </div>
        <ConnectorStrip connectors={connectors} />
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/75 p-6">
          <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg border border-[var(--color-amber)]/30 bg-[var(--color-amber)]/10">
            <PlugZap className="size-5 text-[var(--color-amber)]" />
          </div>
          <h3 className="font-display text-2xl text-[var(--color-bone)]">One-click auth flows</h3>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-bone-muted)]">
            OAuth flows are handled by the control plane, so you can connect providers without custom
            redirect-handling boilerplate.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/75 p-6">
          <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg border border-[var(--color-amber)]/30 bg-[var(--color-amber)]/10">
            <Lock className="size-5 text-[var(--color-amber)]" />
          </div>
          <h3 className="font-display text-2xl text-[var(--color-bone)]">Secret-backed tokens</h3>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-bone-muted)]">
            Connector credentials are stored as secrets and retrieved at runtime through the same
            encrypted path as your function-specific secrets.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/75 p-6">
          <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg border border-[var(--color-amber)]/30 bg-[var(--color-amber)]/10">
            <ShieldCheck className="size-5 text-[var(--color-amber)]" />
          </div>
          <h3 className="font-display text-2xl text-[var(--color-bone)]">Org-wide control</h3>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-bone-muted)]">
            Access is scoped to your workspace and managed through settings, giving teams one place to
            rotate and monitor integrations.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-8 md:p-10">
        <div className="max-w-3xl space-y-4">
          <h3 className="font-display text-4xl tracking-tight text-[var(--color-bone)]">
            Ready to connect your stack?
          </h3>
          <p className="text-lg leading-relaxed text-[var(--color-bone-muted)]">
            Start with GitHub today, then expand to additional providers as they land. Use the same
            secure model for every workflow you automate.
          </p>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="h-12 rounded-full bg-[var(--color-amber)] px-7 text-base font-medium text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
          >
            <Link href={primaryHref}>
              Start building
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="ghost"
            className="h-12 rounded-full px-7 text-base font-medium text-[var(--color-bone-muted)] hover:bg-white/[0.04] hover:text-[var(--color-bone)]"
          >
            <Link href={integrationsHref}>Open integration settings</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
