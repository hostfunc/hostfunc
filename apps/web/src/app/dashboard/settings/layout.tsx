import { SettingsLayout, type SettingsNavItem } from "@/components/settings/settings-layout";
import { requireActiveOrg } from "@/lib/session";
import { db, schema } from "@hostfunc/db";
import { eq } from "drizzle-orm";

const orgNavItems: SettingsNavItem[] = [
  {
    title: "General",
    href: "/dashboard/settings",
    icon: "settings",
  },
  {
    title: "Members",
    href: "/dashboard/settings/members",
    icon: "users",
  },
  {
    title: "Billing",
    href: "/dashboard/settings/billing",
    icon: "creditCard",
  },
  {
    title: "Integrations",
    href: "/dashboard/settings/integrations",
    icon: "blocks",
  },
  {
    title: "API Tokens",
    href: "/dashboard/settings/tokens",
    icon: "keyRound",
  },
  {
    title: "MCP",
    href: "/dashboard/settings/mcp",
    icon: "bot",
  },
];

export default function OrgSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OrgSettingsLayoutInner>{children}</OrgSettingsLayoutInner>;
}

async function OrgSettingsLayoutInner({ children }: { children: React.ReactNode }) {
  const { orgId } = await requireActiveOrg();
  const org = await db.query.organization.findFirst({
    where: eq(schema.organization.id, orgId),
    columns: { name: true, slug: true },
  });
  const orgLabel = org?.name ?? "Organization";

  return (
    <div className="container mx-auto p-6 md:p-10 max-w-6xl">
      <SettingsLayout
        title={`${orgLabel} Settings`}
        description={`Manage ${org?.slug ?? "your organization"} configuration, members, and billing details.`}
        navItems={orgNavItems}
        backHref="/dashboard"
        backLabel="Back to Dashboard"
      >
        {children}
      </SettingsLayout>
    </div>
  );
}
