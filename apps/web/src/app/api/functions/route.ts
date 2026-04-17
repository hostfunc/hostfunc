import { requireActiveOrg } from "@/lib/session";
import { searchFunctionsForOrgPaginated } from "@/server/functions";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { orgId } = await requireActiveOrg();
  const query = req.nextUrl.searchParams.get("q") ?? undefined;
  const visibility = req.nextUrl.searchParams.get("visibility") ?? undefined;
  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
  const requestedLimit = Number(req.nextUrl.searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : 10;

  const result = await searchFunctionsForOrgPaginated({
    orgId,
    limit,
    ...(query ? { query } : {}),
    ...(visibility ? { visibility } : {}),
    ...(cursor ? { cursor } : {}),
  });
  return Response.json(result);
}
