import { requireActiveOrg } from "@/lib/session";
import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";
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
    return <div className="text-sm text-muted-foreground">Function not found.</div>;
  }
  const triggers = await loadTriggers(fnRow.id);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Invocation Triggers</h3>
        <p className="text-sm text-muted-foreground">
          Runtime URL: {`/run/${fnRow.createdById}/${fnRow.slug}`}
        </p>
      </div>
      <TriggersClient fnId={fnRow.id} triggers={triggers} />
    </div>
  );
}
