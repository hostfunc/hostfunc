import { requireActiveOrg } from "@/lib/session";
import { db, schema } from "@hostfunc/db";
import { and, count, eq } from "drizzle-orm";
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
    .select({
      id: schema.fn.id,
      slug: schema.fn.slug,
      orgSlug: schema.organization.slug,
    })
    .from(schema.fn)
    .innerJoin(schema.organization, eq(schema.organization.id, schema.fn.orgId))
    .where(and(eq(schema.fn.orgId, orgId), eq(schema.fn.id, fn)))
    .limit(1);
  const fnRow = rows[0];
  if (!fnRow) {
    return <div className="text-sm text-[var(--color-bone-muted)]">Function not found.</div>;
  }
  const [tokenRow] = await db
    .select({ n: count() })
    .from(schema.apiToken)
    .where(eq(schema.apiToken.orgId, orgId));
  const hasApiTokens = Number(tokenRow?.n ?? 0) > 0;
  const triggers = await loadTriggers(fnRow.id);

  return (
    <div className="animate-in space-y-10 fade-in duration-500 pb-10">
      <div className="flex flex-col justify-between gap-6 border-b border-[var(--color-border)] pb-6 md:flex-row md:items-center">
        <div>
          <h3 className="flex items-center gap-2 font-display text-4xl tracking-tight text-[var(--color-bone)]">
            Invocation Triggers <RadioTower className="h-6 w-6 text-[var(--color-amber)]" />
          </h3>
          <p className="mt-2 text-sm text-[var(--color-bone-muted)]">
            Configure how this function is invoked across HTTP, Cron, Email, and MCP.
          </p>
          <p className="mt-2 text-xs text-[var(--color-bone-faint)]">
            Recommended order: HTTP baseline, then add Cron/Email/MCP as needed.
          </p>
          <div className="mt-3 inline-flex items-center rounded-md border border-[var(--color-border)] bg-black/20 px-3 py-1.5 text-xs text-[var(--color-bone-faint)]">
            Runtime path:{" "}
            <span className="ml-2 font-mono text-[var(--color-bone)]">{`/run/${fnRow.orgSlug}/${fnRow.slug}`}</span>
          </div>
        </div>
      </div>
      <TriggersClient
        fnId={fnRow.id}
        triggers={triggers}
        orgSlug={fnRow.orgSlug}
        fnSlug={fnRow.slug}
        hasApiTokens={hasApiTokens}
      />
    </div>
  );
}
