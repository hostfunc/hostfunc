import { requireCliActor } from "@/server/cli-auth";
import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const actor = await requireCliActor(req.headers.get("authorization"));
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });

  const memberships = await db
    .select({
      orgId: schema.member.organizationId,
      role: schema.member.role,
      orgName: schema.organization.name,
      orgSlug: schema.organization.slug,
    })
    .from(schema.member)
    .innerJoin(schema.organization, eq(schema.organization.id, schema.member.organizationId))
    .where(and(eq(schema.member.userId, actor.userId), eq(schema.member.organizationId, actor.orgId)));

  return Response.json({
    ok: true,
    actor: { tokenId: actor.tokenId, orgId: actor.orgId, userId: actor.userId, name: actor.name },
    membership: memberships[0] ?? null,
  });
}
