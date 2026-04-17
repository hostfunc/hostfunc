import { authenticateCallback } from "@/server/exec-registry";
import { authenticateApiToken } from "@/server/api-tokens";
import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return Response.json({ error: "missing_token" }, { status: 401 });

  const verifiedCallback = await authenticateCallback(token);
  const verifiedApiToken = verifiedCallback ? null : await authenticateApiToken(token);
  if (!verifiedCallback && !verifiedApiToken) {
    return Response.json({ error: "invalid_token" }, { status: 401 });
  }

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return Response.json({ error: "missing_slug" }, { status: 400 });

  const slash = slug.indexOf("/");
  if (slash < 1 || slash === slug.length - 1) {
    return Response.json({ error: "invalid_slug" }, { status: 400 });
  }
  const orgSlug = slug.slice(0, slash);
  const fnSlug = slug.slice(slash + 1);

  const rows = await db
    .select({ id: schema.fn.id, orgId: schema.fn.orgId })
    .from(schema.fn)
    .innerJoin(schema.organization, eq(schema.organization.id, schema.fn.orgId))
    .where(and(eq(schema.organization.slug, orgSlug), eq(schema.fn.slug, fnSlug)))
    .limit(1);

  const row = rows[0];
  if (!row) return Response.json({ fnId: null });

  // Caller must be in the same org as the target function. Anything else is
  // cross-org — resolve should not leak the existence of the target.
  const callerOrgId = verifiedCallback?.payload.orgId ?? verifiedApiToken?.orgId ?? null;
  if (!callerOrgId || row.orgId !== callerOrgId) {
    return Response.json({ fnId: null });
  }

  return Response.json({ fnId: row.id });
}
