import {
  type AnyPgColumn,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { fn } from "./functions.js";
import { organization } from "./organizations.js";

export const marketplaceCategoryEnum = pgEnum("marketplace_category", [
  "utilities",
  "ai",
  "data",
  "integrations",
  "notifications",
  "webhooks",
  "automation",
]);

export const fnMarketplaceProfile = pgTable(
  "fn_marketplace_profile",
  {
    fnId: text("fn_id")
      .primaryKey()
      .references(() => fn.id, { onDelete: "cascade" }),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    category: marketplaceCategoryEnum("category").notNull().default("utilities"),
    useCases: jsonb("use_cases").$type<string[]>().notNull().default([]),
    shortDescription: text("short_description").notNull().default(""),
    readme: text("readme").notNull().default(""),
    featuredRank: integer("featured_rank"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    forkCount: integer("fork_count").notNull().default(0),
    starCount: integer("star_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("fn_marketplace_profile_org_idx").on(t.orgId),
    categoryIdx: index("fn_marketplace_profile_category_idx").on(t.category),
    featuredIdx: index("fn_marketplace_profile_featured_idx").on(t.featuredRank),
    publishedIdx: index("fn_marketplace_profile_published_idx").on(t.publishedAt),
  }),
);

export const fnStar = pgTable(
  "fn_star",
  {
    fnId: text("fn_id")
      .notNull()
      .references(() => fn.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.fnId, t.userId], name: "fn_star_pk" }),
    userIdx: index("fn_star_user_idx").on(t.userId),
  }),
);

export const fnComment = pgTable(
  "fn_comment",
  {
    id: text("id").primaryKey(),
    fnId: text("fn_id")
      .notNull()
      .references(() => fn.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    parentCommentId: text("parent_comment_id").references((): AnyPgColumn => fnComment.id, {
      onDelete: "cascade",
    }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    fnCreatedIdx: index("fn_comment_fn_created_idx").on(t.fnId, t.createdAt),
    parentIdx: index("fn_comment_parent_idx").on(t.parentCommentId),
  }),
);

export const fnFork = pgTable(
  "fn_fork",
  {
    sourceFnId: text("source_fn_id")
      .notNull()
      .references(() => fn.id, { onDelete: "cascade" }),
    forkedFnId: text("forked_fn_id")
      .notNull()
      .references(() => fn.id, { onDelete: "cascade" }),
    forkedByUserId: text("forked_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.sourceFnId, t.forkedFnId], name: "fn_fork_pk" }),
    sourceIdx: index("fn_fork_source_idx").on(t.sourceFnId),
    forkedUnique: uniqueIndex("fn_fork_forked_unique").on(t.forkedFnId),
  }),
);
