import { z } from "zod";

export const toolNameSchema = z.enum([
  "functions.list",
  "functions.get",
  "functions.execute",
  "executions.list",
  "executions.get",
  "executions.logs",
]);

export type ToolName = z.infer<typeof toolNameSchema>;

export const functionsListInputSchema = z.object({
  query: z.string().optional(),
});

export const functionsGetInputSchema = z.object({
  fnId: z.string().optional(),
  slug: z.string().optional(),
});

export const functionsExecuteInputSchema = z
  .object({
    orgSlug: z.string().optional(),
    /** Deprecated alias for `orgSlug`. Kept so older MCP clients still work. */
    owner: z.string().optional(),
    slug: z.string(),
    payload: z.record(z.unknown()).optional(),
  })
  .refine((value) => Boolean(value.orgSlug ?? value.owner), {
    message: "orgSlug (or legacy 'owner') is required",
    path: ["orgSlug"],
  });

export const executionsListInputSchema = z.object({
  fnId: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  cursor: z.string().optional(),
});

export const executionsGetInputSchema = z.object({
  executionId: z.string(),
});

export const executionsLogsInputSchema = z.object({
  executionId: z.string(),
});

export const toolInputSchemas: Record<ToolName, z.ZodTypeAny> = {
  "functions.list": functionsListInputSchema,
  "functions.get": functionsGetInputSchema,
  "functions.execute": functionsExecuteInputSchema,
  "executions.list": executionsListInputSchema,
  "executions.get": executionsGetInputSchema,
  "executions.logs": executionsLogsInputSchema,
};

export const mcpTools = [
  {
    name: "functions.list",
    description: "List functions in current organization",
    inputSchema: functionsListInputSchema,
  },
  {
    name: "functions.get",
    description: "Get one function by id or slug",
    inputSchema: functionsGetInputSchema,
  },
  {
    name: "functions.execute",
    description: "Execute a deployed function by orgSlug and slug",
    inputSchema: functionsExecuteInputSchema,
  },
  {
    name: "executions.list",
    description: "List recent executions for the organization",
    inputSchema: executionsListInputSchema,
  },
  {
    name: "executions.get",
    description: "Get execution details",
    inputSchema: executionsGetInputSchema,
  },
  {
    name: "executions.logs",
    description: "List logs for an execution",
    inputSchema: executionsLogsInputSchema,
  },
] as const;
