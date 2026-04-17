import { requireActiveOrg } from "@/lib/session";
import { redis } from "@/lib/redis";
import { listLogsForExecution } from "@/server/executions";
import { clampBackfillLimit, toSseEvent } from "@/server/live-log-events";
import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ execId: string }> }) {
  const { orgId } = await requireActiveOrg();
  const { execId } = await params;
  const backfillLimit = clampBackfillLimit(req.nextUrl.searchParams.get("backfill"));

  const check = await db
    .select({ id: schema.execution.id })
    .from(schema.execution)
    .where(and(eq(schema.execution.id, execId), eq(schema.execution.orgId, orgId)))
    .limit(1);
  if (!check[0]) return new Response("not found", { status: 404 });

  const subscriber = redis.duplicate();

  const encoder = new TextEncoder();
  let cleanedUp = false;
  const cleanup = async () => {
    if (cleanedUp) return;
    cleanedUp = true;
    try {
      await subscriber.unsubscribe(`logs:${execId}`);
    } catch {
      // Ignore disconnect race conditions.
    }
    try {
      await subscriber.quit();
    } catch {
      // Ignore already-closed redis clients.
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const safeEnqueue = (payload: string) => {
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          void cleanup();
        }
      };

      safeEnqueue(toSseEvent({ ok: true, executionId: execId }, "ready"));
      if (backfillLimit > 0) {
        const historical = await listLogsForExecution(orgId, execId);
        const lines = historical.slice(Math.max(0, historical.length - backfillLimit));
        safeEnqueue(toSseEvent({ count: lines.length }, "snapshot"));
        for (const line of lines) {
          safeEnqueue(toSseEvent(line));
        }
      } else {
        safeEnqueue(toSseEvent({ count: 0 }, "snapshot"));
      }

      await subscriber.subscribe(`logs:${execId}`);
      const onMessage = (channel: string, message: string) => {
        if (channel !== `logs:${execId}`) return;
        safeEnqueue(`data: ${message}\n\n`);
      };
      const heartbeat = setInterval(() => {
        safeEnqueue(`event: ping\ndata: {"ok":true}\n\n`);
      }, 15_000);
      subscriber.on("message", onMessage);

      const teardown = async () => {
        clearInterval(heartbeat);
        subscriber.off("message", onMessage);
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
