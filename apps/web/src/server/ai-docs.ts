import "server-only";

const ALLOWED_HOSTS = new Set([
  "discord.com",
  "discord.dev",
  "api.slack.com",
  "slack.dev",
  "docs.aws.amazon.com",
  "developer.mozilla.org",
  "nodejs.org",
  "developers.cloudflare.com",
]);

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_DOC_CHARS = 6_000;
const inMemoryCache = new Map<string, { expiresAt: number; value: string }>();

function sanitizeText(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHints(hints: string[]): string[] {
  const unique = new Set<string>();
  for (const hint of hints) {
    const value = hint.trim().toLowerCase();
    if (!value) continue;
    unique.add(value);
  }
  return [...unique];
}

function pickAllowedHosts(hints: string[]): string[] {
  const normalized = normalizeHints(hints);
  if (normalized.length === 0) return [];
  return [...ALLOWED_HOSTS].filter((host) =>
    normalized.some((hint) => host.includes(hint) || hint.includes(host)),
  );
}

async function fetchHostSnippet(host: string, query: string): Promise<string | null> {
  const key = `${host}::${query}`;
  const cached = inMemoryCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const candidateUrls = [
    `https://${host}`,
    `https://${host}/docs`,
    `https://${host}/developers`,
  ];
  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "user-agent": "hostfunc-ai-generator/1.0" },
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const html = await res.text();
      const text = sanitizeText(html);
      if (!text) continue;
      const snippet = text.slice(0, MAX_DOC_CHARS);
      inMemoryCache.set(key, { value: snippet, expiresAt: Date.now() + CACHE_TTL_MS });
      return snippet;
    } catch {
      // ignore and continue candidate URLs
    }
  }
  return null;
}

export async function fetchExternalDocsContext(input: {
  query: string;
  hints: string[];
}): Promise<string> {
  const hosts = pickAllowedHosts(input.hints);
  if (hosts.length === 0) return "";

  const snippets = await Promise.all(
    hosts.map(async (host) => {
      const text = await fetchHostSnippet(host, input.query);
      if (!text) return null;
      return `Source: ${host}\n${text.slice(0, MAX_DOC_CHARS)}`;
    }),
  );

  return snippets.filter(Boolean).join("\n\n---\n\n");
}

