const IMPORT_FROM_RE = /\b(?:import|export)\s+(?:type\s+)?[\s\S]*?\s+from\s+["']([^"']+)["']/g;
const IMPORT_SIDE_EFFECT_RE = /\bimport\s+["']([^"']+)["']/g;
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
const REQUIRE_RE = /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g;

const IGNORE_SPECIFIERS = new Set(["@hostfunc/fn", "@hostfunc/sdk"]);

function extractPackageName(specifier: string): string | null {
  if (!specifier) return null;
  if (specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("node:")) return null;

  if (specifier.startsWith("@")) {
    const [scope, name] = specifier.split("/");
    if (!scope || !name) return null;
    return `${scope}/${name}`;
  }

  const [name] = specifier.split("/");
  return name || null;
}

export function extractExternalPackageNames(code: string): string[] {
  const seen = new Set<string>();
  const patterns = [IMPORT_FROM_RE, IMPORT_SIDE_EFFECT_RE, DYNAMIC_IMPORT_RE, REQUIRE_RE];

  for (const re of patterns) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    match = re.exec(code);
    while (match) {
      const specifier = match[1]?.trim() ?? "";
      const packageName = extractPackageName(specifier);
      if (packageName && !IGNORE_SPECIFIERS.has(packageName)) {
        seen.add(packageName);
      }
      match = re.exec(code);
    }
  }

  return [...seen].sort();
}
