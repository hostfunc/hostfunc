import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

const ABSOLUTE_OR_FRAGMENT = /^(?:[a-z][a-z0-9+.-]*:|#|\/|mailto:|tel:)/i;

function rewriteRelativeUrl(rawUrl: string, fnId: string): string {
  const url = rawUrl.trim();
  if (!url) return rawUrl;
  if (ABSOLUTE_OR_FRAGMENT.test(url)) return rawUrl;
  const cleaned = url.replace(/^\.\//, "").replace(/^\/+/, "");
  if (!cleaned) return rawUrl;
  return `/api/marketplace/${encodeURIComponent(fnId)}/assets/${cleaned
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

function rewriteHtmlAssets(html: string, fnId: string): string {
  return html
    .replace(/(<img\b[^>]*?\bsrc=)(["'])([^"']*)\2/gi, (_match, prefix, quote, url) => {
      return `${prefix}${quote}${rewriteRelativeUrl(url, fnId)}${quote}`;
    })
    .replace(/(<a\b[^>]*?\bhref=)(["'])([^"']*)\2/gi, (_match, prefix, quote, url) => {
      return `${prefix}${quote}${rewriteRelativeUrl(url, fnId)}${quote}`;
    });
}

export function renderMarketplaceReadme(markdown: string, fnId: string): string {
  if (!markdown.trim()) return "";
  const html = marked.parse(markdown, { async: false }) as string;
  return rewriteHtmlAssets(html, fnId);
}
