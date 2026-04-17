import { FunctionEditor } from "@/components/editor/function-editor";
import { Button } from "@/components/ui/button";
import { hasOrgPermission } from "@/lib/permissions";
import { getActiveMembership } from "@/lib/session";
import {
  getCurrentVersionCodeForFunction,
  getDraft,
  getFunctionForOrg,
  getFunctionPackagesForOrg,
} from "@/server/functions";
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
  const packageNames = packages.map((pkg) => pkg.name);

  return (
    <div className="mt-2 flex h-[calc(100dvh-7rem)] flex-col">
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-4">
        <div>
          <h1 className="font-mono text-lg font-semibold text-[var(--color-bone)]">{fn.slug}</h1>
          <p className="text-xs text-[var(--color-bone-muted)]">{fn.description || "No description"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="border-[var(--color-border)] bg-transparent text-[var(--color-bone)] hover:bg-white/[0.04]">
            <Link href="/docs/functions">
              <BookOpen className="mr-2 h-4 w-4" />
              Docs
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="border-[var(--color-border)] bg-transparent text-[var(--color-bone)] hover:bg-white/[0.04]">
            <Link href={`/dashboard/${fnId}/executions`}>
              <Activity className="mr-2 h-4 w-4" />
              Executions
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="border-[var(--color-border)] bg-transparent text-[var(--color-bone)] hover:bg-white/[0.04]">
            <Link href={`/dashboard/${fnId}/lineage`}>
              <GitBranch className="mr-2 h-4 w-4" />
              Lineage
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="border-[var(--color-border)] bg-transparent text-[var(--color-bone)] hover:bg-white/[0.04]">
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
        />
      </div>
    </div>
  );
}
