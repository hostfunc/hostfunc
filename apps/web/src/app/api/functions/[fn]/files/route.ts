import { requireOrgPermission } from "@/lib/session";
import { AssetError, listFunctionAssets } from "@/server/fn-assets";
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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ fn: string }> }) {
  try {
    const { orgId } = await requireOrgPermission("view_workspace");
    const { fn } = await params;
    await assertOrgOwnsFunction(orgId, fn);
    const assets = await listFunctionAssets(fn);
    return Response.json({
      assets: assets.map((row) => ({
        id: row.id,
        path: row.path,
        kind: row.kind,
        mime: row.mime,
        sizeBytes: row.sizeBytes,
        sha256: row.sha256,
        updatedAt: row.updatedAt.toISOString(),
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
