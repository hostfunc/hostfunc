import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { comparisons, getComparison } from "@/lib/comparisons";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { ArrowRight, Check, Minus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamicParams = false;

export function generateStaticParams(): Array<{ competitor: string }> {
  return comparisons.map((c) => ({ competitor: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ competitor: string }>;
}): Promise<Metadata> {
  const { competitor } = await params;
  const comparison = getComparison(competitor);
  if (!comparison) {
    return pageMetadata({
      title: "Comparison not found",
      description: "This comparison could not be found.",
      path: `/compare/${competitor}`,
      noindex: true,
    });
  }
  return pageMetadata({
    title: comparison.title,
    description: comparison.metaDescription,
    path: `/compare/${comparison.slug}`,
  });
}

export default async function ComparisonPage({
  params,
}: {
  params: Promise<{ competitor: string }>;
}) {
  const { competitor } = await params;
  const comparison = getComparison(competitor);
  if (!comparison) notFound();

  return (
    <MarketingPageShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Compare", path: "/compare" },
          { name: comparison.competitor, path: `/compare/${comparison.slug}` },
        ])}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--color-border)]">
        <div className="gradient-radial-amber pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px]" />
        <div className="mx-auto max-w-4xl px-6 py-20 sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-amber)]">
            Compare
          </p>
          <h1 className="mt-4 text-balance font-display text-5xl leading-[1.05] text-[var(--color-bone)] md:text-6xl">
            {comparison.headline}
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--color-bone-muted)]">
            {comparison.intro}
          </p>
        </div>
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-[var(--color-bone)]">
              <tr>
                <th className="px-5 py-4 font-medium">Capability</th>
                <th className="px-5 py-4 font-medium text-[var(--color-amber)]">hostfunc</th>
                <th className="px-5 py-4 font-medium">{comparison.competitor}</th>
              </tr>
            </thead>
            <tbody>
              {comparison.rows.map((row) => (
                <tr key={row.capability} className="border-t border-[var(--color-border)]">
                  <td className="px-5 py-4 font-medium text-[var(--color-bone)]">
                    {row.capability}
                  </td>
                  <td className="px-5 py-4 text-[var(--color-bone-muted)]">{row.hostfunc}</td>
                  <td className="px-5 py-4 text-[var(--color-bone-muted)]">{row.competitor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* When to pick which */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--color-amber)]/30 bg-[var(--color-amber)]/[0.04] p-7">
            <h2 className="font-display text-xl text-[var(--color-bone)]">Choose hostfunc when</h2>
            <ul className="mt-5 space-y-3">
              {comparison.whenToPickHostfunc.map((reason) => (
                <li
                  key={reason}
                  className="flex gap-3 text-sm leading-relaxed text-[var(--color-bone-muted)]"
                >
                  <Check className="mt-0.5 size-4 shrink-0 text-[var(--color-amber)]" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-7">
            <h2 className="font-display text-xl text-[var(--color-bone)]">
              Choose {comparison.competitor} when
            </h2>
            <ul className="mt-5 space-y-3">
              {comparison.whenToPickThem.map((reason) => (
                <li
                  key={reason}
                  className="flex gap-3 text-sm leading-relaxed text-[var(--color-bone-muted)]"
                >
                  <Minus className="mt-0.5 size-4 shrink-0 text-[var(--color-bone-faint)]" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
        <h2 className="font-display text-3xl text-[var(--color-bone)] md:text-4xl">
          Ship your first function in 90 seconds
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty leading-relaxed text-[var(--color-bone-muted)]">
          Sign in, drop in some TypeScript, hit deploy. See the{" "}
          <Link href="/pricing" className="text-[var(--color-amber)] hover:underline">
            pricing
          </Link>{" "}
          or browse{" "}
          <Link href="/use-cases" className="text-[var(--color-amber)] hover:underline">
            use cases
          </Link>
          .
        </p>
        <div className="mt-8 flex justify-center">
          <Button
            asChild
            size="lg"
            className="h-12 rounded-full bg-[var(--color-amber)] px-7 text-base font-medium text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
          >
            <Link href="/login">
              Start building
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </MarketingPageShell>
  );
}
