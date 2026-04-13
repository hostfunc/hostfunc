import { requireActiveOrg } from "@/lib/session";
import { listExecutions } from "@/server/executions";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { orgId } = await requireActiveOrg();
  const fnId = req.nextUrl.searchParams.get("fnId");
  if (!fnId) return Response.json({ error: "missing_fn_id" }, { status: 400 });

  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
  const status = req.nextUrl.searchParams.get("status");
  const trigger = req.nextUrl.searchParams.get("trigger");
  const from = req.nextUrl.searchParams.get("from") ?? undefined;
  const to = req.nextUrl.searchParams.get("to") ?? undefined;
  const filters: {
    fnId: string;
    status?: Array<"ok" | "fn_error" | "limit_exceeded" | "infra_error">;
    triggerKind?: Array<"http" | "cron" | "email" | "mcp" | "fn_call">;
    from?: string;
    to?: string;
  } = { fnId };
  if (status) {
    filters.status = status.split(",") as Array<"ok" | "fn_error" | "limit_exceeded" | "infra_error">;
  }
  if (trigger) {
    filters.triggerKind = trigger.split(",") as Array<"http" | "cron" | "email" | "mcp" | "fn_call">;
  }
  if (from) filters.from = from;
  if (to) filters.to = to;

  const input: {
    orgId: string;
    limit: number;
    filters: typeof filters;
    cursor?: string;
  } = {
    orgId,
    limit: 50,
    filters,
  };
  if (cursor) input.cursor = cursor;
  const result = await listExecutions(input);
  return Response.json(result);
}
