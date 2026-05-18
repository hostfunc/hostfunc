import { CodePreview } from "@/components/marketing/code-preview";
import { FunctionActions } from "@/components/marketplace/function-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { renderMarketplaceReadme } from "@/lib/marketplace-readme";
import { getOptionalSession } from "@/lib/session";
import { getMarketplaceFunction, listFunctionComments } from "@/server/functions";
import { ArrowLeft, GitFork, Hexagon, MessageSquare, Package, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentsThread } from "./comments-thread";

function titleCase(value: string): string {
  return value
    .split("-")
    .map((segment) => segment.slice(0, 1).toUpperCase() + segment.slice(1))
    .join(" ");
}

export default async function MarketplaceFunctionPage({
  params,
}: {
  params: Promise<{ fn: string }>;
}) {
  const session = await getOptionalSession();
  const { fn: fnId } = await params;
  const fn = await getMarketplaceFunction(fnId, session?.user.id);
  if (!fn) notFound();
  const comments = await listFunctionComments(fn.id);
  const readmeHtml = fn.readme ? renderMarketplaceReadme(fn.readme, fn.id) : "";

  return (
    <main className="relative min-h-screen bg-[var(--color-ink)] text-[var(--color-bone)]">
      <div className="gradient-radial-amber pointer-events-none absolute inset-x-0 top-0 h-[520px]" />
      <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border)] bg-[var(--color-ink)]/85 backdrop-blur-xl">
        <div className="flex w-full items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Hexagon className="size-5 text-[var(--color-amber)]" strokeWidth={1.5} />
            <span className="font-display text-xl text-[var(--color-bone)]">hostfunc</span>
          </Link>
          <Button
            asChild
            size="sm"
            className="rounded-full bg-[var(--color-bone)] px-5 font-medium text-[var(--color-ink)] hover:bg-white"
          >
            <Link href={session ? "/dashboard" : "/login"}>
              {session ? "Dashboard" : "Sign in"}
            </Link>
          </Button>
        </div>
      </header>

      <div className="relative mx-auto max-w-screen-2xl px-6 py-12">
        <Button
          asChild
          variant="ghost"
          className="mb-8 rounded-full text-[var(--color-bone-muted)] hover:bg-white/[0.04] hover:text-[var(--color-bone)]"
        >
          <Link href="/marketplace">
            <ArrowLeft className="size-4" />
            Back to marketplace
          </Link>
        </Button>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-8">
            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-8 shadow-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-[var(--color-border)] bg-white/[0.04] text-[var(--color-bone-faint)]">
                  {titleCase(fn.category)}
                </Badge>
                {fn.useCases.map((useCase) => (
                  <Badge
                    key={useCase}
                    className="border-[var(--color-border)] bg-white/[0.03] text-[var(--color-bone-faint)]"
                  >
                    {useCase}
                  </Badge>
                ))}
              </div>
              <h1 className="mt-5 text-balance font-display text-5xl leading-tight text-[var(--color-bone)]">
                {fn.slug}
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-[var(--color-bone-muted)]">
                {fn.shortDescription || fn.description || "A public TypeScript function."}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-5 text-sm text-[var(--color-bone-faint)]">
                <span>by {fn.orgName}</span>
                <span className="inline-flex items-center gap-1">
                  <Package className="size-4" />
                  {fn.packageCount} packages
                </span>
                <span className="inline-flex items-center gap-1">
                  <Star className="size-4" />
                  {fn.starCount} stars
                </span>
                <span className="inline-flex items-center gap-1">
                  <GitFork className="size-4" />
                  {fn.forkCount} forks
                </span>
                <a
                  href="#comments"
                  className="inline-flex items-center gap-1 transition hover:text-[var(--color-bone)]"
                >
                  <MessageSquare className="size-4" />
                  {fn.commentCount} comments
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-6">
              <h2 className="font-display text-3xl text-[var(--color-bone)]">Source Preview</h2>
              {fn.code ? (
                <CodePreview code={fn.code} className="mt-5" />
              ) : (
                <p className="mt-4 text-sm text-[var(--color-bone-muted)]">
                  This function has not deployed a public version yet.
                </p>
              )}
            </div>

            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-6">
              <h2 className="font-display text-3xl text-[var(--color-bone)]">About</h2>
              {readmeHtml ? (
                <article
                  className="markdown-readme mt-4"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: README is markdown rendered server-side
                  dangerouslySetInnerHTML={{ __html: readmeHtml }}
                />
              ) : (
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-bone-muted)]">
                  {fn.description || "No README has been published for this function yet."}
                </p>
              )}
            </div>

            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-6 sm:p-8">
              <CommentsThread
                fnId={fn.id}
                initialComments={comments.map((c) => ({
                  ...c,
                  createdAt: c.createdAt.toISOString(),
                  updatedAt: c.updatedAt.toISOString(),
                }))}
                signedIn={Boolean(session)}
                currentUserId={session?.user.id ?? null}
                currentUserName={session?.user.name ?? null}
                currentUserImage={session?.user.image ?? null}
                ownerAuthorName={fn.authorName ?? null}
              />
            </div>
          </section>

          <aside className="space-y-5">
            <div className="sticky top-24 rounded-3xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/80 p-6 shadow-2xl">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-amber)]">
                Use this function
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-bone-muted)]">
                Forking creates a new public function in your active workspace with this source as
                the starting draft.
              </p>
              <div className="mt-6">
                <FunctionActions
                  fnId={fn.id}
                  initialStarred={fn.hasStarred}
                  initialStarCount={fn.starCount}
                  signedIn={Boolean(session)}
                />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
