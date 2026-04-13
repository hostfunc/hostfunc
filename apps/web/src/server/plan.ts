import "server-only";

import { db, schema } from "@hostfunc/db";
import type { PlanLimits } from "@hostfunc/db/schema";
import { eq } from "drizzle-orm";

export interface OrgPlan {
  id: string;
  slug: "free" | "pro" | "team";
  name: string;
  limits: PlanLimits;
}

export async function getOrgPlan(orgId: string): Promise<OrgPlan | null> {
  const rows = await db
    .select({
      id: schema.plan.id,
      slug: schema.plan.slug,
      name: schema.plan.name,
      limits: schema.plan.limits,
    })
    .from(schema.subscription)
    .innerJoin(schema.plan, eq(schema.plan.id, schema.subscription.planId))
    .where(eq(schema.subscription.orgId, orgId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug as "free" | "pro" | "team",
    name: row.name,
    limits: row.limits,
  };
}
