const REGISTRY_BASE_URL = "https://registry.npmjs.org";
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  value: string | null;
  expiresAt: number;
};

type SearchCacheEntry = {
  value: NpmSearchResult[];
  expiresAt: number;
};

const latestVersionCache = new Map<string, CacheEntry>();
const searchCache = new Map<string, SearchCacheEntry>();

export interface NpmSearchResult {
  name: string;
  version: string | null;
  description: string;
  keywords: string[];
  npmUrl: string | null;
}

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

export async function searchNpmPackages(query: string, size = 8): Promise<NpmSearchResult[]> {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 2) return [];

  const now = Date.now();
  const cacheKey = `${normalized}:${size}`;
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.value;

  const url = `${REGISTRY_BASE_URL}/-/v1/search?text=${encodeURIComponent(normalized)}&size=${size}`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      searchCache.set(cacheKey, { value: [], expiresAt: now + CACHE_TTL_MS });
      return [];
    }

    const json = (await response.json()) as {
      objects?: Array<{
        package?: {
          name?: string;
          version?: string;
          description?: string;
          keywords?: string[];
          links?: { npm?: string };
        };
      }>;
    };

    const results = (json.objects ?? [])
      .map((entry) => entry.package)
      .filter((pkg): pkg is NonNullable<typeof pkg> => Boolean(pkg?.name))
      .map((pkg) => ({
        name: pkg.name ?? "",
        version: pkg.version ?? null,
        description: pkg.description ?? "",
        keywords: pkg.keywords ?? [],
        npmUrl: pkg.links?.npm ?? null,
      }));

    searchCache.set(cacheKey, { value: results, expiresAt: now + CACHE_TTL_MS });
    return results;
  } catch {
    searchCache.set(cacheKey, { value: [], expiresAt: now + CACHE_TTL_MS });
    return [];
  }
}
