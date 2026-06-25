import { docsSections, getDocsPage } from "@/lib/docs-content";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

function renderInlineCode(text: string) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={`inline-code-${idx}-${part}`}
          className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[0.92em] text-[var(--color-bone)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={`inline-text-${idx}-${part}`}>{part}</span>;
  });
}

export function DocsLanding() {
  const content = getDocsPage("/");
  const areaCards = docsSections
    .flatMap((section) => section.links)
    .filter((link) => link.href !== "/")
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
        <p className="max-w-2xl text-xl leading-relaxed text-[var(--color-bone-muted)]">
          {renderInlineCode(content.summary)}
        </p>
      </div>

      <div className="my-12 h-px w-full bg-gradient-to-r from-[var(--color-border)] via-[var(--color-border)]/50 to-transparent" />

      {/* Highlights Section */}
      <div className="space-y-8">
        <section>
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-[var(--color-bone)]">
            Read By Area
          </h2>
          <p className="mb-6 max-w-2xl text-sm leading-relaxed text-[var(--color-bone-muted)]">
            Start with Getting Started, then move through platform behavior, operations, and SDK
            modules.
          </p>
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
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-bone-muted)]">
                  {renderInlineCode(card.summary)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Footer Navigation */}
      <div className="mt-20 flex justify-end border-t border-[var(--color-border)] pt-8">
        <Link
          href={content.related[0]?.href ?? "/getting-started"}
          className="group inline-flex h-14 items-center rounded-full bg-[var(--color-amber)] px-8 text-base font-bold text-[var(--color-ink)] transition-all hover:bg-[var(--color-amber-hover)]"
        >
          Next: {content.related[0]?.label ?? "Getting Started"}
          <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
