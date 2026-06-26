import { PasskeyAutoEnroll } from "@/components/auth/passkey-auto-enroll";
import { auth } from "@/lib/auth";
import { getGithubConsentState, requireActiveOrg, requireSession } from "@/lib/session";
import { getSetupState } from "@/server/setup-state";
import { db, schema } from "@hostfunc/db";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { DashboardNavbar } from "./navbar";

/** Session and org context must never be served from a static shell (avoids stale RSC on reload). */
export const dynamic = "force-dynamic";

/** The authenticated app is private; keep it out of search indexes. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const setup = getSetupState();
  if (!setup.complete) {
    redirect("/setup");
  }
  const [{ orgId }, baseSession] = await Promise.all([requireActiveOrg(), requireSession()]);
  // Drives silent passkey auto-enrollment after first sign-in (no button — industry standard).
  // Resilient to the `passkey` table not existing yet (migration lag during a deploy): on any
  // failure we treat the user as already enrolled so the dashboard never breaks and we don't prompt.
  let hasPasskey = true;
  try {
    const existingPasskeys = await auth.api.listPasskeys({ headers: await headers() });
    hasPasskey = existingPasskeys.length > 0;
  } catch (error) {
    console.warn("Passkey lookup failed (skipping auto-enroll)", error);
  }
  const githubConsent = await getGithubConsentState();
  if (
    githubConsent.isGithubAuthUser &&
    !githubConsent.hasGithubInstallationForActiveOrg &&
    !githubConsent.hasSkippedGithubOnboarding
  ) {
    redirect("/onboarding/github");
  }
  const memberships = await db
    .select({
      organizationId: schema.organization.id,
      role: schema.member.role,
      organization: {
        id: schema.organization.id,
        name: schema.organization.name,
        slug: schema.organization.slug,
        logo: schema.organization.logo,
      },
    })
    .from(schema.member)
    .innerJoin(schema.organization, eq(schema.organization.id, schema.member.organizationId))
    .where(eq(schema.member.userId, baseSession.user.id));

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
    logo: membership.organization.logo,
    role: membership.role,
    ownerName: ownerByOrgId.get(membership.organizationId) ?? membership.organization.name,
    isShared: membership.role !== "owner",
  }));

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[var(--color-ink)] text-[var(--color-bone)]">
      <div className="gradient-radial-amber pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-70" />
      <PasskeyAutoEnroll hasPasskey={hasPasskey} />
      <DashboardNavbar
        user={baseSession.user}
        organizations={organizations}
        activeOrganizationId={orgId}
      />
      <main className="relative mx-auto max-w-screen-2xl px-6 py-8">
        {/* <UsageStatusBar
          planName={usage.planName}
          executionsToday={usage.usage.executionsToday}
          maxExecutionsPerDay={usage.usage.maxExecutionsPerDay}
          alerts={usage.alerts}
          errorRateLast24h={0}
        /> */}
        {children}
      </main>
    </div>
  );
}
