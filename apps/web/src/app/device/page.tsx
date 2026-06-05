import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { DeviceApproval } from "./device-approval";

export const metadata = {
  title: "Authorize device · hostfunc",
};

export default async function DevicePage({
  searchParams,
}: {
  searchParams: Promise<{ user_code?: string }>;
}) {
  const { user_code } = await searchParams;
  const session = await getSession();

  if (!session) {
    const target = user_code ? `/device?user_code=${encodeURIComponent(user_code)}` : "/device";
    redirect(`/login?from=${encodeURIComponent(target)}`);
  }

  return <DeviceApproval initialCode={user_code ?? ""} userEmail={session.user.email} />;
}
