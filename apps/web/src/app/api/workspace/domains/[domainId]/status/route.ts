import { requireOrgPermission } from "@/lib/session";
import {
  CustomDomainNotConfiguredError,
  cnameTarget,
  refreshDomainStatus,
} from "@/server/custom-domains";
import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";

/**
 * Live status for a custom domain, polled by the add-domain wizard. Re-fetches
 * the hostname state from Cloudflare, persists it, and (on going active) wires
 * the runtime KV index. Scoped to the caller's active workspace.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ domainId: string }> },
): Promise<Response> {
  const { domainId } = await params;

  try {
    const { orgId } = await requireOrgPermission("manage_workspace_settings");

    const row = await db.query.customDomain.findFirst({
      where: and(eq(schema.customDomain.id, domainId), eq(schema.customDomain.orgId, orgId)),
      columns: { id: true },
    });
    if (!row) return Response.json({ error: "not_found" }, { status: 404 });

    const result = await refreshDomainStatus(domainId);
    if (!result) return Response.json({ error: "not_found" }, { status: 404 });

    return Response.json({ ...result, cnameTarget: cnameTarget() });
  } catch (error) {
    if (error instanceof CustomDomainNotConfiguredError) {
      return Response.json({ error: "not_configured" }, { status: 503 });
    }
    if (error instanceof Error && error.message === "forbidden") {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    return Response.json({ error: "status_failed" }, { status: 500 });
  }
}
