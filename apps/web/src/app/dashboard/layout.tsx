import type { ReactNode } from "react";
import { requireSession } from "@/lib/session";
import { DashboardNavbar } from "./navbar";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  return (
    <div className="min-h-dvh">
      <DashboardNavbar user={session.user} />
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}