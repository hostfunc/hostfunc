import { GithubOauthConnectButton } from "@/components/github/oauth-connect-button";
import { Button } from "@/components/ui/button";
import { getGithubConsentState } from "@/lib/session";
import { getGithubInstallationStatus } from "@/server/github-integrations";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function GithubOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ github?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const consent = await getGithubConsentState();
  if (!consent.isGithubAuthUser) {
    redirect("/dashboard");
  }
  const github = await getGithubInstallationStatus(consent.orgId);
  if (github.connected) {
    return (
      <main className="mx-auto flex min-h-[70dvh] w-full max-w-3xl items-center justify-center px-6 py-10">
        <div className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/80 p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 className="h-6 w-6 text-emerald-300" />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--color-bone)]">GitHub connected</h1>
          <p className="mt-2 text-sm text-[var(--color-bone-muted)]">
            Your workspace now has GitHub repository access. Continue to your dashboard.
          </p>
          <div className="mt-6">
            <Button
              asChild
              className="bg-[var(--color-amber)] text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
            >
              <Link href="/dashboard">Continue to dashboard</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[70dvh] w-full max-w-3xl items-center justify-center px-6 py-10">
      <div className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/80 p-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-ink)] p-2">
            <img
              src="/Github%20logo.svg"
              alt=""
              aria-hidden="true"
              className="h-5 w-5 object-contain"
            />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--color-bone)]">
            Connect GitHub to continue
          </h1>
        </div>
        <p className="text-sm text-[var(--color-bone-muted)]">
          You signed in with GitHub. To enable repository and branch integration for functions,
          approve GitHub access for your workspace.
        </p>
        <p className="mt-2 text-xs text-[var(--color-bone-faint)]">
          You can skip for now and continue to the dashboard, but GitHub repo/branch actions will
          stay limited until you connect.
        </p>
        <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-ink)]/50 p-3 text-sm text-[var(--color-bone-muted)]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--color-amber)]" />
            <span>Permissions are workspace-scoped and required for repo selection.</span>
          </div>
        </div>
        {params.github === "error" ? (
          <p className="mt-4 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            Connection failed{params.reason ? `: ${params.reason}` : "."}
          </p>
        ) : null}
        <div className="mt-6 flex items-center gap-3">
          <GithubOauthConnectButton
            returnTo="/onboarding/github"
            label="Connect GitHub"
            className="bg-[var(--color-amber)] text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
          />
          <Button
            asChild
            variant="outline"
            className="border-[var(--color-border)] text-[var(--color-bone)] hover:bg-white/[0.04]"
          >
            <Link href="/dashboard/settings/integrations">Manage in settings</Link>
          </Button>
          <form action="/api/onboarding/github/skip" method="post">
            <Button
              type="submit"
              variant="ghost"
              className="text-[var(--color-bone-faint)] hover:text-[var(--color-bone)]"
            >
              Skip for now
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
