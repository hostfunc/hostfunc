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

/**
 * Derive the WebAuthn Relying Party ID (rpID) from a URL. Passkeys are bound to this domain, so we
 * use the registrable parent (e.g. "hostfunc.io") rather than the app subdomain — that lets a
 * passkey registered on app.hostfunc.io also be used from hostfunc.io / staging.hostfunc.io,
 * matching the cross-subdomain session cookie. Falls back to the bare host (e.g. "localhost").
 */
export function passkeyRpId(urlString: string): string {
  let host: string;
  try {
    host = new URL(urlString).hostname;
  } catch {
    return "localhost";
  }
  if (host === "localhost" || /^[0-9.]+$/.test(host)) return host;
  const parts = host.split(".");
  if (parts.length < 2) return host;
  return parts.slice(-2).join(".");
}
