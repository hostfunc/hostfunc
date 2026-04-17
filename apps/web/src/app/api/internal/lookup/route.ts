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
  if (owner) {
    return Response.json(
      {
        ok: false,
        error: "legacy_lookup_params",
        message: "owner/slug lookup is deprecated. Use org/slug lookup.",
      },
      { status: 410 },
    );
  }

  const org = req.nextUrl.searchParams.get("org");
  const slug = req.nextUrl.searchParams.get("slug");
  if (!org || !slug) {
    return Response.json({ ok: false, error: "missing_params" }, { status: 400 });
  }

  const rows = await db
    .select({
      fnId: schema.fn.id,
      orgId: schema.fn.orgId,
      visibility: schema.fn.visibility,
      versionId: schema.fnVersion.id,
      httpTriggerConfig: schema.trigger.config,
    })
    .from(schema.fn)
    .innerJoin(schema.organization, eq(schema.organization.id, schema.fn.orgId))
    .leftJoin(schema.fnVersion, eq(schema.fnVersion.id, schema.fn.currentVersionId))
    .leftJoin(
      schema.trigger,
      and(eq(schema.trigger.fnId, schema.fn.id), eq(schema.trigger.kind, "http")),
    )
    .where(and(eq(schema.organization.slug, org), eq(schema.fn.slug, slug)))
    .limit(1);

  const row = rows[0];
  if (!row || !row.versionId) {
    return Response.json({ ok: false, error: "not_deployed" }, { status: 404 });
  }

  const httpCfg = row.httpTriggerConfig as { http?: { requireAuth?: boolean } } | null | undefined;
  const httpRequireAuth = httpCfg?.http?.requireAuth ?? true;

  return Response.json({
    ok: true,
    fnId: row.fnId,
    orgId: row.orgId,
    versionId: row.versionId,
    scriptName: scriptNameFor(row.fnId, row.versionId),
    visibility: row.visibility,
    httpRequireAuth,
  });
}

function scriptNameFor(fnId: string, versionId: string): string {
  const f = fnId.replace(/^fn_/, "").toLowerCase();
  const v = versionId.replace(/^ver_/, "").toLowerCase();
  return `f-${f}-v-${v}`;
}
