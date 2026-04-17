"use server";

import { db, schema, sql } from "@hostfunc/db";
import { and, desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";

function compatWhere<T>(value: T): T {
  return value;
}

export async function switchActiveOrganization(orgId: string) {
  const session = await requireSession();

  const membership = await db.query.member.findFirst({
    where: and(eq(schema.member.userId, session.user.id), eq(schema.member.organizationId, orgId)),
  });

  if (!membership) {
    throw new Error("You do not have access to this workspace.");
  }

  await db
    .update(schema.session)
    .set({ activeOrganizationId: orgId })
    .where(compatWhere(sql`${schema.session.id} = ${session.session.id}`) as never);

  await db
    .update(schema.user)
    .set({ activeOrganizationId: orgId })
    .where(compatWhere(sql`${schema.user.id} = ${session.user.id}`) as never);
}

export async function getWorkspaceAccessRecoveryContext() {
  const session = await requireSession();
  const activeOrgId = session.session.activeOrganizationId ?? null;
  if (!activeOrgId) {
    return {
      orgId: null,
      orgName: null,
      orgSlug: null,
      ownerName: null,
      ownerEmail: null,
    };
  }

  const [org] = await db
    .select({
      id: schema.organization.id,
      name: schema.organization.name,
      slug: schema.organization.slug,
    })
    .from(schema.organization)
    .where(eq(schema.organization.id, activeOrgId))
    .limit(1);

  const [owner] = await db
    .select({
      ownerName: schema.user.name,
      ownerEmail: schema.user.email,
    })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
    .where(and(eq(schema.member.organizationId, activeOrgId), eq(schema.member.role, "owner")))
    .limit(1);

  return {
    orgId: org?.id ?? null,
    orgName: org?.name ?? null,
    orgSlug: org?.slug ?? null,
    ownerName: owner?.ownerName ?? null,
    ownerEmail: owner?.ownerEmail ?? null,
  };
}

export async function leaveCurrentWorkspaceAction() {
  const session = await requireSession();
  const activeOrgId = session.session.activeOrganizationId ?? null;
  if (!activeOrgId) {
    throw new Error("no_active_workspace");
  }

  const currentMembership = await db.query.member.findFirst({
    where: and(eq(schema.member.userId, session.user.id), eq(schema.member.organizationId, activeOrgId)),
  });

  if (currentMembership) {
    if (currentMembership.role === "owner") {
      throw new Error("owner_cannot_leave");
    }
    await db
      .delete(schema.member)
      .where(and(eq(schema.member.userId, session.user.id), eq(schema.member.organizationId, activeOrgId)));
  }

  const nextMembership = await db.query.member.findFirst({
    where: eq(schema.member.userId, session.user.id),
    orderBy: desc(schema.member.createdAt),
  });
  const nextOrgId = nextMembership?.organizationId ?? null;

  await db
    .update(schema.session)
    .set({ activeOrganizationId: nextOrgId })
    .where(compatWhere(sql`${schema.session.id} = ${session.session.id}`) as never);

  await db
    .update(schema.user)
    .set({ activeOrganizationId: nextOrgId })
    .where(compatWhere(sql`${schema.user.id} = ${session.user.id}`) as never);

  return {
    ok: true as const,
    redirectTo: nextOrgId ? "/dashboard" : "/new-workspace",
  };
}
