"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { assertMarketingContent, marketingContent } from "@/lib/marketing-content";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Blocks,
  Calendar,
  Check,
  Code,
  Gauge,
  GitBranch,
  Globe,
  Library,
  Link2,
  Lock,
  PlugZap,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { BrandName } from "@/components/brand/brand-name";
import { CloudflareMark, TypeScriptMark } from "@/components/brand/tech-icons";
import { AgentConversation } from "@/components/marketing/agent-conversation";
import { AnimatedEditor } from "@/components/marketing/animated-editor";
import { ArchitectureFlow } from "@/components/marketing/architecture-flow";
import { ConnectorStrip } from "@/components/marketing/connector-strip";
import { LineageBuilder } from "@/components/marketing/lineage-builder";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { TemplateMarquee } from "@/components/marketing/template-marquee";
import { TerminalDemo } from "@/components/marketing/terminal-demo";
import { TriggerShowcase } from "@/components/marketing/trigger-showcase";

const ICON_MAP: Record<string, typeof Code> = {
  code: Code,
  lock: Lock,
  activity: Activity,
  "plug-zap": PlugZap,
  "calendar-clock": Calendar,
  "git-branch": GitBranch,
  globe: Globe,
  link: Link2,
  library: Library,
  gauge: Gauge,
  server: Server,
  blocks: Blocks,
};

// Hero trust line — `icon` keys from marketingContent.trustItems map to a glyph.
const TRUST_ICON: Record<string, ReactNode> = {
  cloudflare: <CloudflareMark className="size-3.5" />,
  mcp: <Sparkles className="size-3.5 text-[var(--color-amber)]" />,
  agpl: <ShieldCheck className="size-3.5 text-emerald-400" />,
  typescript: <TypeScriptMark className="size-3.5" />,
  "self-host": <Server className="size-3.5 text-sky-400" />,
};

export default function HomePage() {
  const { data: session } = useSession();
  assertMarketingContent();
  const primaryHref = session ? "/dashboard" : marketingContent.primaryCta.href;
  const pricingCtaHref = session ? "/dashboard/settings/billing" : "/login";

  return (
    <main className="relative min-h-screen bg-[var(--color-ink)] text-[var(--color-bone)]">
      {/* ─────────────────────────────────── NAV ─────────────────────────────────── */}
      <SiteHeader />

      {/* ─────────────────────────────────── HERO ─────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="gradient-radial-amber absolute inset-x-0 top-0 -z-10 h-[600px]" />

        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:py-40">
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
                {marketingContent.headlineEmphasis}
              </em>{" "}
              <span className="text-[var(--color-bone-muted)]">
                {marketingContent.headlineTail}
              </span>
            </h1>

            <p className="mt-8 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--color-bone-muted)]">
              <BrandName text={marketingContent.subheadline} />
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
                <span key={item.label} className="flex items-center gap-3">
                  {i > 0 && <span className="text-[var(--color-border-strong)]">·</span>}
                  <span className="flex items-center gap-1.5">
                    {TRUST_ICON[item.icon]}
                    {item.label}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────── HERO EDITOR ───────────────────────────── */}
      <section className="relative px-6 pb-24">
        <div className="mx-auto max-w-5xl">
          <AnimatedEditor
            filename={marketingContent.heroEditor.filename}
            code={marketingContent.heroEditor.code}
            speed={14}
            autoStart
          />
        </div>
      </section>

      {/* ─────────────────────────── AGENT-NATIVE PITCH ──────────────────────── */}
      <section className="relative border-t border-[var(--color-border)] bg-gradient-to-b from-[var(--color-ink)] via-[#0d0c0a] to-[var(--color-ink)] py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-xs uppercase tracking-[0.25em] text-[var(--color-amber)]">
              {marketingContent.agentPitch.eyebrow}
            </div>
            <h2 className="mt-4 text-balance font-display text-4xl leading-[1.05] text-[var(--color-bone)] md:text-6xl">
              {marketingContent.agentPitch.headline}
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--color-bone-muted)]">
              <BrandName text={marketingContent.agentPitch.body} />
            </p>
          </div>

          {/* Side-by-side: agent conversation + lineage filling in */}
          <div className="mt-16 grid gap-6 md:grid-cols-2">
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
                <h3 className="font-display text-xl text-[var(--color-bone)]">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-bone-muted)]">
                  {pillar.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────── TRIGGERS ─────────────────────────────── */}
      <section className="relative border-t border-[var(--color-border)] py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-[1600px] px-6">
          <SectionHeader
            eyebrow="Triggers"
            title={
              <>
                Four ways in. <span className="text-[var(--color-bone-muted)]">All unified.</span>
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
      <section className="relative border-t border-[var(--color-border)] bg-[#0c0b0a] py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-[1600px] px-6">
          <SectionHeader
            eyebrow={marketingContent.composition.eyebrow}
            title={marketingContent.composition.headline}
            body={marketingContent.composition.body}
          />
          <div className="mt-16 grid gap-6 md:grid-cols-2 md:items-center">
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
      <section className="relative border-t border-[var(--color-border)] py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="grid gap-8 md:gap-12 md:grid-cols-[1fr_1.2fr] md:items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-[var(--color-amber)]">
                {marketingContent.cli.eyebrow}
              </div>
              <h2 className="mt-4 text-balance font-display text-4xl leading-[1.05] text-[var(--color-bone)] md:text-5xl">
                {marketingContent.cli.headline}
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
      <section className="relative overflow-hidden border-t border-[var(--color-border)] bg-[#0c0b0a] py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-[1600px] px-6">
          <SectionHeader
            eyebrow={marketingContent.architecture.eyebrow}
            title={marketingContent.architecture.headline}
            body={marketingContent.architecture.body}
          />
          <div className="mt-20">
            <ArchitectureFlow stages={marketingContent.architecture.stages} />
          </div>
        </div>
      </section>

      {/* ───────────────────────────── CONNECTORS ─────────────────────────────── */}
      <section className="relative border-t border-[var(--color-border)] py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-[1600px] px-6">
          <SectionHeader
            eyebrow="Connectors"
            title={
              <>
                One-click OAuth.{" "}
                <span className="text-[var(--color-bone-muted)]">
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
      <section className="relative border-t border-[var(--color-border)] bg-[#0c0b0a] py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-[1600px] px-6 text-center">
          <SectionHeader
            eyebrow="Templates"
            title={<>Don't start from blank. Fork it.</>}
            body="A curated gallery of starting points with secrets and triggers pre-wired. One click, you're in your editor with working code."
            center
          />
        </div>
        <div className="mt-16">
          <TemplateMarquee templates={marketingContent.templates} />
        </div>
      </section>

      {/* ────────────────────────── FEATURE GRID ──────────────────────────────── */}
      <section className="relative border-t border-[var(--color-border)] py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-[1600px] px-6">
          <SectionHeader
            eyebrow="Capabilities"
            title={
              <>
                Everything you need.{" "}
                <span className="text-[var(--color-bone-muted)]">Nothing you don't.</span>
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
                  <Icon className="size-5 text-[var(--color-amber)]" strokeWidth={1.5} />
                  <h3 className="mt-5 font-display text-xl text-[var(--color-bone)]">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-bone-muted)]">
                    <BrandName text={feature.body} />
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ────────────────────────────── PRICING ───────────────────────────────── */}
      <section className="relative border-t border-[var(--color-border)] bg-[#0c0b0a] py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-[1600px] px-6">
          <SectionHeader
            eyebrow={marketingContent.pricing.eyebrow}
            title={
              <>
                {marketingContent.pricing.headline.split(".")[0]}.{" "}
                <span className="text-[var(--color-bone-muted)]">
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
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-bone-faint)]">
                      {plan.name}
                    </p>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="font-display text-4xl leading-none text-[var(--color-bone)]">
                        {plan.priceMonthly}
                      </span>
                      <span className="text-sm text-[var(--color-bone-muted)]">/month</span>
                    </div>
                  </div>
                  {plan.highlighted ? (
                    <span className="rounded-full border border-[var(--color-amber)]/40 bg-[var(--color-amber)]/15 px-2.5 py-1 text-[10px] uppercase tracking-wider text-[var(--color-amber)]">
                      Popular
                    </span>
                  ) : null}
                </div>

                <p className="mt-4 text-sm leading-relaxed text-[var(--color-bone-muted)]">
                  {plan.description}
                </p>

                <div className="mt-6 space-y-3">
                  {[plan.executionsPerDay, plan.workspaces, plan.teamMembers, plan.runtime].map(
                    (item) => (
                      <div
                        key={`${plan.slug}-${item}`}
                        className="flex items-center gap-2 text-sm text-[var(--color-bone)]"
                      >
                        <Check className="size-4 text-[var(--color-amber)]" />
                        <span>{item}</span>
                      </div>
                    ),
                  )}
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
      <section className="relative border-t border-[var(--color-border)] bg-[#0c0b0a] py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="grid gap-16 md:grid-cols-2 md:items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-[var(--color-amber)]">
                {marketingContent.community.eyebrow}
              </div>
              <h2 className="mt-4 text-balance font-display text-4xl leading-[1.05] text-[var(--color-bone)] md:text-5xl">
                {marketingContent.community.headline}
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
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
                      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56l-.01-1.98c-3.2.7-3.88-1.37-3.88-1.37-.52-1.34-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.15.08 1.76 1.2 1.76 1.2 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.72-1.53-2.56-.3-5.24-1.28-5.24-5.7 0-1.26.45-2.3 1.2-3.1-.12-.3-.52-1.5.11-3.12 0 0 .98-.32 3.2 1.19a10.9 10.9 0 0 1 5.82 0c2.22-1.5 3.2-1.19 3.2-1.19.63 1.62.23 2.82.11 3.12.75.8 1.2 1.84 1.2 3.1 0 4.43-2.69 5.4-5.26 5.69.41.36.78 1.08.78 2.18l-.01 3.23c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
                    </svg>
                    Star on GitHub
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="rounded-full text-[var(--color-bone-muted)] hover:bg-white/[0.04] hover:text-[var(--color-bone)]"
                >
                  <Link href="https://discord.gg/hostfunc">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
                      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.07.07 0 0 0-.073.035c-.211.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.249.072.072 0 0 0-.073-.035 19.736 19.736 0 0 0-3.76 1.169.067.067 0 0 0-.03.027C2.533 8.043 1.872 11.612 2.197 15.138a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.029.073.073 0 0 0 .079-.026c.461-.63.873-1.295 1.226-1.994a.07.07 0 0 0-.038-.097 13.1 13.1 0 0 1-1.872-.892.072.072 0 0 1-.007-.119c.126-.094.252-.192.372-.291a.07.07 0 0 1 .073-.01c3.928 1.793 8.18 1.793 12.061 0a.07.07 0 0 1 .074.009c.12.099.246.198.373.292a.072.072 0 0 1-.006.119 12.3 12.3 0 0 1-1.873.891.072.072 0 0 0-.038.098c.36.699.772 1.364 1.225 1.993a.071.071 0 0 0 .079.027 19.84 19.84 0 0 0 6.002-3.029.072.072 0 0 0 .031-.055c.389-4.077-.652-7.616-2.759-10.741a.057.057 0 0 0-.029-.028ZM8.02 12.99c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.957 2.419-2.157 2.419Zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419Z" />
                    </svg>
                    Join Discord
                  </Link>
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink)] p-8">
              <dl className="grid gap-6 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-widest text-[var(--color-bone-faint)]">
                    License
                  </dt>
                  <dd className="mt-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-mono text-sm font-medium text-emerald-200">
                      <ShieldCheck className="size-3.5" />
                      AGPL-3.0
                    </span>
                  </dd>
                </div>

                <div>
                  <dt className="text-xs uppercase tracking-widest text-[var(--color-bone-faint)]">
                    Status
                  </dt>
                  <dd className="mt-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/35 bg-amber-500/12 px-3 py-1.5 text-sm font-medium text-amber-200">
                      <span className="relative flex size-2">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
                      </span>
                      Alpha
                    </span>
                  </dd>
                </div>

                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-widest text-[var(--color-bone-faint)]">
                    Stack
                  </dt>
                  <dd className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#3178C6]/40 bg-[#3178C6]/12 px-3 py-1.5 text-sm font-medium text-[#7CB7F0]">
                      <TypeScriptMark className="size-4" />
                      TypeScript
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1.5 text-sm font-medium text-[var(--color-bone)]">
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
                        <path d="M11.572 0c-.176 0-.31.001-.358.007a19.76 19.76 0 0 1-.364.033C7.443.346 4.25 2.185 2.228 5.012a11.875 11.875 0 0 0-2.119 5.243c-.096.659-.108.854-.108 1.747s.012 1.089.108 1.748c.652 4.506 3.86 8.292 8.209 9.695.779.25 1.6.422 2.534.525.363.04 1.935.04 2.299 0 1.611-.178 2.977-.577 4.323-1.264.207-.106.247-.134.219-.158-.02-.013-.9-1.193-1.955-2.62l-1.919-2.592-2.404-3.558a338.739 338.739 0 0 0-2.422-3.556c-.009-.002-.018 1.579-.023 3.51-.007 3.38-.01 3.515-.052 3.595a.426.426 0 0 1-.206.214c-.075.037-.14.044-.495.044H7.81l-.108-.068a.438.438 0 0 1-.157-.171l-.05-.105.005-4.704.007-4.706.073-.092a.645.645 0 0 1 .174-.143c.096-.047.134-.051.54-.051.478 0 .558.018.682.154.035.038 1.337 1.999 2.895 4.361a10760.433 10760.433 0 0 0 4.735 7.17l1.9 2.879.096-.063a12.317 12.317 0 0 0 2.466-2.163 11.944 11.944 0 0 0 2.824-6.134c.096-.66.108-.854.108-1.748 0-.893-.012-1.088-.108-1.747-.652-4.506-3.859-8.292-8.208-9.695a12.597 12.597 0 0 0-2.499-.523A33.119 33.119 0 0 0 11.573 0zm4.069 7.217c.347 0 .408.005.486.047a.473.473 0 0 1 .237.277c.018.06.023 1.365.018 4.304l-.006 4.218-.744-1.14-.746-1.14v-3.066c0-1.982.01-3.097.023-3.15a.478.478 0 0 1 .233-.296c.096-.05.13-.054.5-.054z" />
                      </svg>
                      Next.js 16
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#F38020]/40 bg-[#F38020]/12 px-3 py-1.5 text-sm font-medium text-[#F4B47A]">
                      <CloudflareMark className="size-4" />
                      Cloudflare
                    </span>
                  </dd>
                </div>

                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-widest text-[var(--color-bone-faint)]">
                    Self-host
                  </dt>
                  <dd className="mt-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-sm font-medium text-sky-200">
                      <Server className="size-3.5" />
                      Docker Compose
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────── CLOSER ──────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-[var(--color-border)] py-20 sm:py-28 lg:py-32">
        <div className="gradient-radial-amber pointer-events-none absolute inset-x-0 bottom-0 top-0" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-balance font-display text-5xl leading-[1.02] text-[var(--color-bone)] md:text-7xl">
            {marketingContent.closer.headline}
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
      <SiteFooter />
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
      <div className="text-xs uppercase tracking-[0.25em] text-[var(--color-amber)]">{eyebrow}</div>
      <h2 className="mt-4 text-balance font-display text-4xl leading-[1.05] text-[var(--color-bone)] md:text-5xl">
        {title}
      </h2>
      <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--color-bone-muted)]">
        {body}
      </p>
    </div>
  );
}
