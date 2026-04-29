import { type AiContextSummary, FunctionEditor } from "@/components/editor/function-editor";
import { Button } from "@/components/ui/button";
import { hasOrgPermission } from "@/lib/permissions";
import { getActiveMembership } from "@/lib/session";
import { listContextsForFunction } from "@/server/fn-ai-context";
import { listFunctionAssets } from "@/server/fn-assets";
import {
  getCurrentVersionCodeForFunction,
  getDraft,
  getFunctionForOrg,
  getFunctionPackagesForOrg,
} from "@/server/functions";
import { getFunctionGithubBinding } from "@/server/github-integrations";
import { Activity, BookOpen, GitBranch, Settings } from "lucide-react";
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

  return (
    <div className="mt-2 flex h-[calc(100dvh-7rem)] flex-col">
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-4">
        <div>
          <h1 className="font-mono text-lg font-semibold text-[var(--color-bone)]">{fn.slug}</h1>
          <p className="text-xs text-[var(--color-bone-muted)]">
            {fn.description || "No description"}
          </p>
          {gitBinding ? (
            <a
              href={`https://github.com/${gitBinding.repoFullName}/tree/${encodeURIComponent(gitBinding.branch)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white px-2 py-0.5 text-[11px] text-[var(--color-ink)] transition hover:bg-white/90"
            >
              <img
                src="/Github%20logo.svg"
                alt=""
                aria-hidden="true"
                className="h-3.5 w-3.5 object-contain"
              />
              <span>{gitBinding.repoFullName}</span>
              <span className="h-1 w-1 rounded-full bg-[var(--color-ink)]/30" />
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-ink)]/8 px-1.5 py-0.5 font-mono text-[10px]">
                <GitBranch className="h-3 w-3" />
                {gitBinding.branch}
              </span>
            </a>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
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
            <Link href={`/dashboard/${fnId}/executions`}>
              <Activity className="mr-2 h-4 w-4" />
              Executions
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-[var(--color-border)] bg-transparent text-[var(--color-bone)] hover:bg-white/[0.04]"
          >
            <Link href={`/dashboard/${fnId}/lineage`}>
              <GitBranch className="mr-2 h-4 w-4" />
              Lineage
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
      <div className="flex-1 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/50">
        <FunctionEditor
          fnId={fnId}
          initialCode={draft?.code ?? fallbackCode ?? ""}
          packageNames={packageNames}
          readOnly={!canEditDraft}
          contexts={contexts}
          assets={assets}
        />
      </div>
    </div>
  );
}
