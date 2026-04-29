import { requireOrgPermission } from "@/lib/session";
import {
  getGithubSelectedRepoIdsForOrg,
  setGithubSelectedRepoIdsForOrg,
} from "@/server/github-integrations";

export const runtime = "nodejs";

export async function GET() {
  const { orgId } = await requireOrgPermission("view_workspace");
  const repoIds = await getGithubSelectedRepoIdsForOrg(orgId);
  return Response.json({ repoIds });
}

export async function POST(request: Request) {
  const { orgId } = await requireOrgPermission("manage_workspace_settings");
  const body = (await request.json().catch(() => null)) as { repoIds?: unknown } | null;
  if (!body || !Array.isArray(body.repoIds)) {
    return Response.json({ error: "repo_ids_required" }, { status: 400 });
  }
  const repoIds = body.repoIds
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
  await setGithubSelectedRepoIdsForOrg({ orgId, repoIds });
  return Response.json({ ok: true, repoIds });
}
