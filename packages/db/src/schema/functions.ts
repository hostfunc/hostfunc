import { relations } from "drizzle-orm";
import {
  // bigint,
  // boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { organization } from "./organizations.js";

export interface FunctionPackage {
  name: string;
  version: string | null;
  source: "default" | "auto" | "manual";
  updatedAt: string;
}

export const visibilityEnum = pgEnum("function_visibility", ["public", "private"]);
export const deployStatusEnum = pgEnum("deploy_status", [
  "draft",
  "deploying",
  "deployed",
  "failed",
]);

export const fn = pgTable(
  "fn",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    packages: jsonb("packages").$type<FunctionPackage[]>().notNull().default([]),
    visibility: visibilityEnum("visibility").notNull().default("private"),
    currentVersionId: text("current_version_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgSlugUnique: uniqueIndex("fn_org_slug_unique").on(t.orgId, t.slug),
    orgIdx: index("fn_org_idx").on(t.orgId),
    visibilityIdx: index("fn_visibility_idx").on(t.visibility),
  }),
);

export const fnVersion = pgTable(
  "fn_version",
  {
    id: text("id").primaryKey(),
    fnId: text("fn_id")
      .notNull()
      .references(() => fn.id, { onDelete: "cascade" }),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    status: deployStatusEnum("status").notNull().default("draft"),
    /** Backend-specific handle, e.g. Cloudflare script name. Null until deployed. */
    backendHandle: text("backend_handle"),
    /** Warnings surfaced by the bundler, if any. */
    warnings: jsonb("warnings").$type<string[]>(),
    /** Optional source map content for stack symbolication in ingest. */
    sourceMap: text("source_map"),
    sourceMapSha256: text("source_map_sha256"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
  },
  (t) => ({
    fnIdx: index("fn_version_fn_idx").on(t.fnId),
    orgIdx: index("fn_version_org_idx").on(t.orgId),
  }),
);

export const fnDraft = pgTable(
  "fn_draft",
  {
    fnId: text("fn_id")
      .notNull()
      .references(() => fn.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: uniqueIndex("fn_draft_pk").on(t.fnId, t.userId),
  }),
);

export const fnDraftRelations = relations(fnDraft, ({ one }) => ({
  // Connect back to the Function
  fn: one(fn, {
    fields: [fnDraft.fnId],
    references: [fn.id],
  }),
  // Connect back to the User who owns the draft
  user: one(user, {
    fields: [fnDraft.userId],
    references: [user.id],
  }),
}));
