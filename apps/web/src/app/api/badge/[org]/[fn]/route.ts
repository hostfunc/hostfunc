import { formatBadge, renderBadgeSvg } from "@/server/badge";
import { db, schema } from "@hostfunc/db";
import { and, eq, gte, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * Public SVG status badge for a public function:
 * success rate + p95 wall time over the last 24 hours.
 * Embeddable in READMEs: ![status](https://<control-plane>/api/badge/<org>/<fn>)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ org: string; fn: string }> },
) {
  const { org, fn } = await params;

  const rows = await db
    .select({ fnId: schema.fn.id, visibility: schema.fn.visibility })
    .from(schema.fn)
    .innerJoin(schema.organization, eq(schema.organization.id, schema.fn.orgId))
    .where(and(eq(schema.organization.slug, org), eq(schema.fn.slug, fn)))
    .limit(1);

  const row = rows[0];
  // Private functions 404 rather than 403 to avoid confirming they exist.
  if (!row || row.visibility !== "public") {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const stats = await db
    .select({
      total: sql<number>`count(*)::int`,
      errors: sql<number>`count(*) filter (where ${schema.execution.status} != 'ok')::int`,
      p95WallMs: sql<number>`coalesce(percentile_cont(0.95) within group (order by ${schema.execution.wallMs}), 0)::int`,
    })
    .from(schema.execution)
    .where(
      and(
        eq(schema.execution.fnId, row.fnId),
        gte(schema.execution.startedAt, sql`now() - interval '24 hours'`),
      ),
    );

  const badge = formatBadge({
    total: stats[0]?.total ?? 0,
    errors: stats[0]?.errors ?? 0,
    p95WallMs: stats[0]?.p95WallMs ?? 0,
  });

  return new Response(renderBadgeSvg(badge), {
    status: 200,
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
