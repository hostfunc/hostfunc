import { getOptionalSession } from "@/lib/session";
import { setFunctionStar } from "@/server/functions";
import type { NextRequest } from "next/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ fn: string }> }) {
  const session = await getOptionalSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { fn } = await params;
  await setFunctionStar({ fnId: fn, userId: session.user.id, starred: true });
  return Response.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ fn: string }> }) {
  const session = await getOptionalSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { fn } = await params;
  await setFunctionStar({ fnId: fn, userId: session.user.id, starred: false });
  return Response.json({ ok: true });
}
