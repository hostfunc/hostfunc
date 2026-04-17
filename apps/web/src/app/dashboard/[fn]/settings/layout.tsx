import { SettingsLayout, type SettingsNavItem } from "@/components/settings/settings-layout";
import { requireActiveOrg } from "@/lib/session";
import { getFunctionForOrg } from "@/server/functions";
import { notFound } from "next/navigation";

export default async function FunctionSettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ fn: string }>;
}) {
  const { orgId } = await requireActiveOrg();
  const { fn } = await params;
  const functionRecord = await getFunctionForOrg(orgId, fn);
  if (!functionRecord) notFound();

  const fnNavItems = [
    {
      title: "General",
      href: `/dashboard/${fn}/settings`,
      icon: "settings",
    },
    {
      title: "Environment Variables",
      href: `/dashboard/${fn}/settings/secrets`,
      icon: "keyRound",
    },
    {
      title: "Triggers",
      href: `/dashboard/${fn}/settings/triggers`,
      icon: "zap",
    },
    {
      title: "Packages",
      href: `/dashboard/${fn}/settings/packages`,
      icon: "blocks",
    },
    {
      title: "Executions",
      href: `/dashboard/${fn}/settings/executions`,
      icon: "activity",
    },
    {
      title: "Lineage",
      href: `/dashboard/${fn}/settings/lineage`,
      icon: "gitBranch",
    },
  ] satisfies SettingsNavItem[];

  return (
    <div className="w-full">
      <SettingsLayout
        title="Function Settings"
        description={`Manage configuration, secrets, and events for function: ${functionRecord.slug}`}
        navItems={fnNavItems}
        backHref={`/dashboard/${fn}`}
        backLabel="Back to Function"
      >
        {children}
      </SettingsLayout>
    </div>
  );
}
