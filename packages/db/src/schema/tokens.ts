import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { organization } from "./organizations.js";
import { relations } from "drizzle-orm";

/**
 * Personal access tokens for the CLI. Token values are Argon2id-hashed.
 * The `prefix` column stores the first 8 chars of the plaintext token for
 * UI display ("revoke token starting with `ofn_a3f…`") without exposing the secret.
 */
export const apiToken = pgTable(
  "api_token",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(),
    hashedKey: text("hashed_key").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("api_token_user_idx").on(t.userId),
    orgIdx: index("api_token_org_idx").on(t.orgId),
    prefixIdx: uniqueIndex("api_token_prefix_idx").on(t.prefix),
  }),
);

export const apiTokenRelations = relations(apiToken, ({ one }) => ({
    // Connect back to the User
    user: one(user, {
      fields: [apiToken.userId],
      references: [user.id],
    }),
    // Connect back to the Organization
    organization: one(organization, {
      fields: [apiToken.orgId],
      references: [organization.id],
    }),
  }));