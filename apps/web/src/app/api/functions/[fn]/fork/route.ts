import { requireOrgPermission } from "@/lib/session";
import { forkFunction } from "@/server/functions";
import type { NextRequest } from "next/server";
import { z } from "zod";

const forkSchema = z.object({
  slug: z
    .string()
    .trim()
    .max(64)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ fn: string }> }) {
  const { session, orgId } = await requireOrgPermission("create_function");
  const parsed = forkSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "invalid_slug" }, { status: 400 });
  const { fn } = await params;
  const fnId = await forkFunction({
    sourceFnId: fn,
    targetOrgId: orgId,
    userId: session.user.id,
    ...(parsed.data.slug ? { slug: parsed.data.slug } : {}),
  });
  return Response.json({ fnId, href: `/dashboard/${fnId}` });
}
