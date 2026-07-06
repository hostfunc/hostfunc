import { TemplatePreview } from "@/components/marketplace/template-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FUNCTION_TEMPLATES } from "@/lib/templates";
import { cn } from "@/lib/utils";
import { ArrowRight, Clock, Globe, KeyRound, Sparkles } from "lucide-react";
import Link from "next/link";

/**
 * Marketplace section that showcases the official, deploy-ready function
 * templates. Reused by the public marketplace and the dashboard marketplace.
 */
export function FeaturedTemplates({ signedIn }: { signedIn: boolean }) {
  const creatorHref = signedIn ? "/dashboard/new" : "/login";

  return (
    <section className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[var(--color-amber)]">
            <Sparkles className="size-3.5" />
            Featured Templates
          </div>
          <h2 className="mt-3 font-display text-4xl tracking-tight text-[var(--color-bone)]">
            Curated starting points
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-bone-muted)]">
            {FUNCTION_TEMPLATES.length} official, deploy-ready templates — AI workflows, webhooks,
            scheduled automations, and integrations — each built on the hostfunc SDK.
          </p>
        </div>
        <Button
          asChild
          variant="ghost"
          className="rounded-full text-[var(--color-bone-muted)] hover:bg-white/[0.04] hover:text-[var(--color-bone)]"
        >
          <Link href={creatorHref}>
            Open guided creator
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {FUNCTION_TEMPLATES.map((template) => {
          const previewHtml = template.assets?.find(
            (asset) => asset.path === "index.html",
          )?.content;
          return (
            <article
              key={template.id}
              className="flex h-full flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-5 transition-all hover:border-[var(--color-amber)]/35 hover:bg-white/[0.04]"
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={cn(
                    "inline-flex h-11 w-11 items-center justify-center rounded-xl border text-xl",
                    template.accentClass,
                  )}
                >
                  {template.icon}
                </span>
                <Badge className="border-[var(--color-border)] bg-white/[0.04] capitalize text-[var(--color-bone-faint)]">
                  {template.category}
                </Badge>
              </div>
              <h3 className="mt-3 font-display text-xl text-[var(--color-bone)]">
                {template.name}
              </h3>
              <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-[var(--color-bone-muted)]">
                {template.description}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--color-bone-faint)]">
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-white/[0.03] px-1.5 py-0.5 font-mono uppercase tracking-wide">
                  {template.trigger.kind === "cron" ? (
                    <Clock className="h-2.5 w-2.5" />
                  ) : (
                    <Globe className="h-2.5 w-2.5" />
                  )}
                  {template.trigger.kind}
                </span>
                {template.requiredSecrets.length > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-amber-300">
                    <KeyRound className="h-2.5 w-2.5" />
                    {template.requiredSecrets.length} secret
                    {template.requiredSecrets.length > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-300">
                    No secrets
                  </span>
                )}
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <Button
                  asChild
                  size="sm"
                  className="w-full rounded-full bg-[var(--color-amber)] text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
                >
                  <Link href={signedIn ? `/dashboard/new?template=${template.id}` : "/login"}>
                    Use template
                  </Link>
                </Button>
                {previewHtml ? (
                  <TemplatePreview templateName={template.name} html={previewHtml} />
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
