import { SettingsLayout, type SettingsNavItem } from "@/components/settings/settings-layout";
import { requireSession } from "@/lib/session";
import type { ReactNode } from "react";

// User-level account settings, distinct from the org/workspace settings under /dashboard/settings.
const accountNavItems: SettingsNavItem[] = [
  {
    title: "Security",
    href: "/dashboard/account/security",
    icon: "keyRound",
  },
];

export default async function AccountLayout({ children }: { children: ReactNode }) {
  // Gate the whole account section on an authenticated user.
  await requireSession();

  return (
    <SettingsLayout
      navItems={accountNavItems}
      title="Account"
      description="Manage your personal sign-in and security."
      backHref="/dashboard"
      backLabel="Back to dashboard"
    >
      {children}
    </SettingsLayout>
  );
}
