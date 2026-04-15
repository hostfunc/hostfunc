import { ExecutionLineageGraph } from "@/components/lineage/execution-lineage-graph";
import { requireActiveOrg } from "@/lib/session";
import { getExecutionLineageForFunction } from "@/server/executions";
import { getFunctionForOrg } from "@/server/functions";
import { notFound } from "next/navigation";

export default async function FunctionLineagePage({
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
    <div className="space-y-5">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-5">
        <h1 className="font-display text-2xl text-[var(--color-bone)]">Execution Lineage</h1>
        <p className="mt-2 text-sm text-[var(--color-bone-muted)]">
          Ancestor/descendant call-chain for <span className="font-mono text-[var(--color-bone)]">{fn.slug}</span>.
          Select a root execution to inspect edge weights, error paths, and call depth.
        </p>
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
