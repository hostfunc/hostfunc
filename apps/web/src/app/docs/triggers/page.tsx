import { docsMetadata } from "@/lib/seo";
import { DocsArticle } from "../_components/docs-article";

export const metadata = docsMetadata("/docs/triggers");

export default function TriggersDocsPage() {
  return <DocsArticle path="/docs/triggers" />;
}
