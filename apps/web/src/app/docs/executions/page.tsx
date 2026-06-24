import { docsMetadata } from "@/lib/seo";
import { DocsArticle } from "../_components/docs-article";

export const metadata = docsMetadata("/docs/executions");

export default function ExecutionsDocsPage() {
  return <DocsArticle path="/docs/executions" />;
}
