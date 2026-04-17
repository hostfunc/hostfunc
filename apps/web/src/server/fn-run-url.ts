import "server-only";

import { env } from "@/lib/env";
import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";

export interface FnRunTarget {
  fnId: string;
  orgId: string;
  orgSlug: string;
  fnSlug: string;
  currentVersionId: string | null;
}

/**
 * Build the public run URL for a deployed function. The runtime only accepts
 * /run/{orgSlug}/{fnSlug}; passing legacy user ids as the first segment
 * returns HTTP 410 from dispatch.
 */
export function buildRunUrl(orgSlug: string, fnSlug: string): string {
  return `${env.HOSTFUNC_RUNTIME_URL}/run/${orgSlug}/${fnSlug}`;
}

/**
 * Load the fields needed to build a run URL for a function. Scoped to an org
 * so the caller can't accidentally resolve a function they don't own.
 */
export async function getFnRunTarget(params: {
  fnId: string;
  orgId: string;
}): Promise<FnRunTarget | null> {
  const rows = await db
    .select({
      fnId: schema.fn.id,
      orgId: schema.fn.orgId,
      orgSlug: schema.organization.slug,
      fnSlug: schema.fn.slug,
      currentVersionId: schema.fn.currentVersionId,
    })
    .from(schema.fn)
    .innerJoin(schema.organization, eq(schema.organization.id, schema.fn.orgId))
    .where(and(eq(schema.fn.id, params.fnId), eq(schema.fn.orgId, params.orgId)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Resolve (orgSlug, fnSlug) from a function id, without scoping to an org.
 * Use this only in internal paths where the caller is already trusted (the
 * cron dispatcher, the email inbound router, etc.).
 */
export async function getFnRunTargetById(fnId: string): Promise<FnRunTarget | null> {
  const rows = await db
    .select({
      fnId: schema.fn.id,
      orgId: schema.fn.orgId,
      orgSlug: schema.organization.slug,
      fnSlug: schema.fn.slug,
      currentVersionId: schema.fn.currentVersionId,
    })
    .from(schema.fn)
    .innerJoin(schema.organization, eq(schema.organization.id, schema.fn.orgId))
    .where(eq(schema.fn.id, fnId))
    .limit(1);
  return rows[0] ?? null;
}
