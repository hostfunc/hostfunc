const REGISTRY_BASE_URL = "https://registry.npmjs.org";
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  value: string | null;
  expiresAt: number;
};

const latestVersionCache = new Map<string, CacheEntry>();

export async function getLatestNpmVersion(pkgName: string): Promise<string | null> {
  const now = Date.now();
  const cached = latestVersionCache.get(pkgName);
  if (cached && cached.expiresAt > now) return cached.value;

  const url = `${REGISTRY_BASE_URL}/${encodeURIComponent(pkgName).replace(/%40/g, "@")}`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      latestVersionCache.set(pkgName, { value: null, expiresAt: now + CACHE_TTL_MS });
      return null;
    }

    const json = (await response.json()) as { "dist-tags"?: { latest?: string } };
    const latest = json["dist-tags"]?.latest ?? null;
    latestVersionCache.set(pkgName, { value: latest, expiresAt: now + CACHE_TTL_MS });
    return latest;
  } catch {
    latestVersionCache.set(pkgName, { value: null, expiresAt: now + CACHE_TTL_MS });
    return null;
  }
}
