import { requireOrgPermission } from "@/lib/session";
import { enforceRateLimit } from "@/server/rate-limit";
import { isResendInboundConfigured, refreshResendDomainStatus } from "@/server/resend-inbound";
import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";

/** Floor between Resend re-fetches per domain; inside it we answer from the DB. */
const MIN_REFRESH_MS = 10_000;

/**
 * Inbound-email verification status for a custom domain, polled by the
 * domains page while the user adds the MX/TXT records at their registrar.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ domainId: string }> },
): Promise<Response> {
  const { domainId } = await params;

  try {
    const { orgId } = await requireOrgPermission("manage_workspace_settings");
    if (!isResendInboundConfigured()) {
      return Response.json({ error: "not_configured" }, { status: 503 });
    }

    const limit = await enforceRateLimit({
      key: `email_status:${orgId}`,
      limit: 60,
      windowSeconds: 60,
    });
    if (!limit.ok) return Response.json({ error: "rate_limited" }, { status: 429 });

    const row = await db.query.customDomain.findFirst({
      where: and(eq(schema.customDomain.id, domainId), eq(schema.customDomain.orgId, orgId)),
      columns: {
        id: true,
        resendDomainId: true,
        emailStatus: true,
        emailRecords: true,
        emailStatusCheckedAt: true,
      },
    });
    if (!row) return Response.json({ error: "not_found" }, { status: 404 });
    if (!row.resendDomainId) return Response.json({ error: "not_registered" }, { status: 404 });

    const checkedAt = row.emailStatusCheckedAt?.getTime() ?? 0;
    if (Date.now() - checkedAt < MIN_REFRESH_MS) {
      return Response.json({
        emailStatus: row.emailStatus ?? "unknown",
        emailRecords: row.emailRecords ?? [],
      });
    }

    const refreshed = await refreshResendDomainStatus(domainId);
    if (!refreshed) return Response.json({ error: "not_registered" }, { status: 404 });
    return Response.json(refreshed);
  } catch (error) {
    if (error instanceof Error && error.message === "forbidden") {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    return Response.json({ error: "status_failed" }, { status: 500 });
  }
}
