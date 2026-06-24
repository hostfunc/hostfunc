import { docsMetadata } from "@/lib/seo";
import { DocsArticle } from "../../_components/docs-article";

export const metadata = docsMetadata("/docs/sdk/vector");

export default function SdkVectorDocsPage() {
  return <DocsArticle path="/docs/sdk/vector" />;
}
