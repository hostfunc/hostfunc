import { docsMetadata } from "@/lib/seo";
import { DocsArticle } from "../_components/docs-article";

export const metadata = docsMetadata("/docs/websites");

export default function WebsitesDocsPage() {
  return <DocsArticle path="/docs/websites" />;
}
