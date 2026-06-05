import { auth } from "@/lib/auth";
import { createApiToken } from "@/server/api-tokens";
import { db, schema } from "@hostfunc/db";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * Exchanges a device-flow-approved better-auth session for an org-scoped `hfn_live_` PAT.
 *
 * The VS Code extension calls this immediately after the RFC 8628 `/device/token` poll succeeds,
 * presenting the session via `Authorization: Bearer <sessionToken>` (better-auth `bearer` plugin).
 * Org-switching afterwards goes through `POST /api/cli/orgs` (PAT-authenticated) so no session
 * needs to be retained client-side.
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { orgId?: string; deviceName?: string };
  const userId = session.user.id;

  // Resolve the target org: an explicit (membership-verified) choice, else the session's active org.
  const targetOrgId = body.orgId ?? session.session.activeOrganizationId ?? null;

  const memberships = await db
    .select({
      orgId: schema.member.organizationId,
      orgName: schema.organization.name,
      orgSlug: schema.organization.slug,
    })
    .from(schema.member)
    .innerJoin(schema.organization, eq(schema.organization.id, schema.member.organizationId))
    .where(eq(schema.member.userId, userId));

  const org = targetOrgId ? memberships.find((m) => m.orgId === targetOrgId) : memberships[0];
  if (!org) return Response.json({ error: "no_org_membership" }, { status: 403 });

  const tokenName = body.deviceName ? `VS Code — ${body.deviceName}` : "VS Code";
  const { token } = await createApiToken({ orgId: org.orgId, userId, name: tokenName });

  return Response.json({
    ok: true,
    token,
    orgId: org.orgId,
    orgSlug: org.orgSlug,
    orgName: org.orgName,
    userId,
  });
}
