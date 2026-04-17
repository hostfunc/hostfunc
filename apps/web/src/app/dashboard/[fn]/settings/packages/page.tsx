import { listFunctionPackages } from "@/app/dashboard/[fn]/actions";
import { hasOrgPermission } from "@/lib/permissions";
import { getActiveMembership, requireActiveOrg } from "@/lib/session";
import { PackageCheck } from "lucide-react";
import { PackagesClient } from "./packages-client";

export default async function PackagesFunctionSettingsPage({
  params,
}: {
  params: Promise<{ fn: string }>;
}) {
  const { fn } = await params;
  await requireActiveOrg();
  const membership = await getActiveMembership();
  const packages = await listFunctionPackages(fn);
  const canManagePackages = hasOrgPermission(membership.role, "manage_packages");

  return (
    <div className="animate-in space-y-10 fade-in duration-500 pb-10">
      <div className="flex flex-col justify-between gap-6 border-b border-[var(--color-border)] pb-6 md:flex-row md:items-center">
        <div>
          <h3 className="flex items-center gap-2 font-display text-4xl tracking-tight text-[var(--color-bone)]">
            Packages <PackageCheck className="h-6 w-6 text-[var(--color-amber)]" />
          </h3>
          <p className="mt-2 max-w-xl leading-relaxed text-[var(--color-bone-muted)]">
            External npm packages are auto-added from imports when you save in the editor.
          </p>
        </div>
      </div>
      <PackagesClient fnId={fn} initialPackages={packages} canManagePackages={canManagePackages} />
    </div>
  );
}
