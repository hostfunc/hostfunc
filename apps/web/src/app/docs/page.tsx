import { Button } from "@/components/ui/button";
import { docsSections, getDocsPage } from "@/lib/docs-content";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Documentation | hostfunc",
  description: "Learn how to build, deploy, and manage serverless functions.",
};

export default function DocsPage({ params }: { params: { slug?: string[] } }) {
  const path = params.slug ? `/docs/${params.slug.join("/")}` : "/docs";
  const content = getDocsPage(path);
  const areaCards = docsSections
    .flatMap((section) => section.links)
    .filter((link) => link.href !== "/docs")
    .map((link) => {
      const page = getDocsPage(link.href);
      return {
        title: link.name,
        href: link.href,
        summary: page.summary,
      };
    });

  return (
    <div className="animate-in fade-in duration-500 pb-24">
      {/* Header Section */}
      <div className="mb-16">
        <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--color-amber)]">
          <span className="flex h-2 w-2 animate-pulse rounded-full bg-[var(--color-amber)]" />
          Documentation
        </p>
        <h1 className="mb-6 font-display text-5xl leading-tight tracking-tight text-[var(--color-bone)] sm:text-6xl">
          {content.title}
        </h1>
        <p className="max-w-2xl text-xl leading-relaxed text-[var(--color-bone-muted)]">{content.summary}</p>
      </div>

      <div className="my-12 h-px w-full bg-gradient-to-r from-[var(--color-border)] via-[var(--color-border)]/50 to-transparent" />

      {/* Highlights Section */}
      <div className="space-y-8">
        <section>
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-[var(--color-bone)]">
            Explore the Platform
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {areaCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-5 transition-all hover:border-[var(--color-amber)]/35 hover:bg-white/[0.04]"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-[var(--color-bone)] transition-colors group-hover:text-[var(--color-amber)]">
                    {card.title}
                  </h3>
                  <ChevronRight className="h-4 w-4 text-[var(--color-bone-faint)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--color-amber)]" />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-bone-muted)]">{card.summary}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* <section>
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-[var(--color-bone)]">Key capabilities</h2>
          <div className="grid gap-4">
            {content.highlights.map((item) => (
              <div
                key={item}
                className="flex items-start gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/65 p-5 transition-colors hover:bg-white/[0.04]"
              >
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-amber)] shadow-[0_0_8px_rgba(255,197,107,0.5)]" />
                <p className="font-medium leading-relaxed text-[var(--color-bone-muted)]">{item}</p>
              </div>
            ))}
          </div>
        </section> */}
      </div>

      {/* Footer Navigation */}
      <div className="mt-20 flex justify-end border-t border-[var(--color-border)] pt-8">
        <Button
          asChild
          className="group h-14 rounded-full bg-[var(--color-amber)] px-8 text-base font-bold text-[var(--color-ink)] transition-all hover:bg-[var(--color-amber-hover)]"
        >
          <Link href={content.related[0]?.href ?? "/docs/getting-started"}>
            Next: {content.related[0]?.label ?? "Getting Started"}
            <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
