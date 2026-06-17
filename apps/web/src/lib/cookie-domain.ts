/**
 * Derive the parent cookie domain (e.g. ".hostfunc.io") from a URL, so auth
 * session cookies can be shared across subdomains (app/www/apex). Returns
 * undefined for localhost or bare IP hosts, where cross-subdomain cookies don't
 * apply and would break local development.
 */
export function parentCookieDomain(urlString: string): string | undefined {
  let host: string;
  try {
    host = new URL(urlString).hostname;
  } catch {
    return undefined;
  }
  if (host === "localhost" || /^[0-9.]+$/.test(host)) return undefined;
  const parts = host.split(".");
  if (parts.length < 2) return undefined;
  return `.${parts.slice(-2).join(".")}`;
}
