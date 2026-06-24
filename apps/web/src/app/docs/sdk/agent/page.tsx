import { docsMetadata } from "@/lib/seo";
import { DocsArticle } from "../../_components/docs-article";

export const metadata = docsMetadata("/docs/sdk/agent");

export default function SdkAgentDocsPage() {
  return <DocsArticle path="/docs/sdk/agent" />;
}
