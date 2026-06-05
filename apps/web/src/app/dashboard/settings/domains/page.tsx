import { requireActiveOrg } from "@/lib/session";
import { cnameTarget, isCustomDomainsConfigured } from "@/server/custom-domains";
import { db, schema } from "@hostfunc/db";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { DomainsClient } from "./domains-client";

export default async function DomainsSettingsPage() {
  const { orgId } = await requireActiveOrg();

  const [domains, websites] = await Promise.all([
    db.query.customDomain.findMany({
      where: eq(schema.customDomain.orgId, orgId),
      orderBy: desc(schema.customDomain.createdAt),
      columns: {
        id: true,
        hostname: true,
        status: true,
        sslStatus: true,
        dcvRecords: true,
        ownershipVerification: true,
        lastError: true,
        fnId: true,
      },
      with: { fn: { columns: { slug: true } } },
    }),
    db.query.fn.findMany({
      where: and(eq(schema.fn.orgId, orgId), isNotNull(schema.fn.currentVersionId)),
      columns: { id: true, slug: true },
      orderBy: desc(schema.fn.updatedAt),
    }),
  ]);

  return (
    <div className="animate-in space-y-10 fade-in duration-500 pb-10">
      <div className="flex flex-col justify-between gap-6 border-b border-[var(--color-border)] pb-6 md:flex-row md:items-center">
        <div>
          <h3 className="flex items-center gap-2 font-display text-4xl tracking-tight text-[var(--color-bone)]">
            Custom Domains
          </h3>
          <p className="mt-2 max-w-xl leading-relaxed text-[var(--color-bone-muted)]">
            Serve a deployed website from your own domain. hostfunc provisions and renews SSL
            automatically — you just add a couple of DNS records.
          </p>
        </div>
      </div>

      <DomainsClient
        configured={isCustomDomainsConfigured()}
        cnameTarget={cnameTarget()}
        initialDomains={domains.map((d) => ({
          id: d.id,
          hostname: d.hostname,
          status: d.status,
          sslStatus: d.sslStatus,
          dcvRecords: d.dcvRecords ?? [],
          ownershipVerification: d.ownershipVerification ?? null,
          lastError: d.lastError,
          fnSlug: d.fn.slug,
        }))}
        websites={websites.map((w) => ({ id: w.id, slug: w.slug }))}
      />
    </div>
  );
}
