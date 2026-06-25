import { DocsArticle } from "@/app/_components/docs-article";
import { DocsLanding } from "@/app/_components/docs-landing";
import { assertDocsContentIntegrity, docsPages } from "@/lib/docs-content";
import { docsMetadata, pageMetadata } from "@/lib/docs-seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Params = { slug?: string[] };

/** Map a `docsPages` key (root-relative path) to a catch-all slug param. */
function pathToSlug(path: string): string[] {
  return path === "/" ? [] : path.slice(1).split("/");
}

/** Resolve the catch-all slug back to a `docsPages` key. */
function slugToPath(slug: string[] | undefined): string {
  return slug && slug.length > 0 ? `/${slug.join("/")}` : "/";
}

export function generateStaticParams(): Params[] {
  // Fail the build loudly if a nav link ever points at a missing page.
  assertDocsContentIntegrity();
  return Object.keys(docsPages).map((path) => ({ slug: pathToSlug(path) }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const path = slugToPath(slug);
  if (!docsPages[path]) return {};
  if (path === "/") {
    return pageMetadata({
      title: "Documentation",
      description:
        "Learn how to build, deploy, and operate serverless TypeScript functions on hostfunc — guides, CLI, SDK reference, MCP, and security.",
      path: "/",
    });
  }
  return docsMetadata(path);
}

export default async function DocsCatchAllPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const path = slugToPath(slug);
  if (!docsPages[path]) notFound();
  return path === "/" ? <DocsLanding /> : <DocsArticle path={path} />;
}
