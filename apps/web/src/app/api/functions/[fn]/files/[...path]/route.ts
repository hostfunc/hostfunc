import { requireOrgPermission } from "@/lib/session";
import {
  AssetError,
  deleteFunctionAsset,
  getFunctionAssetBlob,
  renameFunctionAsset,
  upsertFunctionAsset,
} from "@/server/fn-assets";
import { db, schema, sql } from "@hostfunc/db";
import type { NextRequest } from "next/server";

function compat<T>(value: T): T {
  return value;
}

async function assertOrgOwnsFunction(orgId: string, fnId: string) {
  const rows = await db
    .select({ id: schema.fn.id })
    .from(schema.fn)
    .where(compat(sql`${schema.fn.id} = ${fnId} and ${schema.fn.orgId} = ${orgId}`) as never)
    .limit(1);
  if (!rows[0]) throw new AssetError("not_found", "function not found", 404);
}

function joinPath(parts: string[]): string {
  return parts.join("/");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fn: string; path: string[] }> },
) {
  try {
    const { orgId } = await requireOrgPermission("view_workspace");
    const { fn, path } = await params;
    await assertOrgOwnsFunction(orgId, fn);
    const blob = await getFunctionAssetBlob({ fnId: fn, path: joinPath(path) });
    if (!blob) return Response.json({ error: "not_found" }, { status: 404 });
    const view = new Uint8Array(blob.content);
    return new Response(view, {
      status: 200,
      headers: {
        "content-type": blob.mime,
        "cache-control": "private, no-store",
        "content-length": String(blob.sizeBytes),
        "x-asset-sha256": blob.sha256,
      },
    });
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ fn: string; path: string[] }> },
) {
  try {
    const { orgId } = await requireOrgPermission("edit_draft");
    const { fn, path } = await params;
    await assertOrgOwnsFunction(orgId, fn);
    const fromPath = joinPath(path);
    const body = (await req.json().catch(() => null)) as
      | {
          rename?: { toPath: string };
          replace?: { contentText?: string; contentBase64?: string; mime?: string };
        }
      | null;
    if (!body) return Response.json({ error: "invalid_body" }, { status: 400 });
    if (body.rename) {
      const summary = await renameFunctionAsset({
        fnId: fn,
        fromPath,
        toPath: body.rename.toPath,
      });
      return Response.json({
        asset: {
          id: summary.id,
          path: summary.path,
          kind: summary.kind,
          mime: summary.mime,
          sizeBytes: summary.sizeBytes,
          sha256: summary.sha256,
          updatedAt: summary.updatedAt.toISOString(),
        },
      });
    }
    if (body.replace) {
      const existing = await getFunctionAssetBlob({ fnId: fn, path: fromPath });
      let buf: Buffer;
      if (typeof body.replace.contentText === "string") {
        buf = Buffer.from(body.replace.contentText, "utf8");
      } else if (typeof body.replace.contentBase64 === "string") {
        buf = Buffer.from(body.replace.contentBase64, "base64");
      } else {
        return Response.json({ error: "missing_content" }, { status: 400 });
      }
      const result = await upsertFunctionAsset({
        fnId: fn,
        path: fromPath,
        mime: body.replace.mime ?? existing?.mime ?? "application/octet-stream",
        content: buf,
      });
      return Response.json({
        asset: {
          id: result.asset.id,
          path: result.asset.path,
          kind: result.asset.kind,
          mime: result.asset.mime,
          sizeBytes: result.asset.sizeBytes,
          sha256: result.asset.sha256,
          updatedAt: result.asset.updatedAt.toISOString(),
        },
      });
    }
    return Response.json({ error: "invalid_body" }, { status: 400 });
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ fn: string; path: string[] }> },
) {
  try {
    const { orgId } = await requireOrgPermission("edit_draft");
    const { fn, path } = await params;
    await assertOrgOwnsFunction(orgId, fn);
    await deleteFunctionAsset({ fnId: fn, path: joinPath(path) });
    return Response.json({ ok: true });
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
