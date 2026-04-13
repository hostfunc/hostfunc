import { authenticateCallback } from "@/server/exec-registry";
import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return Response.json({ error: "missing_token" }, { status: 401 });

  const verified = await authenticateCallback(token);
  if (!verified) return Response.json({ error: "invalid_token" }, { status: 401 });

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return Response.json({ error: "missing_slug" }, { status: 400 });
  const [owner, fnSlug] = slug.split("/");
  if (!owner || !fnSlug) return Response.json({ error: "invalid_slug" }, { status: 400 });

  const rows = await db
    .select({ id: schema.fn.id })
    .from(schema.fn)
    .where(and(eq(schema.fn.createdById, owner), eq(schema.fn.slug, fnSlug)))
    .limit(1);

  return Response.json({ fnId: rows[0]?.id ?? null });
}
