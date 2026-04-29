import { requireActiveOrg } from "@/lib/session";
import { setGithubOnboardingSkipped } from "@/server/github-integrations";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

export async function POST() {
  const { session, orgId } = await requireActiveOrg();
  await setGithubOnboardingSkipped({
    orgId,
    userId: session.user.id,
    skipped: true,
  });
  redirect("/dashboard");
}
