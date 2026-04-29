import { requireActiveOrg } from "@/lib/session";
import { suggestFunctionSlugs } from "@/server/functions";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { orgId } = await requireActiveOrg();
  const query = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return Response.json({ items: [] }, { headers: { "Cache-Control": "no-store" } });
  }
  const requestedLimit = Number(req.nextUrl.searchParams.get("limit") ?? "5");
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : 5;

  const items = await suggestFunctionSlugs(orgId, query, limit);
  return Response.json(
    { items },
    { headers: { "Cache-Control": "private, max-age=5, stale-while-revalidate=15" } },
  );
}
