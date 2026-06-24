import { docsMetadata } from "@/lib/seo";
import { DocsArticle } from "../_components/docs-article";

export const metadata = docsMetadata("/docs/vscode-extension");

export default function VscodeExtensionDocsPage() {
  return <DocsArticle path="/docs/vscode-extension" />;
}
