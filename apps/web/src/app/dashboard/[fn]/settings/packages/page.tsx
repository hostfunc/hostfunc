import { requireActiveOrg } from "@/lib/session";
import { listFunctionPackages } from "@/app/dashboard/[fn]/actions";
import { PackagesClient } from "./packages-client";

export default async function PackagesFunctionSettingsPage({
  params,
}: {
  params: Promise<{ fn: string }>;
}) {
  const { fn } = await params;
  await requireActiveOrg();
  const packages = await listFunctionPackages(fn);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-[var(--color-bone)]">Packages</h3>
        <p className="text-sm text-[var(--color-bone-muted)]">
          External npm packages are auto-added from imports when you save in the editor.
        </p>
      </div>
      <PackagesClient fnId={fn} initialPackages={packages} />
    </div>
  );
}
