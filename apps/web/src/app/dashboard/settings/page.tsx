import { requireActiveOrg } from "@/lib/session";
import { db, schema } from "@hostfunc/db";
import { eq } from "drizzle-orm";
import { GeneralSettingsClient } from "./general-settings-client";
import { WorkspaceLogoCard } from "./workspace-logo-card";

export default async function GeneralOrgSettingsPage() {
  const { orgId } = await requireActiveOrg();
  const org = await db.query.organization.findFirst({
    where: eq(schema.organization.id, orgId),
    columns: { name: true, slug: true, logo: true },
  });

  return (
    <div className="animate-in space-y-10 fade-in duration-500 pb-10">
      <div className="flex flex-col justify-between gap-6 border-b border-[var(--color-border)] pb-6 md:flex-row md:items-center">
        <div>
          <h3 className="flex items-center gap-2 font-display text-4xl tracking-tight text-[var(--color-bone)]">
            General Settings
          </h3>
          <p className="mt-2 max-w-xl leading-relaxed text-[var(--color-bone-muted)]">
            Update workspace identity details used throughout your dashboard, links, and user-facing
            surfaces.
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h4 className="text-lg font-semibold text-[var(--color-bone)]">Workspace Identity</h4>
        </div>
        <GeneralSettingsClient initialName={org?.name ?? ""} initialSlug={org?.slug ?? ""} />
        <WorkspaceLogoCard initialLogo={org?.logo ?? null} />
      </section>
    </div>
  );
}
