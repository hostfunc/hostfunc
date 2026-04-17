import { z } from "zod";

export const triggerKindSchema = z.enum(["http", "cron", "email", "mcp"]);
export type TriggerKind = z.infer<typeof triggerKindSchema>;

export const httpTriggerConfigSchema = z.object({
  requireAuth: z.boolean().default(true),
});

export const cronTriggerConfigSchema = z.object({
  schedule: z.string().min(1).max(128),
  timezone: z.string().min(1).max(64).optional(),
});

export const emailTriggerConfigSchema = z.object({
  address: z.string().email(),
  allowlist: z.array(z.string().email()).default([]),
});

export const mcpTriggerConfigSchema = z.object({
  toolName: z.string().min(1).max(128),
  description: z.string().max(512).default(""),
});

export const triggerConfigSchema = z.object({
  http: httpTriggerConfigSchema.optional(),
  cron: cronTriggerConfigSchema.optional(),
  email: emailTriggerConfigSchema.optional(),
  mcp: mcpTriggerConfigSchema.optional(),
});

export type TriggerConfigInput = z.input<typeof triggerConfigSchema>;
export type TriggerConfig = z.output<typeof triggerConfigSchema>;

export function normalizeTriggerConfig(input: TriggerConfigInput): TriggerConfig {
  return triggerConfigSchema.parse(input);
}
