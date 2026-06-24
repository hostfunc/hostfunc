import { docsMetadata } from "@/lib/seo";
import { DocsArticle } from "../_components/docs-article";

export const metadata = docsMetadata("/docs/security");

export default function SecurityDocsPage() {
  return <DocsArticle path="/docs/security" />;
}
