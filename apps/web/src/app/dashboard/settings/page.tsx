import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardDescription,
  SettingsCardFooter,
  SettingsCardHeader,
  SettingsCardTitle,
} from "@/components/settings/settings-card";
import { requireActiveOrg } from "@/lib/session";
import { db, schema } from "@hostfunc/db";
import { Button } from "@/components/ui/button";
import { eq } from "drizzle-orm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function GeneralOrgSettingsPage() {
  const { orgId } = await requireActiveOrg();
  const org = await db.query.organization.findFirst({
    where: eq(schema.organization.id, orgId),
    columns: { name: true, slug: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-[var(--color-bone)]">General</h3>
        <p className="text-sm text-[var(--color-bone-muted)]">
          Update your organization's display name and primary identifier.
        </p>
      </div>

      <SettingsCard>
        <SettingsCardHeader>
          <SettingsCardTitle>Organization Name</SettingsCardTitle>
          <SettingsCardDescription>
            This is your organization's displayed name across the platform.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent>
          <div className="grid max-w-6xl gap-2">
            <Label htmlFor="orgName" className="sr-only">
              Name
            </Label>
            <Input id="orgName" defaultValue={org?.name ?? ""} />
          </div>
        </SettingsCardContent>
        <SettingsCardFooter className="justify-end">
          <Button>Save Name</Button>
        </SettingsCardFooter>
      </SettingsCard>

      <SettingsCard>
        <SettingsCardHeader>
          <SettingsCardTitle>Organization Slug</SettingsCardTitle>
          <SettingsCardDescription>
            Used in URLs to identify your organization. Once changed, old links will break.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent>
          <div className="grid max-w-6xl gap-2">
            <Label htmlFor="orgSlug" className="sr-only">
              Slug
            </Label>
            <div className="flex items-center rounded-md border border-[var(--color-border)] shadow-sm focus-within:ring-1 focus-within:ring-[var(--color-amber)]">
              <span className="rounded-l-md border-r border-[var(--color-border)] bg-white/[0.04] px-3 py-2 text-sm text-[var(--color-bone-faint)]">
                hostfunc.com/
              </span>
              <Input
                id="orgSlug"
                defaultValue={org?.slug ?? ""}
                className="rounded-l-none border-0 bg-transparent text-[var(--color-bone)] shadow-none focus-visible:ring-0"
              />
            </div>
          </div>
        </SettingsCardContent>
        <SettingsCardFooter className="justify-end">
          <Button variant="destructive">Update Slug</Button>
        </SettingsCardFooter>
      </SettingsCard>
    </div>
  );
}
