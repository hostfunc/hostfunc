import "server-only";

import { db, genId, schema } from "@hostfunc/db";

export async function auditMcpToolCall(input: {
  tokenId: string;
  orgId: string;
  userId: string;
  tool: string;
  args: unknown;
  result?: unknown;
  error?: string;
}) {
  await db.insert(schema.webhookEvent).values({
    id: genId("evt"),
    source: "mcp",
    externalId: `${input.tokenId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    kind: `tool:${input.tool}`,
    payload: {
      tokenId: input.tokenId,
      orgId: input.orgId,
      userId: input.userId,
      args: input.args,
      result: input.result,
    },
    processedAt: input.error ? null : new Date(),
    error: input.error ?? null,
  });
}
