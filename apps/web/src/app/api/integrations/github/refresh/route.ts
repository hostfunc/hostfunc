import { requireOrgPermission } from "@/lib/session";
import { refreshGithubReposForOrg } from "@/server/github-integrations";

export const runtime = "nodejs";

export async function POST() {
  const { orgId } = await requireOrgPermission("manage_workspace_settings");
  try {
    const syncedCount = await refreshGithubReposForOrg(orgId);
    return Response.json({ ok: true, syncedCount });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "github_refresh_failed" },
      { status: 400 },
    );
  }
}
