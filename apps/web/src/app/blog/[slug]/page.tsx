import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { blogPosts, formatBlogDate, getBlogPost } from "@/lib/blog";
import { blogComponents } from "@/lib/blog-content";
import { blogPostingJsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamicParams = false;

export function generateStaticParams(): Array<{ slug: string }> {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) {
    return pageMetadata({
      title: "Post not found",
      description: "This blog post could not be found.",
      path: `/blog/${slug}`,
      noindex: true,
    });
  }
  return pageMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  const Content = blogComponents[slug];
  if (!post || !Content) notFound();

  return (
    <MarketingPageShell>
      <JsonLd
        data={blogPostingJsonLd({
          title: post.title,
          description: post.description,
          path: `/blog/${post.slug}`,
          datePublished: post.date,
          author: post.author,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: post.title, path: `/blog/${post.slug}` },
        ])}
      />

      <article className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-bone-muted)] transition-colors hover:text-[var(--color-bone)]"
        >
          <ArrowLeft className="size-4" />
          All posts
        </Link>

        <header className="mt-8 border-b border-[var(--color-border)] pb-8">
          <time
            dateTime={post.date}
            className="text-xs uppercase tracking-widest text-[var(--color-bone-faint)]"
          >
            {formatBlogDate(post.date)} · {post.author}
          </time>
          <h1 className="mt-3 text-balance font-display text-4xl leading-[1.08] text-[var(--color-bone)] md:text-5xl">
            {post.title}
          </h1>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-[var(--color-bone-muted)]">
            {post.description}
          </p>
        </header>

        <div className="markdown-readme mt-10">
          <Content />
        </div>
      </article>
    </MarketingPageShell>
  );
}
