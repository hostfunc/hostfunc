import { parseFunctionFilters } from "@/app/dashboard/functions/search-params";
import { requireActiveOrg } from "@/lib/session";
import { searchFunctionsForOrgPaginated } from "@/server/functions";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { orgId } = await requireActiveOrg();
  const filters = parseFunctionFilters(req.nextUrl.searchParams);
  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
  const requestedLimit = Number(req.nextUrl.searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : 10;

  const result = await searchFunctionsForOrgPaginated({
    orgId,
    limit,
    ...(filters.q ? { query: filters.q } : {}),
    ...(filters.visibility ? { visibility: filters.visibility } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.lastRun ? { lastRun: filters.lastRun } : {}),
    ...(filters.github ? { github: filters.github } : {}),
    ...(filters.env ? { env: filters.env } : {}),
    ...(filters.trigger ? { triggers: filters.trigger } : {}),
    ...(filters.updatedWithin ? { updatedWithin: filters.updatedWithin } : {}),
    ...(filters.sort ? { sort: filters.sort } : {}),
    ...(cursor ? { cursor } : {}),
  });
  return Response.json(result);
}
