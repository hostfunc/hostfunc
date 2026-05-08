import { searchMarketplaceFunctions } from "@/server/functions";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return Response.json({ items: [] }, { headers: { "Cache-Control": "no-store" } });
  }
  const requestedLimit = Number(req.nextUrl.searchParams.get("limit") ?? "5");
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : 5;

  const result = await searchMarketplaceFunctions({ query, sort: "trending", limit });
  const items = result.items.map((item) => ({
    id: item.id,
    slug: item.slug,
    description: item.shortDescription ?? item.description ?? "",
  }));

  return Response.json(
    { items },
    { headers: { "Cache-Control": "public, max-age=10, stale-while-revalidate=30" } },
  );
}
