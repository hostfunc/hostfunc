import { requireActiveOrg } from "@/lib/session";
import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";
import { Redis } from "ioredis";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ execId: string }> }) {
  const { orgId } = await requireActiveOrg();
  const { execId } = await params;

  const check = await db
    .select({ id: schema.execution.id })
    .from(schema.execution)
    .where(and(eq(schema.execution.id, execId), eq(schema.execution.orgId, orgId)))
    .limit(1);
  if (!check[0]) return new Response("not found", { status: 404 });

  const redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
  await redis.subscribe(`logs:${execId}`);

  const encoder = new TextEncoder();
  let cleanedUp = false;
  const cleanup = async () => {
    if (cleanedUp) return;
    cleanedUp = true;
    try {
      await redis.unsubscribe(`logs:${execId}`);
    } catch {
      // Ignore disconnect race conditions.
    }
    try {
      await redis.quit();
    } catch {
      // Ignore already-closed redis clients.
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const safeEnqueue = (payload: string) => {
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          void cleanup();
        }
      };

      const onMessage = (channel: string, message: string) => {
        if (channel !== `logs:${execId}`) return;
        safeEnqueue(`data: ${message}\n\n`);
      };
      const heartbeat = setInterval(() => {
        safeEnqueue(`event: ping\ndata: {"ok":true}\n\n`);
      }, 15_000);
      redis.on("message", onMessage);

      const teardown = async () => {
        clearInterval(heartbeat);
        redis.off("message", onMessage);
        await cleanup();
      };
      req.signal.addEventListener("abort", () => {
        void teardown();
      });
    },
    async cancel() {
      await cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
