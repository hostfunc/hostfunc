import { getOptionalSession } from "@/lib/session";
import { createFunctionComment, listFunctionComments } from "@/server/functions";
import type { NextRequest } from "next/server";
import { z } from "zod";

const commentSchema = z.object({
  body: z.string().trim().min(2).max(2000),
  parentCommentId: z.string().optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ fn: string }> }) {
  const { fn } = await params;
  const comments = await listFunctionComments(fn);
  return Response.json({ comments });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ fn: string }> }) {
  const session = await getOptionalSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  const parsed = commentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_comment" }, { status: 400 });
  const { fn } = await params;
  const id = await createFunctionComment({
    fnId: fn,
    userId: session.user.id,
    body: parsed.data.body,
    parentCommentId: parsed.data.parentCommentId ?? null,
  });
  return Response.json({ id });
}
