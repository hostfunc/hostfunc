"use server";

import { env } from "@/lib/env";
import { requireOrgPermission } from "@/lib/session";
import { sendTransactionalEmail } from "@/server/email";
import { orgInviteResendEmail } from "@/server/email-templates";
import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";

export async function resendInvitationEmail(invitationId: string) {
  const { orgId } = await requireOrgPermission("manage_members");

  const rows = await db
    .select({
      id: schema.invitation.id,
      email: schema.invitation.email,
      role: schema.invitation.role,
      status: schema.invitation.status,
      expiresAt: schema.invitation.expiresAt,
      orgName: schema.organization.name,
      orgSlug: schema.organization.slug,
    })
    .from(schema.invitation)
    .innerJoin(schema.organization, eq(schema.organization.id, schema.invitation.organizationId))
    .where(and(eq(schema.invitation.id, invitationId), eq(schema.invitation.organizationId, orgId)))
    .limit(1);

  const invitation = rows[0];
  if (!invitation) throw new Error("invitation_not_found");
  if (invitation.status !== "pending") throw new Error("invitation_not_pending");
  if (invitation.expiresAt.getTime() <= Date.now()) throw new Error("invitation_expired");

  const acceptUrl = `${env.BETTER_AUTH_URL}/join?invitationId=${encodeURIComponent(invitation.id)}`;
  await sendTransactionalEmail({
    to: invitation.email,
    ...orgInviteResendEmail({
      orgName: invitation.orgName,
      role: invitation.role,
      acceptUrl,
      expiresAt: invitation.expiresAt,
    }),
  });

  return { ok: true };
}
