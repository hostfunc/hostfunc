"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { motion } from "framer-motion";
import {
  assertMarketingContent,
  marketingContent,
} from "@/lib/marketing-content";
import {
  Activity,
  ArrowRight,
  Calendar,
  Check,
  Code,
  Gauge,
  GitBranch,
  Hexagon,
  Library,
  Lock,
  PlugZap,
  Server,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { AgentConversation } from "@/components/marketing/agent-conversation";
import { AnimatedEditor } from "@/components/marketing/animated-editor";
import { ArchitectureFlow } from "@/components/marketing/architecture-flow";
import { ConnectorStrip } from "@/components/marketing/connector-strip";
import { LineageBuilder } from "@/components/marketing/lineage-builder";
import { TemplateMarquee } from "@/components/marketing/template-marquee";
import { TerminalDemo } from "@/components/marketing/terminal-demo";
import { TriggerShowcase } from "@/components/marketing/trigger-showcase";

// Three.js needs SSR off
const HeroScene = dynamic(
  () => import("@/components/marketing/hero-scene").then((m) => m.HeroScene),
  { ssr: false, loading: () => null },
);

const ICON_MAP: Record<string, typeof Code> = {
  code: Code,
  lock: Lock,
  activity: Activity,
  "plug-zap": PlugZap,
  "calendar-clock": Calendar,
  "git-branch": GitBranch,
  library: Library,
  gauge: Gauge,
  server: Server,
};

export default function HomePage() {
  const { data: session, isPending } = useSession();
  assertMarketingContent();
  const primaryHref = session ? "/dashboard" : marketingContent.primaryCta.href;
  const pricingCtaHref = session ? "/dashboard/settings/billing" : "/login";

  return (
    <main className="relative min-h-screen bg-[var(--color-ink)] text-[var(--color-bone)]">
      {/* ─────────────────────────────────── NAV ─────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-ink)]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Hexagon className="size-5 text-[var(--color-amber)]" strokeWidth={1.5} />
            <span className="font-display text-xl text-[var(--color-bone)]">
              hostfunc
            </span>
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

      {/* ─────────────────────────────────── HERO ─────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* 3D scene as background */}
        <div className="absolute inset-0 -z-10 opacity-90">
          <HeroScene />
        </div>
        {/* Radial fade for legibility */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_var(--color-ink)_75%)]" />
        <div className="gradient-radial-amber absolute inset-x-0 top-0 -z-10 h-[600px]" />

        <div className="mx-auto max-w-6xl px-6 py-32 lg:py-40">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-ink-overlay)] px-3 py-1 text-xs text-[var(--color-bone-muted)] backdrop-blur-md">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-amber)] opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-[var(--color-amber)]" />
              </span>
              {marketingContent.badge}
            </div>

            <h1 className="mt-10 text-balance font-display text-5xl leading-[1.02] tracking-tight text-[var(--color-bone)] md:text-7xl lg:text-[88px]">
              {marketingContent.headlineLead}{" "}
              <em className="not-italic text-[var(--color-amber)]">
                <span className="italic">{marketingContent.headlineEmphasis}</span>
              </em>{" "}
              <span className="text-[var(--color-bone-muted)]">
                {marketingContent.headlineTail}
              </span>
            </h1>

            <p className="mt-8 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--color-bone-muted)]">
              {marketingContent.subheadline}
            </p>

            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full bg-[var(--color-amber)] px-7 text-base font-medium text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
              >
                <Link href={primaryHref}>
                  {marketingContent.primaryCta.label}
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="h-12 rounded-full px-7 text-base font-medium text-[var(--color-bone-muted)] hover:bg-white/[0.04] hover:text-[var(--color-bone)]"
              >
                <Link href={marketingContent.secondaryCta.href}>
                  {marketingContent.secondaryCta.label}
                </Link>
              </Button>
            </div>

            {/* Trust line */}
            <div className="mt-16 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs uppercase tracking-widest text-[var(--color-bone-faint)]">
              {marketingContent.trustItems.map((item, i) => (
                <span key={item} className="flex items-center gap-3">
                  {i > 0 && <span className="text-[var(--color-border-strong)]">·</span>}
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────── HERO EDITOR ───────────────────────────── */}
      <section className="relative px-6 pb-24">
        <div className="mx-auto max-w-4xl">
          <AnimatedEditor
            filename={marketingContent.heroEditor.filename}
            code={marketingContent.heroEditor.code}
            speed={14}
            autoStart
          />
        </div>
      </section>

      {/* ─────────────────────────── AGENT-NATIVE PITCH ──────────────────────── */}
      <section className="relative border-t border-[var(--color-border)] bg-gradient-to-b from-[var(--color-ink)] via-[#0d0c0a] to-[var(--color-ink)] py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-xs uppercase tracking-[0.25em] text-[var(--color-amber)]">
              {marketingContent.agentPitch.eyebrow}
            </div>
            <h2 className="mt-4 text-balance font-display text-4xl leading-[1.05] text-[var(--color-bone)] md:text-6xl">
              <span className="italic">
                {marketingContent.agentPitch.headline}
              </span>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--color-bone-muted)]">
              {marketingContent.agentPitch.body}
            </p>
          </div>

          {/* Side-by-side: agent conversation + lineage filling in */}
          <div className="mt-16 grid gap-6 lg:grid-cols-2">
            <AgentConversation messages={marketingContent.agentPitch.conversation} />
            <LineageBuilder
              nodes={marketingContent.agentPitch.lineage.nodes}
              edges={marketingContent.agentPitch.lineage.edges}
              staggerMs={1200}
            />
          </div>

          {/* Three pillars below */}
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {marketingContent.agentPitch.pillars.map((pillar) => (
              <div
                key={pillar.title}
                className="rounded-xl border border-[var(--color-border)] bg-white/[0.02] p-6"
              >
                <h3 className="font-display text-xl text-[var(--color-bone)]">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-bone-muted)]">
                  {pillar.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────── TRIGGERS ─────────────────────────────── */}
      <section className="relative border-t border-[var(--color-border)] py-32">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader
            eyebrow="Triggers"
            title={
              <>
                Four ways in.{" "}
                <span className="italic text-[var(--color-bone-muted)]">
                  All unified.
                </span>
              </>
            }
            body="HTTP for webhooks, cron for schedules, email for inbound mail, MCP for agents. Every trigger flows through the same dispatch path — same secrets, same observability, same egress control."
          />
          <div className="mt-16">
            <TriggerShowcase triggers={marketingContent.triggers} />
          </div>
        </div>
      </section>

      {/* ─────────────────────────── COMPOSITION ──────────────────────────────── */}
      <section className="relative border-t border-[var(--color-border)] bg-[#0c0b0a] py-32">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader
            eyebrow={marketingContent.composition.eyebrow}
            title={<span className="italic">{marketingContent.composition.headline}</span>}
            body={marketingContent.composition.body}
          />
          <div className="mt-16 grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center">
            <AnimatedEditor
              filename="share-link.ts"
              code={marketingContent.composition.snippet}
              speed={16}
            />
            <LineageBuilder
              nodes={marketingContent.composition.lineage.nodes}
              edges={marketingContent.composition.lineage.edges}
              staggerMs={750}
            />
          </div>
        </div>
      </section>

      {/* ─────────────────────────────── CLI ──────────────────────────────────── */}
      <section className="relative border-t border-[var(--color-border)] py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-[var(--color-amber)]">
                {marketingContent.cli.eyebrow}
              </div>
              <h2 className="mt-4 text-balance font-display text-4xl leading-[1.05] text-[var(--color-bone)] md:text-5xl">
                <span className="italic">{marketingContent.cli.headline}</span>
              </h2>
              <p className="mt-6 max-w-md text-pretty text-lg leading-relaxed text-[var(--color-bone-muted)]">
                {marketingContent.cli.body}
              </p>
              <div className="mt-8 flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-ink-elevated)] px-4 py-3 font-mono text-sm">
                <span className="text-[var(--color-bone-faint)]">$</span>
                <span className="text-[var(--color-bone)]">npm i -g @hostfunc/cli</span>
              </div>
            </div>
            <TerminalDemo sequence={marketingContent.cli.sequence} />
          </div>
        </div>
      </section>

      {/* ────────────────────────── ARCHITECTURE ──────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-[var(--color-border)] bg-[#0c0b0a] py-32">
        <div className="border-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader
            eyebrow={marketingContent.architecture.eyebrow}
            title={<span className="italic">{marketingContent.architecture.headline}</span>}
            body={marketingContent.architecture.body}
          />
          <div className="mt-20">
            <ArchitectureFlow stages={marketingContent.architecture.stages} />
          </div>
        </div>
      </section>

      {/* ───────────────────────────── CONNECTORS ─────────────────────────────── */}
      <section className="relative border-t border-[var(--color-border)] py-32">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader
            eyebrow="Connectors"
            title={
              <>
                One-click OAuth.{" "}
                <span className="italic text-[var(--color-bone-muted)]">
                  Tokens stored, secrets shared.
                </span>
              </>
            }
            body="Click 'Connect GitHub'. Token is stored as an org secret. Any function — or any agent acting on your behalf — can call the API. More providers shipping weekly."
          />
          <div className="mt-16">
            <ConnectorStrip connectors={marketingContent.connectors} />
          </div>
        </div>
      </section>

      {/* ───────────────────────────── TEMPLATES ──────────────────────────────── */}
      <section className="relative border-t border-[var(--color-border)] bg-[#0c0b0a] py-32">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <SectionHeader
            eyebrow="Templates"
            title={
              <>
                Don't start from blank.{" "}
                <span className="italic">Fork it.</span>
              </>
            }
            body="A curated gallery of starting points with secrets and triggers pre-wired. One click, you're in your editor with working code."
            center
          />
        </div>
        <div className="mt-16">
          <TemplateMarquee templates={marketingContent.templates} />
        </div>
      </section>

      {/* ────────────────────────── FEATURE GRID ──────────────────────────────── */}
      <section className="relative border-t border-[var(--color-border)] py-32">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader
            eyebrow="Capabilities"
            title={
              <>
                Everything you need.{" "}
                <span className="italic text-[var(--color-bone-muted)]">
                  Nothing you don't.
                </span>
              </>
            }
            body="The bundle of capabilities you actually use to ship — without the kitchen-sink platform tax."
          />
          <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-2 lg:grid-cols-3">
            {marketingContent.features.map((feature) => {
              const Icon = ICON_MAP[feature.icon] ?? Code;
              return (
                <div
                  key={feature.title}
                  className="group relative bg-[var(--color-ink)] p-7 transition-colors hover:bg-[var(--color-ink-elevated)]"
                >
                  <Icon
                    className="size-5 text-[var(--color-amber)]"
                    strokeWidth={1.5}
                  />
                  <h3 className="mt-5 font-display text-xl text-[var(--color-bone)]">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-bone-muted)]">
                    {feature.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ────────────────────────────── PRICING ───────────────────────────────── */}
      <section className="relative border-t border-[var(--color-border)] bg-[#0c0b0a] py-32">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader
            eyebrow={marketingContent.pricing.eyebrow}
            title={
              <>
                {marketingContent.pricing.headline.split(".")[0]}.{" "}
                <span className="italic text-[var(--color-bone-muted)]">
                  {marketingContent.pricing.headline.split(".").slice(1).join(".").trim()}
                </span>
              </>
            }
            body={marketingContent.pricing.body}
          />
          <div className="mt-16 grid gap-5 lg:grid-cols-3">
            {marketingContent.pricing.plans.map((plan, index) => (
              <motion.div
                key={plan.slug}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className={`group rounded-2xl border bg-[var(--color-ink-elevated)]/75 p-6 transition-all duration-300 hover:-translate-y-0.5 ${
                  plan.highlighted
                    ? "border-[var(--color-amber)]/45 shadow-[0_0_0_1px_rgba(232,163,23,0.2),0_20px_50px_rgba(232,163,23,0.08)]"
                    : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-bone-faint)]">{plan.name}</p>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="font-display text-4xl leading-none text-[var(--color-bone)]">{plan.priceMonthly}</span>
                      <span className="text-sm text-[var(--color-bone-muted)]">/month</span>
                    </div>
                  </div>
                  {plan.highlighted ? (
                    <span className="rounded-full border border-[var(--color-amber)]/40 bg-[var(--color-amber)]/15 px-2.5 py-1 text-[10px] uppercase tracking-wider text-[var(--color-amber)]">
                      Popular
                    </span>
                  ) : null}
                </div>

                <p className="mt-4 text-sm leading-relaxed text-[var(--color-bone-muted)]">{plan.description}</p>

                <div className="mt-6 space-y-3">
                  {[plan.executionsPerDay, plan.workspaces, plan.teamMembers, plan.runtime].map((item) => (
                    <div key={`${plan.slug}-${item}`} className="flex items-center gap-2 text-sm text-[var(--color-bone)]">
                      <Check className="size-4 text-[var(--color-amber)]" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <Button
                  asChild
                  className={`mt-7 h-11 w-full rounded-full text-sm font-medium ${
                    plan.highlighted
                      ? "bg-[var(--color-amber)] text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
                      : "border border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone)] hover:bg-white/[0.05]"
                  }`}
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  <Link href={pricingCtaHref}>
                    {session ? "Manage plan" : "Get started"}
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────────── COMMUNITY ──────────────────────────────── */}
      <section className="relative border-t border-[var(--color-border)] bg-[#0c0b0a] py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-16 md:grid-cols-2 md:items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-[var(--color-amber)]">
                {marketingContent.community.eyebrow}
              </div>
              <h2 className="mt-4 text-balance font-display text-4xl leading-[1.05] text-[var(--color-bone)] md:text-5xl">
                <span className="italic">
                  {marketingContent.community.headline}
                </span>
              </h2>
              <p className="mt-6 text-pretty text-lg leading-relaxed text-[var(--color-bone-muted)]">
                {marketingContent.community.body}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-full border-[var(--color-border-strong)] bg-transparent text-[var(--color-bone)] hover:bg-white/[0.04]"
                >
                  <Link href="https://github.com/hostfunc/hostfunc">
                    Star on GitHub
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="rounded-full text-[var(--color-bone-muted)] hover:bg-white/[0.04] hover:text-[var(--color-bone)]"
                >
                  <Link href="https://discord.gg/hostfunc">Join Discord</Link>
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink)] p-8">
              <dl className="grid gap-6 sm:grid-cols-2">
                {marketingContent.community.facts.map((fact) => (
                  <div key={fact.label}>
                    <dt className="text-xs uppercase tracking-widest text-[var(--color-bone-faint)]">
                      {fact.label}
                    </dt>
                    <dd className="mt-2 font-display text-2xl italic text-[var(--color-bone)]">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────── CLOSER ──────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-[var(--color-border)] py-32">
        <div className="gradient-radial-amber pointer-events-none absolute inset-x-0 bottom-0 top-0" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-balance font-display text-5xl leading-[1.02] text-[var(--color-bone)] md:text-7xl">
            <span className="italic">{marketingContent.closer.headline}</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-[var(--color-bone-muted)]">
            {marketingContent.closer.body}
          </p>
          <div className="mt-10 flex justify-center">
            <Button
              asChild
              size="lg"
              className="h-14 rounded-full bg-[var(--color-amber)] px-8 text-base font-medium text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
            >
              <Link href={primaryHref}>
                {marketingContent.primaryCta.label}
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ────────────────────────────── FOOTER ────────────────────────────────── */}
      <footer className="border-t border-[var(--color-border)] bg-[#070706] py-12">
        <div className="mx-auto max-w-7xl px-6">
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

/* ─────────────────── Section header — reused throughout ────────────────────── */

function SectionHeader({
  eyebrow,
  title,
  body,
  center = false,
}: {
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <div className="text-xs uppercase tracking-[0.25em] text-[var(--color-amber)]">
        {eyebrow}
      </div>
      <h2 className="mt-4 text-balance font-display text-4xl leading-[1.05] text-[var(--color-bone)] md:text-5xl">
        {title}
      </h2>
      <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--color-bone-muted)]">
        {body}
      </p>
    </div>
  );
}