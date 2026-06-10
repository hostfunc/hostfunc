import { requireOrgPermission } from "@/lib/session";
import {
  CustomDomainNotConfiguredError,
  cnameTarget,
  refreshDomainStatus,
} from "@/server/custom-domains";
import { enforceRateLimit } from "@/server/rate-limit";
import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";

/**
 * Floor between Cloudflare re-fetches per domain. The wizard polls every 5s
 * (per tab); inside this window we answer from the persisted state instead of
 * hitting the Cloudflare API again.
 */
const MIN_CF_REFRESH_MS = 10_000;

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

    const limit = await enforceRateLimit({
      key: `domain_status:${orgId}`,
      limit: 60,
      windowSeconds: 60,
    });
    if (!limit.ok) {
      return Response.json({ error: "rate_limited" }, { status: 429 });
    }

    const row = await db.query.customDomain.findFirst({
      where: and(eq(schema.customDomain.id, domainId), eq(schema.customDomain.orgId, orgId)),
      columns: {
        id: true,
        status: true,
        sslStatus: true,
        dcvRecords: true,
        ownershipVerification: true,
        updatedAt: true,
      },
    });
    if (!row) return Response.json({ error: "not_found" }, { status: 404 });

    if (Date.now() - row.updatedAt.getTime() < MIN_CF_REFRESH_MS) {
      return Response.json({
        status: row.status,
        sslStatus: row.sslStatus ?? "unknown",
        dcvRecords: row.dcvRecords ?? [],
        ownershipVerification: row.ownershipVerification ?? null,
        cnameTarget: cnameTarget(),
      });
    }

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
