import { requireOrgPermission } from "@/lib/session";
import { buildGithubAppInstallUrl } from "@/server/github-app";
import {
  createGithubConnectState,
  recordGithubConnectionAudit,
} from "@/server/github-integrations";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { orgId, session } = await requireOrgPermission("manage_workspace_settings");
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") ?? "/dashboard/settings/integrations";
  const popup = url.searchParams.get("popup") === "1";
  await recordGithubConnectionAudit({
    orgId,
    userId: session.user.id,
    eventType: "connect_start",
    status: "ok",
  });
  const state = createGithubConnectState({
    orgId,
    userId: session.user.id,
    returnTo,
    popup,
  });
  redirect(buildGithubAppInstallUrl(state));
}
