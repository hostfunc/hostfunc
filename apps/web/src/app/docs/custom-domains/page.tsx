import { docsMetadata } from "@/lib/seo";
import { DocsArticle } from "../_components/docs-article";

export const metadata = docsMetadata("/docs/custom-domains");

export default function CustomDomainsDocsPage() {
  return <DocsArticle path="/docs/custom-domains" />;
}
