import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og";
import { getMarketplaceFunction } from "@/server/functions";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "hostfunc marketplace function";

export default async function MarketplaceOpengraphImage({
  params,
}: {
  params: Promise<{ fn: string }>;
}) {
  const { fn: fnId } = await params;
  const fn = await getMarketplaceFunction(fnId).catch(() => null);
  if (!fn) return renderOgImage({ eyebrow: "Marketplace" });

  return renderOgImage({
    eyebrow: "Marketplace",
    title: fn.slug,
    subtitle: fn.shortDescription || fn.description || "A public TypeScript function on hostfunc.",
  });
}
