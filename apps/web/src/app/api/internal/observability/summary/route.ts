import { env } from "@/lib/env";
import { db, schema, sql } from "@hostfunc/db";
import { and, eq, gte, isNotNull } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.TRIGGER_CONTROL_TOKEN}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const analytics = await db
    .select({
      kind: schema.webhookEvent.kind,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.webhookEvent)
    .where(and(eq(schema.webhookEvent.source, "analytics"), gte(schema.webhookEvent.receivedAt, since)))
    .groupBy(schema.webhookEvent.kind);

  const webhookFailures = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.webhookEvent)
    .where(
      and(
        eq(schema.webhookEvent.source, "stripe"),
        isNotNull(schema.webhookEvent.error),
        gte(schema.webhookEvent.receivedAt, since),
      ),
    )
    .limit(1);

  const runtimeFailures = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.execution)
    .where(and(gte(schema.execution.startedAt, since), sql`${schema.execution.status} <> 'ok'`))
    .limit(1);

  return Response.json({
    windowHours: 24,
    analytics,
    webhookFailures: webhookFailures[0]?.count ?? 0,
    runtimeFailures: runtimeFailures[0]?.count ?? 0,
  });
}
