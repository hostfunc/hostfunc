import { requireOrgPermission } from "@/lib/session";
import { AssetError, type UpsertResult, upsertFunctionAsset } from "@/server/fn-assets";
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ fn: string }> }) {
  try {
    const { orgId } = await requireOrgPermission("edit_draft");
    const { fn } = await params;
    await assertOrgOwnsFunction(orgId, fn);

    const contentType = req.headers.get("content-type") || "";
    const results: UpsertResult[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const files = form.getAll("files");
      const pathOverride = form.get("path");
      if (files.length === 0) {
        return Response.json({ error: "missing_files" }, { status: 400 });
      }
      for (const item of files) {
        if (!(item instanceof File)) continue;
        const buf = Buffer.from(await item.arrayBuffer());
        const targetPath =
          typeof pathOverride === "string" && pathOverride.length > 0 && files.length === 1
            ? pathOverride
            : item.name;
        const result = await upsertFunctionAsset({
          fnId: fn,
          path: targetPath,
          mime: item.type || "application/octet-stream",
          content: buf,
        });
        results.push(result);
      }
    } else if (contentType.includes("application/json")) {
      const body = (await req.json().catch(() => null)) as {
        path?: string;
        mime?: string;
        contentBase64?: string;
        contentText?: string;
      } | null;
      if (!body || !body.path) {
        return Response.json({ error: "invalid_body" }, { status: 400 });
      }
      let buf: Buffer;
      if (typeof body.contentBase64 === "string") {
        buf = Buffer.from(body.contentBase64, "base64");
      } else if (typeof body.contentText === "string") {
        buf = Buffer.from(body.contentText, "utf8");
      } else {
        return Response.json({ error: "missing_content" }, { status: 400 });
      }
      const result = await upsertFunctionAsset({
        fnId: fn,
        path: body.path,
        mime: body.mime ?? "application/octet-stream",
        content: buf,
      });
      results.push(result);
    } else {
      return Response.json({ error: "unsupported_content_type" }, { status: 415 });
    }

    return Response.json({
      assets: results.map(({ asset, created }) => ({
        id: asset.id,
        path: asset.path,
        kind: asset.kind,
        mime: asset.mime,
        sizeBytes: asset.sizeBytes,
        sha256: asset.sha256,
        updatedAt: asset.updatedAt.toISOString(),
        created,
      })),
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
