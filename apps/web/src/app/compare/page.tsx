import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { comparisons } from "@/lib/comparisons";
import { pageMetadata } from "@/lib/seo";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = pageMetadata({
  title: "Compare hostfunc",
  description:
    "How hostfunc compares to Val Town, Deno Deploy, Vercel Functions, AWS Lambda, and Cloudflare Workers — honest, side-by-side feature breakdowns.",
  path: "/compare",
});

export default function CompareIndexPage() {
  return (
    <MarketingPageShell>
      <section className="relative overflow-hidden border-b border-[var(--color-border)]">
        <div className="gradient-radial-amber pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px]" />
        <div className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-amber)]">
            Compare
          </p>
          <h1 className="mt-4 text-balance font-display text-5xl leading-[1.05] text-[var(--color-bone)] md:text-6xl">
            How hostfunc compares
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--color-bone-muted)]">
            An honest look at how hostfunc stacks up against other ways to deploy TypeScript
            functions — what each does well, and when to pick which.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-4 sm:grid-cols-2">
          {comparisons.map((comparison) => (
            <Link
              key={comparison.slug}
              href={`/compare/${comparison.slug}`}
              className="group flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/65 p-6 transition-all hover:-translate-y-0.5 hover:border-[var(--color-amber)]/35 hover:bg-white/[0.04]"
            >
              <div>
                <h2 className="font-display text-xl text-[var(--color-bone)]">
                  hostfunc vs {comparison.competitor}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-bone-muted)]">
                  {comparison.metaDescription}
                </p>
              </div>
              <ArrowRight className="ml-4 size-5 shrink-0 text-[var(--color-bone-faint)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--color-amber)]" />
            </Link>
          ))}
        </div>
      </section>
    </MarketingPageShell>
  );
}
