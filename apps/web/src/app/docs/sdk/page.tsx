import { docsMetadata } from "@/lib/seo";
import { DocsArticle } from "../_components/docs-article";

export const metadata = docsMetadata("/docs/sdk");

export default function SdkDocsPage() {
  return <DocsArticle path="/docs/sdk" />;
}
