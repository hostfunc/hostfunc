import { requireOrgPermission } from "@/lib/session";
import { listSelectedGithubReposForOrg } from "@/server/github-integrations";

export const runtime = "nodejs";

export async function GET() {
  const { orgId } = await requireOrgPermission("view_workspace");
  const repos = await listSelectedGithubReposForOrg(orgId);
  return Response.json({
    repos: repos.map((repo) => ({
      repoId: repo.repoId,
      fullName: repo.fullName,
      owner: repo.owner,
      ownerAvatarUrl: repo.ownerAvatarUrl,
      name: repo.name,
      defaultBranch: repo.defaultBranch,
      private: repo.isPrivate,
      archived: repo.isArchived,
    })),
  });
}
