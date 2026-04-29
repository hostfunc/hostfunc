"use client";

import { CodePreview } from "@/components/marketing/code-preview";
import { Button } from "@/components/ui/button";
import type { MarketingContent } from "@/lib/marketing-content";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

interface TemplatesShowcaseProps {
  templates: MarketingContent["templates"];
  primaryCreateHref: string;
}

function toTitleCase(value: string): string {
  return value
    .split("-")
    .map((segment) => segment.slice(0, 1).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function TemplatesShowcase({ templates, primaryCreateHref }: TemplatesShowcaseProps) {
  const featured = templates.slice(0, 3);
  const categories = [...new Set(templates.map((template) => template.category))];

  return (
    <div className="space-y-20">
      <section className="space-y-8">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[var(--color-amber)]">
          <Sparkles className="size-3.5" />
          Featured Templates
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {featured.map((template) => (
            <article
              key={`featured-${template.name}`}
              className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/75 p-7 transition-all hover:border-[var(--color-amber)]/35 hover:bg-white/[0.04]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-3xl">{template.icon}</span>
                <span className="rounded-full border border-[var(--color-border)] bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-widest text-[var(--color-bone-faint)]">
                  {toTitleCase(template.category)}
                </span>
              </div>
              <h3 className="mt-5 font-display text-3xl text-[var(--color-bone)]">
                {template.name}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-bone-muted)]">
                {template.description}
              </p>
              <CodePreview code={template.snippet} className="mt-5" />
              <div className="mt-5 flex justify-end">
                <Button
                  asChild
                  size="sm"
                  className="rounded-full bg-[var(--color-amber)] text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
                >
                  <Link href={buildTemplateHref(primaryCreateHref, template.templateId)}>
                    Use template
                    <ArrowRight className="ml-1 size-3.5" />
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <h2 className="font-display text-4xl tracking-tight text-[var(--color-bone)]">
          Full Template Catalog
        </h2>
        <div className="space-y-10">
          {categories.map((category) => (
            <div key={category} className="space-y-4">
              <h3 className="text-xs uppercase tracking-[0.22em] text-[var(--color-bone-faint)]">
                {toTitleCase(category)}
              </h3>
              <div className="grid gap-5 sm:grid-cols-1 lg:grid-cols-2">
                {templates
                  .filter((template) => template.category === category)
                  .map((template) => (
                    <article
                      key={`${category}-${template.name}`}
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/60 p-6 transition-colors hover:bg-white/[0.03]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{template.icon}</span>
                        <p className="font-medium text-[var(--color-bone)]">{template.name}</p>
                      </div>
                      <p className="mt-2 text-sm text-[var(--color-bone-muted)]">
                        {template.description}
                      </p>
                      <div className="mt-4">
                        <CodePreview code={template.snippet} compact />
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button
                          asChild
                          size="sm"
                          className="rounded-full bg-[var(--color-amber)] text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
                        >
                          <Link href={buildTemplateHref(primaryCreateHref, template.templateId)}>
                            Use template
                            <ArrowRight className="ml-1 size-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </article>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function buildTemplateHref(baseHref: string, templateId: string): string {
  if (baseHref !== "/dashboard/new") return baseHref;
  return `/dashboard/new?template=${encodeURIComponent(templateId)}`;
}
