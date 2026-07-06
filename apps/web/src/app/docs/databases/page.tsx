import { docsMetadata } from "@/lib/seo";
import { DocsArticle } from "../_components/docs-article";

export const metadata = docsMetadata("/docs/databases");

export default function DatabasesDocsPage() {
  return <DocsArticle path="/docs/databases" />;
}
