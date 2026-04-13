import { env } from "@/lib/env";
import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.RUNTIME_LOOKUP_TOKEN}`) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const owner = req.nextUrl.searchParams.get("owner");
  const slug = req.nextUrl.searchParams.get("slug");
  if (!owner || !slug) {
    return Response.json({ ok: false, error: "missing_params" }, { status: 400 });
  }

  const rows = await db
    .select({
      fnId: schema.fn.id,
      orgId: schema.fn.orgId,
      visibility: schema.fn.visibility,
      versionId: schema.fnVersion.id,
    })
    .from(schema.fn)
    .leftJoin(schema.fnVersion, eq(schema.fnVersion.id, schema.fn.currentVersionId))
    .where(and(eq(schema.fn.createdById, owner), eq(schema.fn.slug, slug)))
    .limit(1);

  const row = rows[0];
  if (!row || !row.versionId) {
    return Response.json({ ok: false, error: "not_deployed" }, { status: 404 });
  }

  return Response.json({
    ok: true,
    fnId: row.fnId,
    orgId: row.orgId,
    versionId: row.versionId,
    scriptName: scriptNameFor(row.fnId, row.versionId),
    visibility: row.visibility,
  });
}

function scriptNameFor(fnId: string, versionId: string): string {
  const f = fnId.replace(/^fn_/, "").toLowerCase();
  const v = versionId.replace(/^ver_/, "").toLowerCase();
  return `f-${f}-v-${v}`;
}
