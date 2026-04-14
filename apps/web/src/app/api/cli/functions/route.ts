import { requireCliActor } from "@/server/cli-auth";
import { searchFunctionsForOrg } from "@/server/functions";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const actor = await requireCliActor(req.headers.get("authorization"));
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  const query = req.nextUrl.searchParams.get("query") ?? undefined;
  const items = await searchFunctionsForOrg(actor.orgId, query);
  return Response.json({ ok: true, items });
}
