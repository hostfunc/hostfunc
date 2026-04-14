import { requireCliActor } from "@/server/cli-auth";
import { getRecentExecutions, listLogsForExecution } from "@/server/executions";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const actor = await requireCliActor(req.headers.get("authorization"));
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  const executionId = req.nextUrl.searchParams.get("executionId");
  if (executionId) {
    const logs = await listLogsForExecution(actor.orgId, executionId);
    return Response.json({ ok: true, executionId, logs });
  }
  const latest = await getRecentExecutions(actor.orgId, 1);
  const target = latest[0];
  if (!target) return Response.json({ ok: true, executionId: null, logs: [] });
  const logs = await listLogsForExecution(actor.orgId, target.id);
  return Response.json({ ok: true, executionId: target.id, logs });
}
