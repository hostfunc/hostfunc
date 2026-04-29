import { CodePreview } from "@/components/marketing/code-preview";
import { FunctionActions } from "@/components/marketplace/function-actions";
import { Badge } from "@/components/ui/badge";
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
}

export function CommunityFunctionCard({ fn, basePath, signedIn }: CommunityFunctionCardProps) {
  return (
    <article className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-6 transition-all hover:border-[var(--color-amber)]/35 hover:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href={`${basePath}/${fn.id}`}
            className="font-display text-2xl text-[var(--color-bone)] transition-colors group-hover:text-[var(--color-amber)]"
          >
            {fn.slug}
          </Link>
          <p className="mt-1 text-xs text-[var(--color-bone-faint)]">
            by {fn.orgName} / {fn.authorName}
          </p>
        </div>
        <Badge className="border-[var(--color-border)] bg-white/[0.04] text-[var(--color-bone-faint)]">
          {titleCase(fn.category)}
        </Badge>
      </div>
      <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-[var(--color-bone-muted)]">
        {fn.shortDescription || fn.description || "A public TypeScript function."}
      </p>
      {fn.useCases.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {fn.useCases.slice(0, 4).map((useCase) => (
            <span
              key={useCase}
              className="rounded-full border border-[var(--color-border)] bg-white/[0.03] px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-bone-faint)]"
            >
              {useCase}
            </span>
          ))}
        </div>
      ) : null}
      {fn.codePreview ? <CodePreview code={fn.codePreview} compact className="mt-4" /> : null}
      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs text-[var(--color-bone-faint)]">
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
    </article>
  );
}
