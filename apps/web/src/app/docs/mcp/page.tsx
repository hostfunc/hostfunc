import { docsMetadata } from "@/lib/seo";
import { DocsArticle } from "../_components/docs-article";

export const metadata = docsMetadata("/docs/mcp");

export default function McpDocsPage() {
  return <DocsArticle path="/docs/mcp" />;
}
