import { requireOrgPermission } from "@/lib/session";
import { getGithubInstallationStatus } from "@/server/github-integrations";

export const runtime = "nodejs";

export async function GET() {
  const { orgId } = await requireOrgPermission("view_workspace");
  const github = await getGithubInstallationStatus(orgId);
  return Response.json({ connected: github.connected });
}
