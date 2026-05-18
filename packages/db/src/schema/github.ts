import {
  boolean,
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
import { fn } from "./functions.js";
import { organization } from "./organizations.js";

export const githubInstallationStatusEnum = pgEnum("github_installation_status", [
  "active",
  "disconnected",
]);

export const gitProviderEnum = pgEnum("git_provider", ["github"]);

export const githubInstallation = pgTable(
  "github_installation",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    githubInstallationId: integer("github_installation_id").notNull(),
    githubAccountLogin: text("github_account_login").notNull(),
    githubAccountType: text("github_account_type").notNull(),
    status: githubInstallationStatusEnum("status").notNull().default("active"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgInstallationUnique: uniqueIndex("github_installation_org_installation_unique").on(
      t.orgId,
      t.githubInstallationId,
    ),
    orgIdx: index("github_installation_org_idx").on(t.orgId),
  }),
);

export const githubRepoAccess = pgTable(
  "github_repo_access",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    githubInstallationId: integer("github_installation_id").notNull(),
    repoId: integer("repo_id").notNull(),
    owner: text("owner").notNull(),
    ownerAvatarUrl: text("owner_avatar_url").notNull().default(""),
    name: text("name").notNull(),
    fullName: text("full_name").notNull(),
    defaultBranch: text("default_branch").notNull(),
    isPrivate: boolean("is_private").notNull().default(false),
    isArchived: boolean("is_archived").notNull().default(false),
    permissionsJson: jsonb("permissions_json")
      .$type<Record<string, boolean>>()
      .notNull()
      .default({}),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgRepoUnique: uniqueIndex("github_repo_access_org_repo_unique").on(t.orgId, t.repoId),
    orgInstallationIdx: index("github_repo_access_org_installation_idx").on(
      t.orgId,
      t.githubInstallationId,
    ),
    orgFullNameIdx: index("github_repo_access_org_full_name_idx").on(t.orgId, t.fullName),
  }),
);

export const functionGitBinding = pgTable(
  "function_git_binding",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    fnId: text("fn_id")
      .notNull()
      .references(() => fn.id, { onDelete: "cascade" }),
    provider: gitProviderEnum("provider").notNull().default("github"),
    repoId: integer("repo_id").notNull(),
    repoFullName: text("repo_full_name").notNull(),
    branch: text("branch").notNull(),
    pathPrefix: text("path_prefix"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgFnProviderUnique: uniqueIndex("function_git_binding_org_fn_provider_unique").on(
      t.orgId,
      t.fnId,
      t.provider,
    ),
    orgFnIdx: index("function_git_binding_org_fn_idx").on(t.orgId, t.fnId),
  }),
);

export const githubConnectionAudit = pgTable(
  "github_connection_audit",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    eventType: text("event_type").notNull(),
    status: text("status").notNull(),
    detailJson: jsonb("detail_json").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgCreatedIdx: index("github_connection_audit_org_created_idx").on(t.orgId, t.createdAt),
  }),
);
