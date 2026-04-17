"use server";

import { env } from "@/lib/env";
import { requireOrgPermission } from "@/lib/session";
import { sendTransactionalEmail } from "@/server/email";
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
    subject: `Invitation to join ${invitation.orgName} on hostfunc`,
    html: `
      <p>You have been invited to join <strong>${invitation.orgName}</strong> as <strong>${invitation.role}</strong>.</p>
      <p><a href="${acceptUrl}">Accept invitation</a></p>
      <p>This invitation expires on ${invitation.expiresAt.toUTCString()}.</p>
    `,
    text: [
      `You have been invited to join ${invitation.orgName} as ${invitation.role}.`,
      `Accept invitation: ${acceptUrl}`,
      `Invitation expires: ${invitation.expiresAt.toUTCString()}`,
    ].join("\n"),
  });

  return { ok: true };
}
