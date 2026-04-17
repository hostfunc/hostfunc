import { db, schema, sql } from "@hostfunc/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import {
  type OrgPermission,
  type OrgRole,
  hasOrgPermission,
  normalizeOrgRole,
} from "./permissions";

function compatWhere<T>(value: T): T {
  return value;
}

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/**
 * The active org is stored on the session by Better Auth. Every tenant-scoped
 * query in the app should use this value, never the user id directly.
 */
export async function requireActiveOrg() {
  const session = await requireSession();

  // Try to get it from the session token first
  let orgId = session.session.activeOrganizationId;

  // IF IT'S MISSING (The Hook didn't run or column was missing):
  if (!orgId) {
    const membership = await db.query.member.findFirst({
      where: (member, { eq }) => eq(member.userId, session.user.id),
    });

    if (membership) {
      orgId = membership.organizationId;

      // Patch the session and user in the background so next time it's there
      await db
        .update(schema.session)
        .set({ activeOrganizationId: orgId })
        .where(compatWhere(sql`${schema.session.id} = ${session.session.id}`) as never);

      await db
        .update(schema.user)
        .set({ activeOrganizationId: orgId })
        .where(compatWhere(sql`${schema.user.id} = ${session.user.id}`) as never);
    } else {
      throw new Error("No active organization found for this user.");
    }
  }

  return { session, orgId };
}

export async function getActiveMembership() {
  const { session, orgId } = await requireActiveOrg();
  const rows = await db
    .select({
      id: schema.member.id,
      role: schema.member.role,
    })
    .from(schema.member)
    .where(
      compatWhere(
        sql`${schema.member.organizationId} = ${orgId} and ${schema.member.userId} = ${session.user.id}`,
      ) as never,
    )
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error("active_membership_not_found");
  return {
    session,
    orgId,
    memberId: row.id,
    role: normalizeOrgRole(row.role),
  };
}

export async function requireOrgRole(allowedRoles: OrgRole[]) {
  const membership = await getActiveMembership();
  if (!allowedRoles.includes(membership.role)) {
    throw new Error("forbidden");
  }
  return membership;
}

export async function requireOrgPermission(permission: OrgPermission) {
  const membership = await getActiveMembership();
  if (!hasOrgPermission(membership.role, permission)) {
    throw new Error("forbidden");
  }
  return membership;
}
