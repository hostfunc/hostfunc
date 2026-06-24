import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { marketingContent } from "@/lib/marketing-content";
import { type FaqItem, faqPageJsonLd, pageMetadata } from "@/lib/seo";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

export const metadata = pageMetadata({
  title: "Pricing",
  description:
    "Simple, predictable pricing for deploying serverless TypeScript functions. Start free with 100 executions/day, scale to Pro and Team. Self-hosting is always free under AGPL-3.0.",
  path: "/pricing",
});

const pricingFaqs: FaqItem[] = [
  {
    question: "Is there a free plan?",
    answer:
      "Yes. The Free plan includes one workspace, 100 executions per day, and the full runtime, editor, CLI, and MCP server. No credit card required. It's built for personal projects and trying hostfunc out.",
  },
  {
    question: "How are executions counted?",
    answer:
      "An execution is a single invocation of one of your functions — via HTTP, cron, email, MCP, or a fn.executeFunction call from another function. Each invocation in a composition counts as its own execution. Limits reset daily.",
  },
  {
    question: "What happens if I hit my daily execution limit?",
    answer:
      "Requests beyond your plan's daily ceiling are rejected with a clear rate-limit response until the counter resets. We never silently bill you for overages — you upgrade deliberately when you need more headroom.",
  },
  {
    question: "Can I self-host hostfunc instead of paying?",
    answer:
      "Yes. hostfunc is open source under AGPL-3.0. You can git clone and docker compose up on your own Cloudflare account at no cost. The hosted plans exist so you don't have to operate the infrastructure yourself.",
  },
  {
    question: "What does AGPL-3.0 mean for me?",
    answer:
      "If you run hostfunc for yourself or your team, AGPL asks nothing of you. If you run a modified, hosted version that competes with hostfunc, AGPL asks you to publish your changes. Using the platform to build and deploy your own functions never triggers any obligation.",
  },
  {
    question: "What are the runtime limits per plan?",
    answer:
      "Free allows 10s wall time, 1s CPU, and 128MB memory per execution. Pro raises that to 120s wall, 20s CPU, and 512MB. Team goes to 600s wall, 120s CPU, and 2048MB — enough for heavier data and AI workloads.",
  },
  {
    question: "Can I add team members?",
    answer:
      "Free is single-seat. Pro includes up to 6 team members across up to 3 workspaces. Team includes up to 50 members across unlimited workspaces, with org-scoped secrets and connectors shared across everyone.",
  },
  {
    question: "Can I change or cancel my plan anytime?",
    answer:
      "Yes. Upgrade, downgrade, or cancel from your billing settings at any time. There are no annual lock-ins — plans are billed monthly.",
  },
];

export default function PricingPage() {
  const { pricing } = marketingContent;

  return (
    <MarketingPageShell>
      <JsonLd data={faqPageJsonLd(pricingFaqs)} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--color-border)]">
        <div className="gradient-radial-amber pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px]" />
        <div className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-amber)]">
            {pricing.eyebrow}
          </p>
          <h1 className="mt-4 text-balance font-display text-5xl leading-[1.05] text-[var(--color-bone)] md:text-6xl">
            {pricing.headline}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--color-bone-muted)]">
            {pricing.body} Or self-host the whole platform for free under AGPL-3.0.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="mx-auto max-w-[1600px] px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-3">
          {pricing.plans.map((plan) => (
            <div
              key={plan.slug}
              className={`group rounded-2xl border bg-[var(--color-ink-elevated)]/75 p-7 transition-all duration-300 hover:-translate-y-0.5 ${
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
                      <Check className="size-4 shrink-0 text-[var(--color-amber)]" />
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
                <Link href="/login">
                  Get started
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-[var(--color-bone-muted)]">
          Every plan includes the web editor, VS Code extension, CLI, MCP server, encrypted secrets,
          custom domains, and live log streaming. See the{" "}
          <Link href="/docs" className="text-[var(--color-amber)] hover:underline">
            docs
          </Link>{" "}
          or compare hostfunc to{" "}
          <Link href="/compare" className="text-[var(--color-amber)] hover:underline">
            other platforms
          </Link>
          .
        </p>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        <h2 className="text-center font-display text-3xl text-[var(--color-bone)] md:text-4xl">
          Pricing FAQ
        </h2>
        <dl className="mt-12 space-y-8">
          {pricingFaqs.map((faq) => (
            <div key={faq.question} className="border-b border-[var(--color-border)] pb-8">
              <dt className="font-display text-lg text-[var(--color-bone)]">{faq.question}</dt>
              <dd className="mt-3 text-pretty leading-relaxed text-[var(--color-bone-muted)]">
                {faq.answer}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </MarketingPageShell>
  );
}
