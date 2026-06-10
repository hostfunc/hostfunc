import { FunctionLogo } from "@/components/function/function-logo";
import { CodePreview } from "@/components/marketing/code-preview";
import { FunctionActions } from "@/components/marketplace/function-actions";
import { HtmlPreviewFrame } from "@/components/marketplace/html-preview-frame";
import { Badge } from "@/components/ui/badge";
import { WorkspaceLogo } from "@/components/workspace/workspace-logo";
import { cn } from "@/lib/utils";
import type { MarketplaceFunctionItem } from "@/server/functions";
import { GitFork, MessageSquare, Star } from "lucide-react";
import Link from "next/link";

function titleCase(value: string): string {
  return value
    .split("-")
    .map((segment) => segment.slice(0, 1).toUpperCase() + segment.slice(1))
    .join(" ");
}

interface CommunityFunctionCardProps {
  fn: MarketplaceFunctionItem;
  /** Path prefix for the card's detail link (e.g. "/marketplace" or "/dashboard/marketplace"). */
  basePath: string;
  signedIn: boolean;
  view?: "grid" | "list";
}

export function CommunityFunctionCard({
  fn,
  basePath,
  signedIn,
  view = "grid",
}: CommunityFunctionCardProps) {
  const isList = view === "list";

  return (
    <article
      className={cn(
        "group flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 transition-all hover:border-[var(--color-amber)]/35 hover:bg-white/[0.04]",
        isList ? "p-5" : "p-6",
      )}
    >
      <div
        className={cn(
          "flex gap-3",
          isList
            ? "flex-col lg:flex-row lg:items-start lg:justify-between"
            : "items-start justify-between",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className={cn("flex items-start justify-between gap-3", isList ? "lg:block" : "")}>
            <div className="flex min-w-0 items-center gap-3">
              <FunctionLogo logo={fn.logo} name={fn.slug} size="md" />
              <Link
                href={`${basePath}/${fn.id}`}
                className={cn(
                  "min-w-0 truncate text-[var(--color-bone)] transition-colors group-hover:text-[var(--color-amber)]",
                  isList ? "font-display text-xl" : "font-display text-2xl",
                )}
              >
                {fn.slug}
              </Link>
            </div>
            {isList ? (
              <Badge className="border-[var(--color-border)] bg-white/[0.04] text-[var(--color-bone-faint)] lg:hidden">
                {titleCase(fn.category)}
              </Badge>
            ) : null}
          </div>
          <p
            className={cn(
              "mt-3 text-sm leading-relaxed text-[var(--color-bone-muted)]",
              isList ? "line-clamp-2" : "line-clamp-3",
            )}
          >
            {fn.shortDescription || fn.description || "A public TypeScript function."}
          </p>
          {fn.useCases.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {fn.useCases.slice(0, isList ? 6 : 4).map((useCase) => (
                <span
                  key={useCase}
                  className="rounded-full border border-[var(--color-border)] bg-white/[0.03] px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-bone-faint)]"
                >
                  {useCase}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "flex shrink-0 flex-col justify-between gap-4",
            isList ? "lg:min-w-[14rem] lg:items-end" : "items-end",
          )}
        >
          {!isList ? (
            <Badge className="border-[var(--color-border)] bg-white/[0.04] text-[var(--color-bone-faint)]">
              {titleCase(fn.category)}
            </Badge>
          ) : (
            <Badge className="hidden border-[var(--color-border)] bg-white/[0.04] text-[var(--color-bone-faint)] lg:inline-flex">
              {titleCase(fn.category)}
            </Badge>
          )}
          <div
            className={cn(
              "flex items-center gap-3 text-xs text-[var(--color-bone-faint)]",
              isList ? "lg:justify-end" : "",
            )}
          >
            <span className="inline-flex items-center gap-1">
              <Star className="size-3.5" />
              {fn.starCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="size-3.5" />
              {fn.commentCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <GitFork className="size-3.5" />
              {fn.forkCount}
            </span>
          </div>
          <FunctionActions
            fnId={fn.id}
            initialStarred={fn.hasStarred}
            initialStarCount={fn.starCount}
            signedIn={signedIn}
            compact
          />
        </div>
      </div>
      {fn.hasHtmlPage ? (
        <Link href={`${basePath}/${fn.id}`} className="mt-4 flex min-h-0 w-full min-w-0 flex-1">
          <HtmlPreviewFrame fnId={fn.id} compact />
        </Link>
      ) : fn.codePreview ? (
        <div className="mt-4 w-full min-w-0">
          <CodePreview code={fn.codePreview} compact />
        </div>
      ) : null}
      <div className="mt-4 flex items-center justify-end gap-1.5 text-xs text-[var(--color-bone-faint)]">
        <WorkspaceLogo logo={fn.orgLogo} name={fn.orgName} size="md" className="shrink-0" />
        <span className="truncate">
          by {fn.orgName} / {fn.authorName}
        </span>
      </div>
    </article>
  );
}
