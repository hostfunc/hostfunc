import "server-only";

import { db, schema } from "@hostfunc/db";
import { and, eq, isNotNull, ne } from "drizzle-orm";

export interface OnboardingState {
  /** Any function row exists for the org (saved or deployed). */
  hasFunction: boolean;
  /** Any function has been deployed (has a current version). */
  hasDeployedFn: boolean;
  /** Any execution has been recorded for the org. */
  hasExecution: boolean;
  /** Any secret has been added on a function in the org. */
  hasSecret: boolean;
  /**
   * Any user-configured trigger exists. Every function gets a default HTTP
   * trigger row on creation (see createFunction in server/functions.ts), so
   * only non-http kinds (cron/email/mcp) count as an onboarding action.
   */
  hasTrigger: boolean;
  /** Steps done out of `totalCount` (deploy, run, logs, secret, trigger). */
  completedCount: number;
  totalCount: number;
  complete: boolean;
}

/** Returns true when the query matches at least one row. */
async function rowExists(query: PromiseLike<Array<unknown>>): Promise<boolean> {
  const rows = await query;
  return rows.length > 0;
}

export async function getOnboardingState(orgId: string): Promise<OnboardingState> {
  const [hasFunction, hasDeployedFn, hasExecution, hasSecret, hasTrigger] = await Promise.all([
    rowExists(
      db.select({ id: schema.fn.id }).from(schema.fn).where(eq(schema.fn.orgId, orgId)).limit(1),
    ),
    rowExists(
      db
        .select({ id: schema.fn.id })
        .from(schema.fn)
        .where(and(eq(schema.fn.orgId, orgId), isNotNull(schema.fn.currentVersionId)))
        .limit(1),
    ),
    rowExists(
      db
        .select({ id: schema.execution.id })
        .from(schema.execution)
        .where(eq(schema.execution.orgId, orgId))
        .limit(1),
    ),
    rowExists(
      db
        .select({ id: schema.secret.id })
        .from(schema.secret)
        .where(eq(schema.secret.orgId, orgId))
        .limit(1),
    ),
    rowExists(
      db
        .select({ id: schema.trigger.id })
        .from(schema.trigger)
        .where(and(eq(schema.trigger.orgId, orgId), ne(schema.trigger.kind, "http")))
        .limit(1),
    ),
  ]);

  // The five checklist steps shown in the dashboard. "Run it" and "see the
  // logs" both complete once an execution exists — we don't track log views.
  const steps = [hasDeployedFn, hasExecution, hasExecution, hasSecret, hasTrigger];
  const completedCount = steps.filter(Boolean).length;
  const totalCount = steps.length;

  return {
    hasFunction,
    hasDeployedFn,
    hasExecution,
    hasSecret,
    hasTrigger,
    completedCount,
    totalCount,
    complete: completedCount === totalCount,
  };
}
