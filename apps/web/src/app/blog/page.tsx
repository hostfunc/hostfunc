import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { blogPosts, formatBlogDate } from "@/lib/blog";
import { pageMetadata } from "@/lib/seo";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = pageMetadata({
  title: "Blog",
  description:
    "Notes on building hostfunc — deploying TypeScript functions, the agent-native and MCP design, self-hosting, and the patterns people ship with.",
  path: "/blog",
});

export default function BlogIndexPage() {
  return (
    <MarketingPageShell>
      <section className="relative overflow-hidden border-b border-[var(--color-border)]">
        <div className="gradient-radial-amber pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px]" />
        <div className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-amber)]">
            Blog
          </p>
          <h1 className="mt-4 text-balance font-display text-5xl leading-[1.05] text-[var(--color-bone)] md:text-6xl">
            The hostfunc blog
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--color-bone-muted)]">
            Notes on deploying TypeScript functions, building for agents, and running it all
            yourself.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="space-y-4">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/65 p-7 transition-all hover:-translate-y-0.5 hover:border-[var(--color-amber)]/35 hover:bg-white/[0.04]"
            >
              <time
                dateTime={post.date}
                className="text-xs uppercase tracking-widest text-[var(--color-bone-faint)]"
              >
                {formatBlogDate(post.date)}
              </time>
              <h2 className="mt-3 font-display text-2xl text-[var(--color-bone)]">{post.title}</h2>
              <p className="mt-3 text-pretty leading-relaxed text-[var(--color-bone-muted)]">
                {post.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-amber)]">
                Read post
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </MarketingPageShell>
  );
}
