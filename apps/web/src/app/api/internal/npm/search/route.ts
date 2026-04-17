import { searchNpmPackages } from "@/lib/npm-registry";
import { requireOrgPermission } from "@/lib/session";

export async function GET(req: Request) {
  await requireOrgPermission("view_workspace");

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return Response.json({ ok: true, items: [] });
  }

  const items = await searchNpmPackages(q);
  return Response.json({ ok: true, items });
}
