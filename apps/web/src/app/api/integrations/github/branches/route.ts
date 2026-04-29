import { requireOrgPermission } from "@/lib/session";
import { listGithubBranchesForRepo } from "@/server/github-integrations";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { orgId } = await requireOrgPermission("view_workspace");
  const url = new URL(request.url);
  const repoIdRaw = url.searchParams.get("repoId");
  if (!repoIdRaw) return Response.json({ error: "repoId_required" }, { status: 400 });
  const repoId = Number(repoIdRaw);
  if (!Number.isFinite(repoId)) return Response.json({ error: "repoId_invalid" }, { status: 400 });
  try {
    const branches = await listGithubBranchesForRepo({ orgId, repoId });
    return Response.json({ branches });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "branch_list_failed" },
      { status: 400 },
    );
  }
}
