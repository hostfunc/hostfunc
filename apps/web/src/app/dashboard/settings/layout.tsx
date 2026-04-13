"use client";

import { SettingsLayout } from "@/components/settings/settings-layout";
import { Blocks, Bot, CreditCard, KeyRound, Settings, Users } from "lucide-react";

const orgNavItems = [
  {
    title: "General",
    href: "/dashboard/settings",
    icon: Settings,
  },
  {
    title: "Members",
    href: "/dashboard/settings/members",
    icon: Users,
  },
  {
    title: "Billing",
    href: "/dashboard/settings/billing",
    icon: CreditCard,
  },
  {
    title: "Integrations",
    href: "/dashboard/settings/integrations",
    icon: Blocks,
  },
  {
    title: "API Tokens",
    href: "/dashboard/settings/tokens",
    icon: KeyRound,
  },
  {
    title: "MCP",
    href: "/dashboard/settings/mcp",
    icon: Bot,
  },
];

export default function OrgSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto p-6 md:p-10 max-w-7xl">
      <SettingsLayout
        title="Organization Settings"
        description="Manage your organization's configurations, members, and billing details."
        navItems={orgNavItems}
        backHref="/dashboard"
        backLabel="Back to Dashboard"
      >
        {children}
      </SettingsLayout>
    </div>
  );
}
