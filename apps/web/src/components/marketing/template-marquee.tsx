"use client";

import { CodePreview } from "@/components/marketing/code-preview";
import { Button } from "@/components/ui/button";
import type { MarketingContent } from "@/lib/marketing-content";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface Props {
  templates: MarketingContent["templates"];
}

export function TemplateMarquee({ templates }: Props) {
  const highlighted = templates.slice(0, 4);

  return (
    <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2">
      {highlighted.map((template) => (
        <article
          key={template.templateId}
          className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/75 p-7 transition-all hover:border-[var(--color-amber)]/35 hover:bg-white/[0.04]"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="text-3xl">{template.icon}</span>
            <span className="rounded-full border border-[var(--color-border)] bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-widest text-[var(--color-bone-faint)]">
              {toTitleCase(template.category)}
            </span>
          </div>
          <h3 className="mt-5 font-display text-3xl text-[var(--color-bone)]">{template.name}</h3>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-bone-muted)]">
            {template.description}
          </p>
          <CodePreview code={template.snippet} className="mt-4" />
          <div className="mt-5 flex justify-end">
            <Button
              asChild
              size="sm"
              className="rounded-full bg-[var(--color-amber)] text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
            >
              <Link href={buildTemplateHref(template.templateId)}>
                Use template
                <ArrowRight className="ml-1 size-3.5" />
              </Link>
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

function buildTemplateHref(templateId: string): string {
  return `/dashboard/new?template=${encodeURIComponent(templateId)}`;
}

function toTitleCase(value: string): string {
  return value
    .split("-")
    .map((segment) => segment.slice(0, 1).toUpperCase() + segment.slice(1))
    .join(" ");
}
