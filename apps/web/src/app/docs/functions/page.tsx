import { docsMetadata } from "@/lib/seo";
import { DocsArticle } from "../_components/docs-article";

export const metadata = docsMetadata("/docs/functions");

export default function FunctionsDocsPage() {
  return <DocsArticle path="/docs/functions" />;
}
