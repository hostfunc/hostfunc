import "server-only";

import { env } from "@/lib/env";
import { db, schema } from "@hostfunc/db";
import {
  executionsGetInputSchema,
  executionsListInputSchema,
  executionsLogsInputSchema,
  functionsExecuteInputSchema,
  functionsGetInputSchema,
  functionsListInputSchema,
  type ToolName,
  toolInputSchemas,
} from "@hostfunc/mcp-tools";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getExecution, listExecutions, listLogsForExecution } from "./executions";

export async function runMcpTool(input: {
  orgId: string;
  tool: ToolName;
  args: unknown;
}) {
  const parsed = toolInputSchemas[input.tool].parse(input.args);
  switch (input.tool) {
    case "functions.list":
      return handleFunctionsList(input.orgId, functionsListInputSchema.parse(parsed));
    case "functions.get":
      return handleFunctionsGet(input.orgId, functionsGetInputSchema.parse(parsed));
    case "functions.execute":
      return handleFunctionsExecute(functionsExecuteInputSchema.parse(parsed));
    case "executions.list":
      return handleExecutionsList(input.orgId, executionsListInputSchema.parse(parsed));
    case "executions.get":
      return handleExecutionsGet(input.orgId, executionsGetInputSchema.parse(parsed));
    case "executions.logs":
      return handleExecutionsLogs(input.orgId, executionsLogsInputSchema.parse(parsed));
    default:
      throw new Error(`unsupported_tool:${String(input.tool)}`);
  }
}

async function handleFunctionsList(orgId: string, input: { query?: string | undefined }) {
  const where = input.query
    ? and(
        eq(schema.fn.orgId, orgId),
        or(ilike(schema.fn.slug, `%${input.query}%`), ilike(schema.fn.description, `%${input.query}%`)),
      )
    : eq(schema.fn.orgId, orgId);
  return db
    .select({
      id: schema.fn.id,
      slug: schema.fn.slug,
      description: schema.fn.description,
      visibility: schema.fn.visibility,
      createdById: schema.fn.createdById,
      currentVersionId: schema.fn.currentVersionId,
      updatedAt: schema.fn.updatedAt,
    })
    .from(schema.fn)
    .where(where)
    .orderBy(desc(schema.fn.updatedAt))
    .limit(200);
}

async function handleFunctionsGet(
  orgId: string,
  input: { fnId?: string | undefined; slug?: string | undefined },
) {
  if (!input.fnId && !input.slug) throw new Error("fnId_or_slug_required");
  const rows = await db
    .select()
    .from(schema.fn)
    .where(
      and(
        eq(schema.fn.orgId, orgId),
        input.fnId ? eq(schema.fn.id, input.fnId) : sql`true`,
        input.slug ? eq(schema.fn.slug, input.slug) : sql`true`,
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function handleFunctionsExecute(input: {
  orgSlug?: string | undefined;
  owner?: string | undefined;
  slug: string;
  payload?: Record<string, unknown> | undefined;
}) {
  const orgSlug = input.orgSlug ?? input.owner;
  if (!orgSlug) {
    return { status: 400, body: { error: "missing_org_slug" } };
  }
  const res = await fetch(`${env.HOSTFUNC_RUNTIME_URL}/run/${orgSlug}/${input.slug}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input.payload ?? {}),
  });
  const contentType = res.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await res.json() : await res.text();
  return { status: res.status, body };
}

async function handleExecutionsList(
  orgId: string,
  input: { fnId?: string | undefined; limit?: number | undefined; cursor?: string | undefined },
) {
  const listInput: {
    orgId: string;
    limit?: number;
    cursor?: string;
    filters?: { fnId: string };
  } = {
    orgId,
  };
  if (input.limit) listInput.limit = input.limit;
  if (input.cursor) listInput.cursor = input.cursor;
  if (input.fnId) listInput.filters = { fnId: input.fnId };
  return listExecutions(listInput);
}

async function handleExecutionsGet(orgId: string, input: { executionId: string }) {
  return getExecution(orgId, input.executionId);
}

async function handleExecutionsLogs(orgId: string, input: { executionId: string }) {
  return listLogsForExecution(orgId, input.executionId);
}
