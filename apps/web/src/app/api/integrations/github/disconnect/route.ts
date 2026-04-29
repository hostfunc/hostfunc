import { requireOrgPermission } from "@/lib/session";
import { disconnectGithubForOrg } from "@/server/github-integrations";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

export async function POST() {
  const { orgId, session } = await requireOrgPermission("manage_workspace_settings");
  await disconnectGithubForOrg({ orgId, userId: session.user.id });
  revalidatePath("/dashboard/settings/integrations");
  return Response.json({ ok: true });
}
