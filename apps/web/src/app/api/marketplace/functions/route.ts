import { getOptionalSession } from "@/lib/session";
import { type MarketplaceSort, searchMarketplaceFunctions } from "@/server/functions";
import type { NextRequest } from "next/server";

const MARKETPLACE_SORTS: MarketplaceSort[] = ["featured", "trending", "recent", "stars", "forks"];

function parseSort(value: string | null): MarketplaceSort | undefined {
  return value && (MARKETPLACE_SORTS as string[]).includes(value)
    ? (value as MarketplaceSort)
    : undefined;
}

export async function GET(req: NextRequest) {
  const session = await getOptionalSession();
  const requestedLimit = Number(req.nextUrl.searchParams.get("limit") ?? "12");
  const sort = parseSort(req.nextUrl.searchParams.get("sort"));
  const result = await searchMarketplaceFunctions({
    ...(req.nextUrl.searchParams.get("q")
      ? { query: req.nextUrl.searchParams.get("q") ?? "" }
      : {}),
    ...(req.nextUrl.searchParams.get("category")
      ? { category: req.nextUrl.searchParams.get("category") ?? "" }
      : {}),
    ...(req.nextUrl.searchParams.get("useCase")
      ? { useCase: req.nextUrl.searchParams.get("useCase") ?? "" }
      : {}),
    ...(sort ? { sort } : {}),
    ...(req.nextUrl.searchParams.get("cursor")
      ? { cursor: req.nextUrl.searchParams.get("cursor") ?? "" }
      : {}),
    limit: Number.isFinite(requestedLimit) ? requestedLimit : 12,
    ...(session?.user.id ? { userId: session.user.id } : {}),
  });
  return Response.json(result);
}
