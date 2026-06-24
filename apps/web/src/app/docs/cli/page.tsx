import { docsMetadata } from "@/lib/seo";
import { DocsArticle } from "../_components/docs-article";

export const metadata = docsMetadata("/docs/cli");

export default function CliDocsPage() {
  return <DocsArticle path="/docs/cli" />;
}
