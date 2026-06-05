import { createApiToken } from "@/server/api-tokens";
import { requireCliActor } from "@/server/cli-auth";
import { db, schema } from "@hostfunc/db";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/** Lists every organization the authenticated user belongs to (for the extension's org switcher). */
export async function GET(req: NextRequest) {
  const actor = await requireCliActor(req.headers.get("authorization"));
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });

  const orgs = await db
    .select({
      orgId: schema.member.organizationId,
      role: schema.member.role,
      orgName: schema.organization.name,
      orgSlug: schema.organization.slug,
    })
    .from(schema.member)
    .innerJoin(schema.organization, eq(schema.organization.id, schema.member.organizationId))
    .where(eq(schema.member.userId, actor.userId));

  return Response.json({ ok: true, orgs });
}

/**
 * Mints a fresh PAT scoped to another org the user belongs to. Authenticated with an existing PAT,
 * so the extension can switch orgs without keeping a long-lived session around.
 */
export async function POST(req: NextRequest) {
  const actor = await requireCliActor(req.headers.get("authorization"));
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { orgId?: string; deviceName?: string };
  if (!body.orgId) return Response.json({ error: "invalid_body" }, { status: 400 });

  const rows = await db
    .select({
      orgId: schema.member.organizationId,
      orgName: schema.organization.name,
      orgSlug: schema.organization.slug,
    })
    .from(schema.member)
    .innerJoin(schema.organization, eq(schema.organization.id, schema.member.organizationId))
    .where(eq(schema.member.userId, actor.userId));

  const org = rows.find((r) => r.orgId === body.orgId);
  if (!org) return Response.json({ error: "no_org_membership" }, { status: 403 });

  const tokenName = body.deviceName ? `VS Code — ${body.deviceName}` : "VS Code";
  const { token } = await createApiToken({
    orgId: org.orgId,
    userId: actor.userId,
    name: tokenName,
  });

  return Response.json({
    ok: true,
    token,
    orgId: org.orgId,
    orgSlug: org.orgSlug,
    orgName: org.orgName,
    userId: actor.userId,
  });
}
