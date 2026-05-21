import { requireActiveOrg } from "@/lib/session";
import { listContextsForFunction } from "@/server/fn-ai-context";
import { Sparkles } from "lucide-react";
import { ContextClient, type ContextClientItem } from "./context-client";

export const dynamic = "force-dynamic";

export default async function FunctionAiContextPage({
  params,
}: {
  params: Promise<{ fn: string }>;
}) {
  const { fn } = await params;
  const { orgId } = await requireActiveOrg();
  const records = await listContextsForFunction(orgId, fn);
  const initialItems: ContextClientItem[] = records.map((record) => ({
    id: record.id,
    kind: record.kind,
    name: record.name,
    sourceUri: record.sourceUri,
    mime: record.mime,
    bytes: record.bytes,
    enabled: record.enabled,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }));

  return (
    <div className="animate-in space-y-10 fade-in duration-500 pb-10">
      <div className="flex flex-col justify-between gap-6 border-b border-[var(--color-border)] pb-6 md:flex-row md:items-center">
        <div>
          <h3 className="flex items-center gap-2 font-display text-4xl tracking-tight text-[var(--color-bone)]">
            AI Context 
          </h3>
          <p className="mt-2 max-w-xl leading-relaxed text-[var(--color-bone-muted)]">
            Attach notes, URLs, and reference docs (markdown, text, JSON) to this function. Enabled
            items are sent alongside your prompt when AI generates code in the editor.
          </p>
        </div>
      </div>
      <ContextClient fnId={fn} initialItems={initialItems} />
    </div>
  );
}
