import { CommentsThread } from "@/app/marketplace/[fn]/comments-thread";
import { FunctionLogo } from "@/components/function/function-logo";
import { CodePreview } from "@/components/marketing/code-preview";
import { FunctionActions } from "@/components/marketplace/function-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkspaceLogo } from "@/components/workspace/workspace-logo";
import { renderMarketplaceReadme } from "@/lib/marketplace-readme";
import { requireSession } from "@/lib/session";
import { getMarketplaceFunction, listFunctionComments } from "@/server/functions";
import { ArrowLeft, GitFork, MessageSquare, Package, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

function titleCase(value: string): string {
  return value
    .split("-")
    .map((segment) => segment.slice(0, 1).toUpperCase() + segment.slice(1))
    .join(" ");
}

export const dynamic = "force-dynamic";

export default async function DashboardMarketplaceFunctionPage({
  params,
}: {
  params: Promise<{ fn: string }>;
}) {
  const session = await requireSession();
  const { fn: fnId } = await params;
  const fn = await getMarketplaceFunction(fnId, session.user.id);
  if (!fn) notFound();
  const comments = await listFunctionComments(fn.id);
  const readmeHtml = fn.readme ? renderMarketplaceReadme(fn.readme, fn.id) : "";

  return (
    <div className="mx-auto max-w-screen-2xl animate-in space-y-8 fade-in duration-500">
      <Button
        asChild
        variant="ghost"
        className="rounded-full text-[var(--color-bone-muted)] hover:bg-white/[0.04] hover:text-[var(--color-bone)]"
      >
        <Link href="/dashboard/marketplace">
          <ArrowLeft className="size-4" />
          Back to marketplace
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
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
            <div className="mt-5 flex items-center gap-4">
              <FunctionLogo logo={fn.logo} name={fn.slug} size="lg" />
              <h1 className="text-balance font-display text-4xl leading-tight text-[var(--color-bone)] md:text-5xl">
                {fn.slug}
              </h1>
            </div>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--color-bone-muted)] md:text-lg">
              {fn.shortDescription || fn.description || "A public TypeScript function."}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-5 text-sm text-[var(--color-bone-faint)]">
              <span className="inline-flex items-center gap-1.5">
                <WorkspaceLogo logo={fn.orgLogo} name={fn.orgName} size="md" />
                by {fn.orgName} / {fn.authorName}
              </span>
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
            <h2 className="font-display text-2xl text-[var(--color-bone)]">Source Preview</h2>
            {fn.code ? (
              <CodePreview code={fn.code} className="mt-5" />
            ) : (
              <p className="mt-4 text-sm text-[var(--color-bone-muted)]">
                This function has not deployed a public version yet.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-6">
            <h2 className="font-display text-2xl text-[var(--color-bone)]">About</h2>
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

          <div
            id="comments"
            className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-6 sm:p-8"
          >
            <CommentsThread
              fnId={fn.id}
              initialComments={comments.map((c) => ({
                ...c,
                createdAt: c.createdAt.toISOString(),
                updatedAt: c.updatedAt.toISOString(),
              }))}
              signedIn
              currentUserId={session.user.id}
              currentUserName={session.user.name ?? null}
              currentUserImage={session.user.image ?? null}
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
              Forking creates a new public function in your active workspace with this source as the
              starting draft.
            </p>
            <div className="mt-6">
              <FunctionActions
                fnId={fn.id}
                initialStarred={fn.hasStarred}
                initialStarCount={fn.starCount}
                signedIn
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
