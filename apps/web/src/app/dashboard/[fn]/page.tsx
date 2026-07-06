import { DeployedSecretsBanner } from "@/components/editor/deployed-secrets-banner";
import { type AiContextSummary, FunctionEditor } from "@/components/editor/function-editor";
import { FunctionLogo } from "@/components/function/function-logo";
import { InvokeSnippet } from "@/components/functions/invoke-snippet";
import { Button } from "@/components/ui/button";
import { hasOrgPermission } from "@/lib/permissions";
import { getActiveMembership } from "@/lib/session";
import { listContextsForFunction } from "@/server/fn-ai-context";
import { listFunctionAssets } from "@/server/fn-assets";
import { buildRunUrl, getFnRunTarget } from "@/server/fn-run-url";
import {
  getCurrentVersionCodeForFunction,
  getDraft,
  getFunctionForOrg,
  getFunctionPackagesForOrg,
} from "@/server/functions";
import { getFunctionGithubBinding } from "@/server/github-integrations";
import { BookOpen, ChartLine, Settings } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function FunctionEditorPage({
  params,
}: {
  params: Promise<{ fn: string }>;
}) {
  const { session, orgId, role } = await getActiveMembership();
  const { fn: fnId } = await params;
  const canEditDraft = hasOrgPermission(role, "edit_draft");

  const fn = await getFunctionForOrg(orgId, fnId);
  if (!fn) notFound();

  const draft = await getDraft(fnId, session.user.id);
  const fallbackCode = await getCurrentVersionCodeForFunction(orgId, fnId);
  const packages = await getFunctionPackagesForOrg(orgId, fnId);
  const gitBinding = await getFunctionGithubBinding({ orgId, fnId });
  const packageNames = packages.map((pkg) => pkg.name);
  const contexts: AiContextSummary[] = (await listContextsForFunction(orgId, fnId)).map((row) => ({
    id: row.id,
    kind: row.kind,
    name: row.name,
    bytes: row.bytes,
    enabled: row.enabled,
    sourceUri: row.sourceUri,
  }));
  const assets = await listFunctionAssets(fnId);
  const runTarget = await getFnRunTarget({ fnId, orgId });
  const runUrl = runTarget ? buildRunUrl(runTarget.orgSlug, runTarget.fnSlug) : null;

  return (
    <div className="mt-2 flex h-[calc(100dvh-7rem)] flex-col">
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-4">
        <div className="flex items-center gap-3">
          <FunctionLogo logo={fn.logo} name={fn.slug} size="md" />
          <div>
            <h1 className="font-mono text-lg font-semibold text-[var(--color-bone)]">{fn.slug}</h1>
            <p className="text-xs text-[var(--color-bone-muted)]">
              {fn.description || "No description"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {runUrl ? <InvokeSnippet runUrl={runUrl} /> : null}
          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-[var(--color-border)] bg-transparent text-[var(--color-bone)] hover:bg-white/[0.04]"
          >
            <Link href="/docs/functions">
              <BookOpen className="mr-2 h-4 w-4" />
              Docs
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-[var(--color-border)] bg-transparent text-[var(--color-bone)] hover:bg-white/[0.04]"
          >
            <Link href={`/dashboard/${fnId}/analytics`}>
              <ChartLine className="mr-2 h-4 w-4" />
              Analytics
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-[var(--color-border)] bg-transparent text-[var(--color-bone)] hover:bg-white/[0.04]"
          >
            <Link href={`/dashboard/${fnId}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>
      </div>
      {fn.currentVersionId ? <DeployedSecretsBanner fnId={fnId} /> : null}
      <div className="flex-1 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/50">
        <FunctionEditor
          fnId={fnId}
          initialCode={draft?.code ?? fallbackCode ?? ""}
          packageNames={packageNames}
          readOnly={!canEditDraft}
          contexts={contexts}
          assets={assets}
          gitBinding={gitBinding ?? null}
        />
      </div>
    </div>
  );
}
