import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { PasskeysCard } from "./passkeys-client";

export const metadata = {
  title: "Security",
};

export default async function SecurityPage() {
  // List the signed-in user's passkeys server-side; mutations happen on the client (WebAuthn needs
  // the browser), which calls router.refresh() to re-run this fetch.
  const passkeys = await auth.api.listPasskeys({ headers: await headers() });

  const initial = passkeys.map((p) => ({
    id: p.id,
    name: p.name ?? null,
    deviceType: p.deviceType,
    createdAt: p.createdAt.toISOString(),
  }));

  return <PasskeysCard initialPasskeys={initial} />;
}
