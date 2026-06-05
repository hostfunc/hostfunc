"use server";

import { requireOrgPermission } from "@/lib/session";
import {
  CustomDomainNotConfiguredError,
  collectDcvRecords,
  deleteDomainIndex,
  deprovisionDomain,
  mapCfStatus,
  provisionDomain,
} from "@/server/custom-domains";
import type { DcvRecord } from "@hostfunc/db";
import { db, genId, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export interface ProvisionedDomain {
  id: string;
  hostname: string;
  fnSlug: string;
  status: (typeof schema.customDomainStatusEnum.enumValues)[number];
  sslStatus: string | null;
  dcvRecords: DcvRecord[];
  ownershipVerification: DcvRecord | null;
}

export type DomainActionResult = { ok: true } | { ok: false; error: string };
export type AddDomainResult =
  | { ok: true; domain: ProvisionedDomain }
  | { ok: false; error: string };

/** Hostnames hostfunc itself owns — never allow a user to claim one. */
const RESERVED_SUFFIXES = ["hostfunc.app", "hostfunc.io", "hostfunc.dev"];

const hostnameSchema = z.object({
  hostname: z
    .string()
    .trim()
    .toLowerCase()
    .min(4, "Enter a valid domain")
    .max(253, "Domain is too long")
    .regex(
      /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/,
      "Enter a bare domain like www.example.com — no http:// or paths",
    )
    .refine(
      (h) => !RESERVED_SUFFIXES.some((s) => h === s || h.endsWith(`.${s}`)),
      "That domain is reserved by hostfunc",
    ),
  fnId: z.string().min(1),
});

const idSchema = z.object({ domainId: z.string().min(1) });

function asErrorMessage(error: unknown): string {
  if (error instanceof CustomDomainNotConfiguredError) {
    return "Custom domains aren't enabled on this deployment yet.";
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  ) {
    return "That domain is already in use.";
  }
  if (error instanceof Error && error.message === "forbidden") {
    return "You do not have permission to manage domains.";
  }
  return "Something went wrong. Please try again.";
}

export async function addDomainAction(input: unknown): Promise<AddDomainResult> {
  const parsed = hostnameSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid domain" };
  }
  const { hostname, fnId } = parsed.data;

  try {
    const { orgId, session } = await requireOrgPermission("manage_workspace_settings");

    // The target must be a deployed function in this workspace.
    const target = await db.query.fn.findFirst({
      where: and(eq(schema.fn.id, fnId), eq(schema.fn.orgId, orgId)),
      columns: { id: true, slug: true, currentVersionId: true },
    });
    if (!target) return { ok: false, error: "That website doesn't belong to this workspace." };
    if (!target.currentVersionId) {
      return { ok: false, error: "Deploy this website before attaching a domain." };
    }

    const id = genId("dom");
    // Insert first so the unique constraint claims the hostname atomically; if
    // Cloudflare provisioning fails we mark the row failed rather than leak a
    // hostname that was created in CF but never recorded.
    await db.insert(schema.customDomain).values({
      id,
      orgId,
      fnId,
      hostname,
      status: "pending_dns",
      createdById: session.user.id,
    });

    let record: Awaited<ReturnType<typeof provisionDomain>>;
    try {
      record = await provisionDomain(hostname);
    } catch (cfError) {
      await db
        .update(schema.customDomain)
        .set({
          status: "failed",
          lastError: cfError instanceof Error ? cfError.message : "provisioning failed",
          updatedAt: new Date(),
        })
        .where(eq(schema.customDomain.id, id));
      return { ok: false, error: "Cloudflare rejected that domain. Check it and try again." };
    }

    const status = mapCfStatus(record);
    const dcvRecords = collectDcvRecords(record);
    await db
      .update(schema.customDomain)
      .set({
        cfHostnameId: record.id,
        status,
        sslStatus: record.ssl.status,
        dcvRecords,
        ownershipVerification: record.ownershipVerification,
        updatedAt: new Date(),
      })
      .where(eq(schema.customDomain.id, id));

    revalidatePath("/dashboard/settings/domains");
    return {
      ok: true,
      domain: {
        id,
        hostname,
        fnSlug: target.slug,
        status,
        sslStatus: record.ssl.status,
        dcvRecords,
        ownershipVerification: record.ownershipVerification,
      },
    };
  } catch (error) {
    return { ok: false, error: asErrorMessage(error) };
  }
}

export async function removeDomainAction(input: unknown): Promise<DomainActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request" };

  try {
    const { orgId } = await requireOrgPermission("manage_workspace_settings");
    const row = await db.query.customDomain.findFirst({
      where: and(
        eq(schema.customDomain.id, parsed.data.domainId),
        eq(schema.customDomain.orgId, orgId),
      ),
      columns: { id: true, hostname: true, cfHostnameId: true },
    });
    if (!row) return { ok: false, error: "Domain not found." };

    // Tear down the edge route first, then CF, then the row. Each is 404-tolerant
    // so a partial prior failure still converges to "gone".
    await deleteDomainIndex(row.hostname).catch(() => {});
    if (row.cfHostnameId) await deprovisionDomain(row.cfHostnameId).catch(() => {});
    await db.delete(schema.customDomain).where(eq(schema.customDomain.id, row.id));

    revalidatePath("/dashboard/settings/domains");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: asErrorMessage(error) };
  }
}
