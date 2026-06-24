import { docsMetadata } from "@/lib/seo";
import { DocsArticle } from "../../_components/docs-article";

export const metadata = docsMetadata("/docs/sdk/ai");

export default function SdkAiDocsPage() {
  return <DocsArticle path="/docs/sdk/ai" />;
}
