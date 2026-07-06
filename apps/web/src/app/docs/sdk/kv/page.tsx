import { docsMetadata } from "@/lib/seo";
import { DocsArticle } from "../../_components/docs-article";

export const metadata = docsMetadata("/docs/sdk/kv");

export default function SdkKvDocsPage() {
  return <DocsArticle path="/docs/sdk/kv" />;
}
