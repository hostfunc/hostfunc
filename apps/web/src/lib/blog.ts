/**
 * Typed blog post metadata. Kept free of any `.mdx` imports so that modules which
 * only need post slugs/dates — notably `sitemap.ts` — can depend on this without
 * pulling MDX through the bundler-less Node test runner. The rendered post bodies
 * live in `blog-content.ts`, which is the only module that imports the `.mdx`
 * files; `@next/mdx` doesn't parse frontmatter, so metadata is authored here.
 */
export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  author: string;
  tags: string[];
}

export const blogPosts: BlogPost[] = [
  {
    slug: "deploy-typescript-function-90-seconds",
    title: "How to deploy a TypeScript function in 90 seconds",
    description:
      "Write one exported main(), hit deploy, get a stable URL. A walkthrough of the full hostfunc loop — and the stack you get for free.",
    date: "2026-05-12",
    author: "The hostfunc team",
    tags: ["getting-started", "typescript", "serverless"],
  },
  {
    slug: "why-we-built-mcp-native-function-platform",
    title: "Why we built an MCP-native function platform",
    description:
      "What a function platform looks like when half the people deploying to it are agents: MCP as a first-class surface, ephemeral scratch functions, and live lineage.",
    date: "2026-04-28",
    author: "The hostfunc team",
    tags: ["mcp", "agents", "product"],
  },
  {
    slug: "self-hosting-hostfunc-cloudflare",
    title: "Self-hosting hostfunc on your own Cloudflare account",
    description:
      "hostfunc is open source under AGPL-3.0. Here's how the control plane and edge workers fit together, what you need to provide, and what the license actually requires.",
    date: "2026-04-10",
    author: "The hostfunc team",
    tags: ["self-hosting", "open-source", "cloudflare"],
  },
].sort((a, b) => b.date.localeCompare(a.date));

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

/** Format an ISO date for display, e.g. "May 12, 2026". */
export function formatBlogDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
