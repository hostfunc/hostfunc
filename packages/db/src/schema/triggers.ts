import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { fn } from "./functions.js";
import { organization } from "./organizations.js";

export const triggerKindEnum = pgEnum("trigger_kind", ["http", "cron", "email", "mcp"]);

/**
 * Trigger configs per kind:
 *  http   — { requireAuth: boolean }
 *  cron   — { schedule: string, timezone?: string }
 *  email  — { address: string, allowlist?: string[] }
 *  mcp    — { toolName: string, description: string }
 */
export interface TriggerConfig {
  http?: { requireAuth: boolean } | undefined;
  cron?: { schedule: string; timezone?: string | undefined } | undefined;
  email?: { address: string; allowlist?: string[] | undefined } | undefined;
  mcp?: { toolName: string; description: string } | undefined;
}

export const trigger = pgTable(
  "trigger",
  {
    id: text("id").primaryKey(),
    fnId: text("fn_id")
      .notNull()
      .references(() => fn.id, { onDelete: "cascade" }),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    kind: triggerKindEnum("kind").notNull(),
    config: jsonb("config").$type<TriggerConfig>().notNull().default({}),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    fnKindUnique: uniqueIndex("trigger_fn_kind_unique").on(t.fnId, t.kind),
    orgIdx: index("trigger_org_idx").on(t.orgId),
  }),
);
