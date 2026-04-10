import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { fn } from "./functions.js";
import { organization } from "./organizations.js";
import { user } from "./auth.js";

export const secret = pgTable(
  "secret",
  {
    id: text("id").primaryKey(),
    fnId: text("fn_id")
      .notNull()
      .references(() => fn.id, { onDelete: "cascade" }),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    /** Base64 of (iv || tag || AES-256-GCM ciphertext). */
    ciphertext: text("ciphertext").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
  },
  (t) => ({
    fnKeyUnique: uniqueIndex("secret_fn_key_unique").on(t.fnId, t.key),
    orgIdx: index("secret_org_idx").on(t.orgId),
  }),
);