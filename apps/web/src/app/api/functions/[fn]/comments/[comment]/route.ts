import { getOptionalSession } from "@/lib/session";
import { deleteFunctionComment } from "@/server/functions";
import type { NextRequest } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ fn: string; comment: string }> },
) {
  const session = await getOptionalSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { fn, comment } = await params;
  await deleteFunctionComment({ fnId: fn, commentId: comment, userId: session.user.id });
  return Response.json({ ok: true });
}
