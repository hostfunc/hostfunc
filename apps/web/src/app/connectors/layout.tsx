import { pageMetadata } from "@/lib/seo";
import type { ReactNode } from "react";

export const metadata = pageMetadata({
  title: "Connectors",
  description:
    "One-click OAuth connectors for hostfunc functions — GitHub today, with Gmail, Slack, Linear, Notion, and Stripe on the way.",
  path: "/connectors",
});

export default function ConnectorsLayout({ children }: { children: ReactNode }) {
  return children;
}
