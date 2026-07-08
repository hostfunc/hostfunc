import { index, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { fn } from "./functions.js";
import { organization } from "./organizations.js";

/**
 * Built-in key-value storage for user functions (`@hostfunc/sdk/kv`).
 *
 * Namespaced per function — forks get their own store, no cross-function
 * sharing. Values are JSON, size-capped at the app layer (64KB serialized
 * by default, plan-overridable). Expired rows are filtered on read and
 * cleaned up opportunistically on write.
 */
export const fnKv = pgTable(
  "fn_kv",
  {
    fnId: text("fn_id")
      .notNull()
      .references(() => fn.id, { onDelete: "cascade" }),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: jsonb("value").$type<unknown>().notNull(),
    /** null = no TTL. */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.fnId, t.key] }),
    orgIdx: index("fn_kv_org_idx").on(t.orgId),
    expiresIdx: index("fn_kv_expires_idx").on(t.fnId, t.expiresAt),
  }),
  // RLS enabled with no policies: the app reaches this table only as the
  // table-owning postgres role (which bypasses RLS), so this is deny-by-default
  // for Supabase's PostgREST anon/authenticated roles — matching every other
  // table and keeping the security advisor clean.
).enableRLS();
