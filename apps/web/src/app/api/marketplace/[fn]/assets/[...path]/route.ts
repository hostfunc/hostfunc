import { AssetError, getCurrentVersionAssetBlobByFn } from "@/server/fn-assets";
import { db, schema, sql } from "@hostfunc/db";
import type { NextRequest } from "next/server";

function compat<T>(value: T): T {
  return value;
}

/**
 * CSP for user-authored HTML. The `sandbox` directive sandboxes the document
 * even on direct navigation; combined with the consuming iframe's
 * `sandbox="allow-scripts"` (no `allow-same-origin`) it runs at an opaque
 * origin with no access to hostfunc cookies/storage.
 */
const USER_HTML_CSP =
  "sandbox allow-scripts; default-src 'self' data: blob:; img-src 'self' data: blob:; " +
  "style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data:; " +
  "connect-src 'self'; frame-ancestors 'self'";

async function loadPublicFn(fnId: string) {
  const rows = await db
    .select({
      id: schema.fn.id,
      visibility: schema.fn.visibility,
      currentVersionId: schema.fn.currentVersionId,
    })
    .from(schema.fn)
    .where(compat(sql`${schema.fn.id} = ${fnId}`) as never)
    .limit(1);
  return rows[0] ?? null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fn: string; path: string[] }> },
) {
  try {
    const { fn, path } = await params;
    const fnRow = await loadPublicFn(fn);
    if (!fnRow) return Response.json({ error: "not_found" }, { status: 404 });
    if (fnRow.visibility !== "public") {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    if (!fnRow.currentVersionId) {
      return Response.json({ error: "no_version" }, { status: 404 });
    }
    const blob = await getCurrentVersionAssetBlobByFn({ fnId: fn, path: path.join("/") });
    if (!blob) return Response.json({ error: "not_found" }, { status: 404 });
    const view = new Uint8Array(blob.content);
    const isHtml = blob.mime.startsWith("text/html");
    const headers: Record<string, string> = {
      "content-type": blob.mime,
      "cache-control": "public, max-age=300, s-maxage=86400, immutable",
      "content-length": String(blob.sizeBytes),
      "x-asset-sha256": blob.sha256,
      "x-content-type-options": "nosniff",
    };
    if (isHtml) {
      // User-authored HTML may contain arbitrary scripts — sandbox it.
      headers["content-security-policy"] = USER_HTML_CSP;
      headers["x-frame-options"] = "SAMEORIGIN";
    }
    return new Response(view, { status: 200, headers });
  } catch (error) {
    if (error instanceof AssetError) {
      return Response.json({ error: error.code, message: error.message }, { status: error.status });
    }
    return Response.json(
      { error: "internal_error", message: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    );
  }
}
