import { auditMcpToolCall } from "@/server/mcp-audit";
import { authenticateMcpRequest, enforceMcpRateLimit, isAllowedMcpOrigin } from "@/server/mcp-auth";
import { runMcpTool } from "@/server/mcp-handlers";
import { mcpTools, toolNameSchema, type ToolName } from "@hostfunc/mcp-tools";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

function ok(id: JsonRpcRequest["id"], result: unknown) {
  return Response.json({ jsonrpc: "2.0", id, result });
}

function err(id: JsonRpcRequest["id"], code: number, message: string) {
  return Response.json({ jsonrpc: "2.0", id, error: { code, message } });
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return Response.json({ error: "unsupported_media_type" }, { status: 415 });
  }
  if (!isAllowedMcpOrigin(req.headers.get("origin"))) {
    return Response.json({ error: "forbidden_origin" }, { status: 403 });
  }
  const actor = await authenticateMcpRequest(req.headers.get("authorization"));
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });

  const allowed = await enforceMcpRateLimit(actor.tokenId);
  if (!allowed) return Response.json({ error: "rate_limited" }, { status: 429 });

  const body = (await req.json().catch(() => null)) as JsonRpcRequest | null;
  if (!body?.method) return err(null, -32600, "invalid_request");
  if (body.params && JSON.stringify(body.params).length > 50_000) {
    return err(body.id ?? null, -32600, "request_too_large");
  }

  if (body.method === "initialize") {
    return ok(body.id ?? null, {
      protocolVersion: "2024-11-05",
      serverInfo: { name: "hostfunc-mcp", version: "0.1.0" },
      capabilities: { tools: {} },
    });
  }

  if (body.method === "tools/list") {
    return ok(body.id ?? null, {
      tools: mcpTools.map((tool: { name: string; description: string }) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: { type: "object", additionalProperties: true },
      })),
    });
  }

  if (body.method === "tools/call") {
    const name = body.params?.name;
    const args = body.params?.arguments;
    const parsedName = toolNameSchema.safeParse(name);
    if (!parsedName.success) return err(body.id ?? null, -32602, "unknown_tool");
    const tool = parsedName.data as ToolName;
    try {
      const result = await runMcpTool({ orgId: actor.orgId, tool, args });
      await auditMcpToolCall({
        tokenId: actor.tokenId,
        orgId: actor.orgId,
        userId: actor.userId,
        tool,
        args,
        result,
      });
      return ok(body.id ?? null, {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        isError: false,
      });
    } catch (error) {
      await auditMcpToolCall({
        tokenId: actor.tokenId,
        orgId: actor.orgId,
        userId: actor.userId,
        tool,
        args,
        error: error instanceof Error ? error.message : "tool_failed",
      });
      return ok(body.id ?? null, {
        content: [{ type: "text", text: error instanceof Error ? error.message : "tool_failed" }],
        isError: true,
      });
    }
  }

  if (body.method === "ping") return ok(body.id ?? null, {});
  return err(body.id ?? null, -32601, "method_not_found");
}

export async function GET() {
  return Response.json({ ok: true, endpoint: "/api/mcp" });
}
