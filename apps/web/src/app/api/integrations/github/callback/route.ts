import { requireOrgPermission } from "@/lib/session";
import {
  recordGithubConnectionAudit,
  syncGithubInstallationRepos,
  upsertGithubInstallationForOrg,
  verifyGithubConnectState,
} from "@/server/github-integrations";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { orgId, session } = await requireOrgPermission("manage_workspace_settings");
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const setupAction = url.searchParams.get("setup_action");

  try {
    if (!state) throw new Error("missing_state");
    const decoded = verifyGithubConnectState(state);
    if (decoded.orgId !== orgId || decoded.userId !== session.user.id) {
      throw new Error("state_mismatch");
    }
    if (!code) throw new Error("missing_oauth_code");
    const install = await upsertGithubInstallationForOrg({
      orgId,
      userId: session.user.id,
      oauthCode: code,
    });
    const repoCount = await syncGithubInstallationRepos({
      orgId,
      accessToken: install.accessToken,
    });
    await recordGithubConnectionAudit({
      orgId,
      userId: session.user.id,
      eventType: "callback_success",
      status: "ok",
      detailJson: {
        installationId: install.id,
        repoCount,
      },
    });
    revalidatePath("/dashboard/settings/integrations");
    const returnToUrl = new URL(decoded.returnTo, url.origin);
    returnToUrl.searchParams.set("github", "connected");
    const nextLocation = `${returnToUrl.pathname}${returnToUrl.search}`;
    if (decoded.popup) {
      return new Response(
        `<!doctype html><html><body><script>window.opener&&window.opener.postMessage({type:'github-oauth-complete',ok:true,location:${JSON.stringify(
          nextLocation,
        )}},window.location.origin);window.close();</script></body></html>`,
        { headers: { "content-type": "text/html; charset=utf-8" } },
      );
    }
    redirect(nextLocation);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "callback_failed";
    await recordGithubConnectionAudit({
      orgId,
      userId: session.user.id,
      eventType: "callback_error",
      status: "error",
      detailJson: { reason },
    });
    const action = setupAction ?? "unknown";
    const fallback = "/dashboard/settings/integrations";
    const nextLocation = `${fallback}?github=error&reason=${encodeURIComponent(reason)}&setup_action=${encodeURIComponent(action)}`;
    if (state) {
      try {
        const decoded = verifyGithubConnectState(state);
        if (decoded.popup) {
          return new Response(
            `<!doctype html><html><body><script>window.opener&&window.opener.postMessage({type:'github-oauth-complete',ok:false,location:${JSON.stringify(
              nextLocation,
            )}},window.location.origin);window.close();</script></body></html>`,
            { headers: { "content-type": "text/html; charset=utf-8" } },
          );
        }
      } catch {}
    }
    redirect(nextLocation);
  }
}
