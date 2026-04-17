import { ExecutionLineageGraph } from "@/components/lineage/execution-lineage-graph";
import { Button } from "@/components/ui/button";
import { requireActiveOrg } from "@/lib/session";
import { getExecutionLineageForFunction } from "@/server/executions";
import { getFunctionForOrg } from "@/server/functions";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function FunctionSettingsLineagePage({
  params,
  searchParams,
}: {
  params: Promise<{ fn: string }>;
  searchParams: Promise<{ executionId?: string }>;
}) {
  const { orgId } = await requireActiveOrg();
  const { fn: fnId } = await params;
  const { executionId } = await searchParams;

  const fn = await getFunctionForOrg(orgId, fnId);
  if (!fn) notFound();

  const lineage = await getExecutionLineageForFunction(orgId, fnId, executionId);

  return (
    <div className="animate-in space-y-8 fade-in duration-500 pb-10">
      <div className="flex flex-col justify-between gap-6 border-b border-[var(--color-border)] pb-6 md:flex-row md:items-center">
        <div>
          <h3 className="font-display text-4xl tracking-tight text-[var(--color-bone)]">Execution Lineage</h3>
          <p className="mt-2 max-w-2xl leading-relaxed text-[var(--color-bone-muted)]">
            Ancestor/descendant call-chain for <span className="font-mono text-[var(--color-bone)]">{fn.slug}</span>.
            Select a root execution to inspect edge weights, error paths, and call depth.
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
        >
          <Link href={`/dashboard/${fnId}/lineage`}>
            View full lineage
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <ExecutionLineageGraph
        fnId={fnId}
        selectedExecutionId={lineage.selectedExecutionId}
        availableExecutions={lineage.availableExecutions.map((execution) => ({
          ...execution,
          startedAt: execution.startedAt.toISOString(),
        }))}
        nodes={lineage.nodes.map((node) => ({
          ...node,
          startedAt: node.startedAt.toISOString(),
          endedAt: node.endedAt?.toISOString() ?? null,
        }))}
        edges={lineage.edges}
      />
    </div>
  );
}
