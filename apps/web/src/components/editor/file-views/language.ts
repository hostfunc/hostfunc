/** Maps a file extension to a Monaco editor language id. */
const EXT_LANGUAGE: Record<string, string> = {
  md: "markdown",
  markdown: "markdown",
  txt: "plaintext",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  svg: "xml",
  html: "html",
  htm: "html",
  css: "css",
  js: "javascript",
  mjs: "javascript",
};

/** Resolves the Monaco language id for an asset path (defaults to plaintext). */
export function languageFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXT_LANGUAGE[ext] ?? "plaintext";
}
