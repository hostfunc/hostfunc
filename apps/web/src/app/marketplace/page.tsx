import { CodePreview } from "@/components/marketing/code-preview";
import { CommunityFunctionCard } from "@/components/marketplace/community-function-card";
import { MarketplaceFilters } from "@/components/marketplace/marketplace-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { assertMarketingContent, marketingContent } from "@/lib/marketing-content";
import { getOptionalSession } from "@/lib/session";
import {
  MARKETPLACE_CATEGORIES,
  type MarketplaceSort,
  searchMarketplaceFunctions,
} from "@/server/functions";
import { ArrowRight, Boxes, Hexagon, Sparkles } from "lucide-react";
import Link from "next/link";

const MARKETPLACE_SORTS: MarketplaceSort[] = ["featured", "trending", "recent", "stars", "forks"];

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const session = await getOptionalSession();
  assertMarketingContent();
  const primaryHref = session ? "/dashboard/new" : "/login";
  const q = typeof params.q === "string" ? params.q : "";
  const category = oneOf(
    typeof params.category === "string" ? params.category : undefined,
    MARKETPLACE_CATEGORIES,
  );
  const sort = oneOf(typeof params.sort === "string" ? params.sort : undefined, MARKETPLACE_SORTS);
  const marketplace = await searchMarketplaceFunctions({
    ...(q ? { query: q } : {}),
    ...(category ? { category } : {}),
    sort: sort ?? "featured",
    limit: 12,
    ...(session?.user.id ? { userId: session.user.id } : {}),
  });
  const featuredTemplates = marketingContent.templates.slice(0, 4);

  return (
    <main className="relative min-h-screen bg-[var(--color-ink)] text-[var(--color-bone)]">
      <div className="gradient-radial-amber pointer-events-none absolute inset-x-0 top-0 h-[560px]" />
      <div className="border-grid pointer-events-none absolute inset-0 opacity-35" />

      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-ink)]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Hexagon className="size-5 text-[var(--color-amber)]" strokeWidth={1.5} />
            <span className="font-display text-xl text-[var(--color-bone)]">hostfunc</span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {marketingContent.navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-[var(--color-bone-muted)] transition-colors hover:text-[var(--color-bone)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {session ? (
              <Button
                asChild
                size="sm"
                className="rounded-full bg-[var(--color-bone)] px-5 font-medium text-[var(--color-ink)] hover:bg-white"
              >
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden text-sm text-[var(--color-bone-muted)] transition-colors hover:text-[var(--color-bone)] sm:inline"
                >
                  Sign in
                </Link>
                <Button
                  asChild
                  size="sm"
                  className="rounded-full bg-[var(--color-amber)] px-5 font-medium text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
                >
                  <Link href="/login">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="relative border-b border-[var(--color-border)] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-4xl text-center">
            <div className="text-xs uppercase tracking-[0.24em] text-[var(--color-amber)]">
              Public Function Marketplace
            </div>
            <h1 className="mt-6 text-balance font-display text-5xl leading-[1.03] tracking-tight md:text-7xl">
              <span className="text-[var(--color-bone)]">Find proven functions.</span>{" "}
              <span className="italic text-[var(--color-amber)]">Fork in one click.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--color-bone-muted)]">
              Browse public TypeScript functions, official templates, automations, AI workflows,
              webhooks, and integrations. Star what you love, comment with improvements, and fork
              any function into your workspace.
            </p>
            <div className="mt-10">
              <MarketplaceFilters
                basePath="/marketplace"
                q={q}
                category={category}
                sort={sort ?? "featured"}
                showSearch
                showCategories
                variant="hero"
              />
            </div>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="h-12 rounded-full px-7 text-base font-medium text-[var(--color-bone-muted)] hover:bg-white/[0.04] hover:text-[var(--color-bone)]"
              >
                <Link href="/docs/getting-started">Read implementation guide</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-20">
        <div className="mx-auto max-w-7xl space-y-20 px-6">
          <section className="space-y-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[var(--color-amber)]">
                  <Sparkles className="size-3.5" />
                  Official Templates
                </div>
                <h2 className="mt-3 font-display text-4xl tracking-tight text-[var(--color-bone)]">
                  Curated starting points
                </h2>
              </div>
              <Button
                asChild
                variant="ghost"
                className="rounded-full text-[var(--color-bone-muted)] hover:bg-white/[0.04] hover:text-[var(--color-bone)]"
              >
                <Link href={primaryHref}>
                  Open guided creator
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-6 lg:grid-cols-4">
              {featuredTemplates.map((template) => (
                <article
                  key={template.templateId}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-5 transition-all hover:border-[var(--color-amber)]/35 hover:bg-white/[0.04]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-2xl">{template.icon}</span>
                    <Badge className="border-[var(--color-border)] bg-white/[0.04] text-[var(--color-bone-faint)]">
                      Official
                    </Badge>
                  </div>
                  <h3 className="mt-4 font-display text-2xl text-[var(--color-bone)]">
                    {template.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-bone-muted)]">
                    {template.description}
                  </p>
                  <CodePreview code={template.snippet} compact className="mt-4" />
                  <Button
                    asChild
                    size="sm"
                    className="mt-4 w-full rounded-full bg-[var(--color-amber)] text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
                  >
                    <Link
                      href={session ? `/dashboard/new?template=${template.templateId}` : "/login"}
                    >
                      Use template
                    </Link>
                  </Button>
                </article>
              ))}
            </div>
          </section>

          <section className="space-y-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[var(--color-amber)]">
                  <Boxes className="size-3.5" />
                  Community Functions
                </div>
                <h2 className="mt-3 font-display text-4xl tracking-tight text-[var(--color-bone)]">
                  Public functions ready to fork
                </h2>
              </div>
              <MarketplaceFilters
                basePath="/marketplace"
                q={q}
                category={category}
                sort={sort ?? "featured"}
                showSearch={false}
                showCategories={false}
                showSort
                variant="compact"
              />
            </div>

            {marketplace.items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-ink-elevated)]/45 p-12 text-center">
                <p className="font-display text-3xl text-[var(--color-bone)]">
                  No public functions yet.
                </p>
                <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--color-bone-muted)]">
                  Public functions will appear here as the community publishes them. Start with an
                  official template and make the first listing.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {marketplace.items.map((fn) => (
                  <CommunityFunctionCard
                    key={fn.id}
                    fn={fn}
                    basePath="/marketplace"
                    signedIn={Boolean(session)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      <section className="relative border-t border-[var(--color-border)] py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-balance font-display text-4xl leading-[1.06] md:text-6xl">
            Build from proven foundations.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--color-bone-muted)]">
            Public functions are open for discovery by default. Upgrade when you need private
            workspace-only functions for internal tools, customer workflows, or team secrets.
          </p>
          <div className="mt-10">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-[var(--color-amber)] px-8 text-base font-medium text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
            >
              <Link href={primaryHref}>
                Continue to create function
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
