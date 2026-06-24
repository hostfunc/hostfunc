import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { getUseCase, useCases } from "@/lib/use-cases";
import { ArrowRight, Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamicParams = false;

export function generateStaticParams(): Array<{ slug: string }> {
  return useCases.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const useCase = getUseCase(slug);
  if (!useCase) {
    return pageMetadata({
      title: "Use case not found",
      description: "This use case could not be found.",
      path: `/use-cases/${slug}`,
      noindex: true,
    });
  }
  return pageMetadata({
    title: useCase.title,
    description: useCase.metaDescription,
    path: `/use-cases/${useCase.slug}`,
  });
}

export default async function UseCasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const useCase = getUseCase(slug);
  if (!useCase) notFound();

  return (
    <MarketingPageShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Use cases", path: "/use-cases" },
          { name: useCase.name, path: `/use-cases/${useCase.slug}` },
        ])}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--color-border)]">
        <div className="gradient-radial-amber pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px]" />
        <div className="mx-auto max-w-4xl px-6 py-20 sm:py-24">
          <span className="rounded-full border border-[var(--color-border)] bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-wider text-[var(--color-bone-muted)]">
            {useCase.trigger} trigger
          </span>
          <h1 className="mt-5 text-balance font-display text-5xl leading-[1.05] text-[var(--color-bone)] md:text-6xl">
            {useCase.headline}
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--color-bone-muted)]">
            {useCase.intro}
          </p>
        </div>
      </section>

      {/* Problem + solution */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl text-[var(--color-bone)]">The problem</h2>
            <p className="mt-4 text-pretty leading-relaxed text-[var(--color-bone-muted)]">
              {useCase.problem}
            </p>
          </div>
          <div>
            <h2 className="font-display text-2xl text-[var(--color-bone)]">
              How hostfunc solves it
            </h2>
            <ul className="mt-4 space-y-3">
              {useCase.solution.map((point) => (
                <li
                  key={point}
                  className="flex gap-3 text-sm leading-relaxed text-[var(--color-bone-muted)]"
                >
                  <Check className="mt-0.5 size-4 shrink-0 text-[var(--color-amber)]" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Code */}
      <section className="mx-auto max-w-4xl px-6 pb-16">
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-[var(--color-border-strong)]" />
            <span className="ml-2 font-mono text-xs text-[var(--color-bone-muted)]">
              {useCase.codeFilename}
            </span>
          </div>
          <pre className="overflow-x-auto px-5 py-4 font-mono text-sm leading-relaxed text-[var(--color-bone)]">
            <code>{useCase.code}</code>
          </pre>
        </div>
      </section>

      {/* Related docs + CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-bone-faint)]">
          Related documentation
        </h2>
        <div className="mt-5 flex flex-wrap gap-3">
          {useCase.relatedDocs.map((doc) => (
            <Link
              key={doc.href}
              href={doc.href}
              className="rounded-full border border-[var(--color-border)] bg-white/[0.02] px-4 py-2 text-sm text-[var(--color-bone-muted)] transition-colors hover:border-[var(--color-amber)]/35 hover:text-[var(--color-bone)]"
            >
              {doc.label}
            </Link>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-[var(--color-amber)]/30 bg-[var(--color-amber)]/[0.04] p-8 text-center">
          <h2 className="font-display text-2xl text-[var(--color-bone)] md:text-3xl">
            Build this in minutes
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-pretty leading-relaxed text-[var(--color-bone-muted)]">
            Sign in, fork a template, and deploy. See more{" "}
            <Link href="/use-cases" className="text-[var(--color-amber)] hover:underline">
              use cases
            </Link>{" "}
            or{" "}
            <Link href="/pricing" className="text-[var(--color-amber)] hover:underline">
              pricing
            </Link>
            .
          </p>
          <div className="mt-7 flex justify-center">
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
        </div>
      </section>
    </MarketingPageShell>
  );
}
