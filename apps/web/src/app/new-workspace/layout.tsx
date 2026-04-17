import { requireActiveOrg, requireSession } from "@/lib/session";
import { db, schema } from "@hostfunc/db";
import { eq } from "drizzle-orm";
import type { ReactNode } from "react";
import { DashboardNavbar } from "../dashboard/navbar";

export default async function NewWorkspaceLayout({ children }: { children: ReactNode }) {
  const [{ orgId }, session] = await Promise.all([requireActiveOrg(), requireSession()]);
  const memberships = await db
    .select({
      organizationId: schema.organization.id,
      role: schema.member.role,
      organization: {
        id: schema.organization.id,
        name: schema.organization.name,
        slug: schema.organization.slug,
      },
    })
    .from(schema.member)
    .innerJoin(schema.organization, eq(schema.organization.id, schema.member.organizationId))
    .where(eq(schema.member.userId, session.user.id));

  const ownerRows = await db
    .select({
      organizationId: schema.member.organizationId,
      ownerName: schema.user.name,
      ownerEmail: schema.user.email,
    })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
    .where(eq(schema.member.role, "owner"));

  const ownerByOrgId = new Map(
    ownerRows.map((row) => [
      row.organizationId,
      row.ownerName?.trim() || row.ownerEmail?.split("@")[0] || "Workspace owner",
    ]),
  );

  const organizations = memberships.map((membership) => ({
    id: membership.organization.id,
    name: membership.organization.name,
    slug: membership.organization.slug,
    role: membership.role,
    ownerName: ownerByOrgId.get(membership.organizationId) ?? membership.organization.name,
    isShared: membership.role !== "owner",
  }));

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[var(--color-ink)] text-[var(--color-bone)]">
      <div className="gradient-radial-amber pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-70" />
      <div className="border-grid pointer-events-none absolute inset-0 opacity-30" />
      <DashboardNavbar
        user={session.user}
        organizations={organizations}
        activeOrganizationId={orgId}
      />
      <main className="relative mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
