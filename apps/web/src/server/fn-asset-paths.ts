export type AssetKind = "readme" | "image" | "font" | "other";

export const ASSET_MAX_FILE_BYTES = Number(process.env.HOSTFUNC_ASSET_MAX_BYTES ?? 1_048_576);
export const ASSET_MAX_FILES_PER_FN = Number(process.env.HOSTFUNC_ASSET_MAX_FILES ?? 25);
export const ASSET_MAX_TOTAL_BYTES = Number(
  process.env.HOSTFUNC_ASSET_MAX_TOTAL_BYTES ?? 10 * 1_048_576,
);

export const RESERVED_PATHS: ReadonlySet<string> = new Set(["index.ts"]);

const IMAGE_MIMES: ReadonlySet<string> = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/svg+xml",
  "image/webp",
]);
const FONT_MIMES: ReadonlySet<string> = new Set([
  "font/woff",
  "font/woff2",
  "font/ttf",
  "font/otf",
  "application/font-woff",
  "application/font-woff2",
  "application/x-font-ttf",
  "application/x-font-otf",
]);
const TEXT_MIMES: ReadonlySet<string> = new Set(["text/markdown", "text/plain"]);

const EXT_TO_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  md: "text/markdown",
  markdown: "text/markdown",
  txt: "text/plain",
};

export class AssetError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "AssetError";
    this.code = code;
    this.status = status;
  }
}

export function sanitizeAssetPath(rawPath: string): string {
  if (typeof rawPath !== "string") throw new AssetError("invalid_path", "path must be a string");
  let p = rawPath.trim().replace(/\\/g, "/");
  if (!p) throw new AssetError("invalid_path", "path is required");
  if (p.startsWith("/")) throw new AssetError("invalid_path", "path must be relative");
  if (p.startsWith("./")) p = p.slice(2);

  const parts = p.split("/").filter(Boolean);
  if (parts.length === 0) throw new AssetError("invalid_path", "path is required");
  for (const part of parts) {
    if (part === "." || part === "..") {
      throw new AssetError("invalid_path", "path may not contain '.' or '..' segments");
    }
    if (part.length > 120) {
      throw new AssetError("invalid_path", "path segment too long");
    }
    if (!/^[A-Za-z0-9._\-+@()\[\] ]+$/.test(part)) {
      throw new AssetError("invalid_path", `path segment contains invalid characters: ${part}`);
    }
  }
  const normalized = parts.join("/");
  if (normalized.length > 240) throw new AssetError("invalid_path", "path is too long");
  if (RESERVED_PATHS.has(normalized)) {
    throw new AssetError("reserved_path", `'${normalized}' is reserved`);
  }
  return normalized;
}

export function classifyAsset(path: string, mime: string): { kind: AssetKind; mime: string } {
  const normalizedMime = mime.toLowerCase();
  const ext = (path.split(".").pop() ?? "").toLowerCase();
  const fallback = EXT_TO_MIME[ext];
  const finalMime = normalizedMime || fallback || "application/octet-stream";

  if (path === "README.md") return { kind: "readme", mime: "text/markdown" };
  if (IMAGE_MIMES.has(finalMime)) return { kind: "image", mime: finalMime };
  if (FONT_MIMES.has(finalMime)) return { kind: "font", mime: finalMime };
  if (TEXT_MIMES.has(finalMime)) return { kind: "other", mime: finalMime };

  throw new AssetError(
    "unsupported_mime",
    `unsupported asset type: ${finalMime || "unknown"} (path=${path})`,
  );
}
