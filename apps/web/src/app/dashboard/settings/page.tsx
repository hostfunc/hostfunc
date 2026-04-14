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
        <h3 className="text-lg font-medium">General</h3>
        <p className="text-sm text-muted-foreground">
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
          <div className="grid gap-2 max-w-6xl">
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
          <div className="grid gap-2 max-w-6xl">
            <Label htmlFor="orgSlug" className="sr-only">
              Slug
            </Label>
            <div className="flex items-center rounded-md border border-input shadow-sm focus-within:ring-1 focus-within:ring-ring">
              <span className="pl-3 text-sm text-muted-foreground border-r pr-3 py-2 bg-muted rounded-l-md">
                hostfunc.com/
              </span>
              <Input
                id="orgSlug"
                defaultValue={org?.slug ?? ""}
                className="border-0 shadow-none focus-visible:ring-0 rounded-l-none"
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
