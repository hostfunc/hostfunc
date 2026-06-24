import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { pageMetadata } from "@/lib/seo";
import { useCases } from "@/lib/use-cases";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = pageMetadata({
  title: "Use cases",
  description:
    "What people build with hostfunc: webhook handlers, scheduled cron jobs, AI agent tools, Slack bots, scrapers, and custom API endpoints — all in TypeScript.",
  path: "/use-cases",
});

export default function UseCasesIndexPage() {
  return (
    <MarketingPageShell>
      <section className="relative overflow-hidden border-b border-[var(--color-border)]">
        <div className="gradient-radial-amber pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px]" />
        <div className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-amber)]">
            Use cases
          </p>
          <h1 className="mt-4 text-balance font-display text-5xl leading-[1.05] text-[var(--color-bone)] md:text-6xl">
            What you can build with hostfunc
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--color-bone-muted)]">
            One exported main() is enough for most automations. Here are the patterns people reach
            for most — each with real code you can fork.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-4 sm:grid-cols-2">
          {useCases.map((useCase) => (
            <Link
              key={useCase.slug}
              href={`/use-cases/${useCase.slug}`}
              className="group flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/65 p-6 transition-all hover:-translate-y-0.5 hover:border-[var(--color-amber)]/35 hover:bg-white/[0.04]"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-[var(--color-border)] bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-wider text-[var(--color-bone-muted)]">
                  {useCase.trigger}
                </span>
                <ArrowRight className="size-5 text-[var(--color-bone-faint)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--color-amber)]" />
              </div>
              <h2 className="mt-4 font-display text-xl text-[var(--color-bone)]">{useCase.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-bone-muted)]">
                {useCase.summary}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </MarketingPageShell>
  );
}
