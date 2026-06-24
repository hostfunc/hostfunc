import { docsMetadata } from "@/lib/seo";
import { DocsArticle } from "../_components/docs-article";

export const metadata = docsMetadata("/docs/getting-started");

export default function GettingStartedDocsPage() {
  return <DocsArticle path="/docs/getting-started" />;
}
