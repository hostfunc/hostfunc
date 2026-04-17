import { requireActiveOrg } from "@/lib/session";
import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";
import { RadioTower } from "lucide-react";
import { loadTriggers } from "./actions";
import { TriggersClient } from "./triggers-client";

export default async function TriggersFunctionSettingsPage({
  params,
}: {
  params: Promise<{ fn: string }>;
}) {
  const { fn } = await params;
  const { orgId } = await requireActiveOrg();
  const rows = await db
    .select({ id: schema.fn.id, slug: schema.fn.slug, createdById: schema.fn.createdById })
    .from(schema.fn)
    .where(and(eq(schema.fn.orgId, orgId), eq(schema.fn.id, fn)))
    .limit(1);
  const fnRow = rows[0];
  if (!fnRow) {
    return <div className="text-sm text-[var(--color-bone-muted)]">Function not found.</div>;
  }
  const triggers = await loadTriggers(fnRow.id);

  return (
    <div className="animate-in space-y-10 fade-in duration-500 pb-10">
      <div className="flex flex-col justify-between gap-6 border-b border-[var(--color-border)] pb-6 md:flex-row md:items-center">
        <div>
          <h3 className="flex items-center gap-2 font-display text-4xl tracking-tight text-[var(--color-bone)]">
            Invocation Triggers <RadioTower className="h-6 w-6 text-[var(--color-amber)]" />
          </h3>
          <p className="mt-2 text-sm text-[var(--color-bone-muted)]">
            Runtime URL: <span className="font-mono">{`/run/${fnRow.createdById}/${fnRow.slug}`}</span>
          </p>
        </div>
      </div>
      <TriggersClient fnId={fnRow.id} triggers={triggers} />
    </div>
  );
}
