import "server-only";

import { env } from "@/lib/env";
import {
  ACCEPTED_LOGO_TYPES,
  type AcceptedLogoMime,
  MAX_LOGO_BYTES,
  isAcceptedLogoMime,
  isHttpLogo,
} from "@/lib/logo";
import { findUnsafeSvgPattern, isSvgDocument } from "@/lib/safe-svg";
import { type SupabaseClient, createClient } from "@supabase/supabase-js";
import { ulid } from "ulid";

export { isHttpLogo };

export type LogoStorageErrorCode =
  | "not_configured"
  | "invalid_type"
  | "unsafe_svg"
  | "too_large"
  | "empty_file"
  | "upload_failed"
  | "delete_failed";

/** Typed error for the logo pipeline — mapped to HTTP status codes by the routes. */
export class LogoStorageError extends Error {
  constructor(
    public readonly code: LogoStorageErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "LogoStorageError";
  }
}

interface SupabaseStorageConfig {
  url: string;
  serviceRoleKey: string;
  bucket: string;
}

function getSupabaseConfig(): SupabaseStorageConfig {
  const url = env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new LogoStorageError(
      "not_configured",
      "Supabase storage is not configured for this environment.",
    );
  }
  return { url, serviceRoleKey, bucket: env.SUPABASE_LOGO_BUCKET };
}

let cachedClient: SupabaseClient | null = null;

function getSupabaseClient(): { client: SupabaseClient; bucket: string } {
  const { url, serviceRoleKey, bucket } = getSupabaseConfig();
  if (!cachedClient) {
    // The service-role key bypasses RLS — this module is server-only and the
    // key must never reach the client bundle.
    cachedClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return { client: cachedClient, bucket };
}

/**
 * Detects a raster image from its magic bytes. The browser-supplied MIME type
 * is spoofable, so uploads are verified against the actual file header.
 */
function sniffRasterMime(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

/** Validates that `text` is a real SVG and contains no active content. */
function assertSafeSvg(text: string): void {
  if (!isSvgDocument(text)) {
    throw new LogoStorageError("invalid_type", "File is not a valid SVG image.");
  }
  const label = findUnsafeSvgPattern(text);
  if (label) {
    throw new LogoStorageError("unsafe_svg", `SVG contains ${label} and cannot be used as a logo.`);
  }
}

/** Validates a logo upload and returns its canonical MIME type. */
async function validateLogoFile(file: File): Promise<AcceptedLogoMime> {
  if (file.size === 0) {
    throw new LogoStorageError("empty_file", "The selected file is empty.");
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new LogoStorageError("too_large", "Logo image must be 2 MB or smaller.");
  }
  if (!isAcceptedLogoMime(file.type)) {
    throw new LogoStorageError("invalid_type", "Logo must be a PNG, JPEG, WebP, or SVG image.");
  }

  const mime: AcceptedLogoMime = file.type;
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (mime === "image/svg+xml") {
    assertSafeSvg(new TextDecoder("utf-8").decode(bytes));
  } else {
    const sniffed = sniffRasterMime(bytes);
    if (sniffed !== mime) {
      throw new LogoStorageError(
        "invalid_type",
        "File contents do not match a supported image format.",
      );
    }
  }

  return mime;
}

/**
 * Validates and uploads a logo image under `keyPrefix`, returning the public
 * URL. A fresh ULID per upload keeps object keys unique, so replacing a logo
 * never hits CDN cache staleness. Does not touch the database.
 */
async function uploadLogoImage(keyPrefix: string, file: File): Promise<string> {
  const mime = await validateLogoFile(file);
  const { client, bucket } = getSupabaseClient();
  const key = `${keyPrefix}/${ulid()}${ACCEPTED_LOGO_TYPES[mime]}`;
  const { error } = await client.storage.from(bucket).upload(key, file, {
    contentType: mime,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    throw new LogoStorageError("upload_failed", `Failed to store logo: ${error.message}`);
  }
  return client.storage.from(bucket).getPublicUrl(key).data.publicUrl;
}

/** Uploads a workspace (organization) logo and returns its public URL. */
export function uploadWorkspaceLogo({
  orgId,
  file,
}: {
  orgId: string;
  file: File;
}): Promise<string> {
  return uploadLogoImage(`workspaces/${orgId}`, file);
}

/** Uploads a function logo and returns its public URL. */
export function uploadFunctionLogo({
  orgId,
  fnId,
  file,
}: {
  orgId: string;
  fnId: string;
  file: File;
}): Promise<string> {
  return uploadLogoImage(`functions/${orgId}/${fnId}`, file);
}

/**
 * Removes a previously-uploaded logo object from storage. A no-op for legacy
 * preset ids. Intended to be called best-effort — callers should not fail a
 * request if cleanup throws.
 */
export async function deleteLogoObject(logoUrl: string): Promise<void> {
  if (!isHttpLogo(logoUrl)) return;
  const { client, bucket } = getSupabaseClient();
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = logoUrl.indexOf(marker);
  if (idx === -1) return;
  const rawKey = logoUrl.slice(idx + marker.length).split("?")[0];
  if (!rawKey) return;
  const key = decodeURIComponent(rawKey);
  const { error } = await client.storage.from(bucket).remove([key]);
  if (error) {
    throw new LogoStorageError("delete_failed", `Failed to delete logo object: ${error.message}`);
  }
}

const ERROR_STATUS: Record<LogoStorageErrorCode, { status: number; error: string }> = {
  not_configured: { status: 503, error: "logo_storage_not_configured" },
  invalid_type: { status: 415, error: "unsupported_file_type" },
  unsafe_svg: { status: 422, error: "unsafe_svg" },
  too_large: { status: 413, error: "file_too_large" },
  empty_file: { status: 400, error: "empty_file" },
  upload_failed: { status: 502, error: "storage_error" },
  delete_failed: { status: 502, error: "storage_error" },
};

/** Next's `redirect()` throws a tagged error — it must propagate, not become a 500. */
function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

/**
 * Maps a thrown error from a logo route handler to a JSON Response. Re-throws
 * Next redirect errors so navigation still works. Shared by the workspace and
 * function logo routes.
 */
export function logoErrorResponse(error: unknown): Response {
  if (isNextRedirectError(error)) throw error;
  if (error instanceof LogoStorageError) {
    const mapped = ERROR_STATUS[error.code];
    return Response.json({ error: mapped.error }, { status: mapped.status });
  }
  if (error instanceof Error && error.message === "forbidden") {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  if (error instanceof Error && error.message === "not_found") {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  return Response.json({ error: "logo_update_failed" }, { status: 500 });
}
