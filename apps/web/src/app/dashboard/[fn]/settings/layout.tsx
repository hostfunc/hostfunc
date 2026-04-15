"use client";

import { SettingsLayout } from "@/components/settings/settings-layout";
import { Activity, GitBranch, Key, Package, Settings, Zap } from "lucide-react";
import { use } from "react";

export default function FunctionSettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ fn: string }>;
}) {
  const { fn } = use(params);

  const fnNavItems = [
    {
      title: "General",
      href: `/dashboard/${fn}/settings`,
      icon: Settings,
    },
    {
      title: "Environment Variables",
      href: `/dashboard/${fn}/settings/secrets`,
      icon: Key,
    },
    {
      title: "Triggers",
      href: `/dashboard/${fn}/settings/triggers`,
      icon: Zap,
    },
    {
      title: "Packages",
      href: `/dashboard/${fn}/settings/packages`,
      icon: Package,
    },
    {
      title: "Executions",
      href: `/dashboard/${fn}/executions`,
      icon: Activity,
    },
    {
      title: "Lineage",
      href: `/dashboard/${fn}/lineage`,
      icon: GitBranch,
    },
  ];

  return (
    <div className="w-full">
      <SettingsLayout
        title="Function Settings"
        description={`Manage configuration, secrets, and events for function: ${fn}`}
        navItems={fnNavItems}
        backHref={`/dashboard/${fn}`}
        backLabel="Back to Function"
      >
        {children}
      </SettingsLayout>
    </div>
  );
}
