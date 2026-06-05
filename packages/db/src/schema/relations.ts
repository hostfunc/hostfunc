import { relations } from "drizzle-orm";
import { account, session, user } from "./auth.js";
import { plan, subscription } from "./billing.js";
import { customDomain } from "./customDomains.js";
import { execution, executionLog } from "./executions.js";
import { fnAiContext } from "./fnAiContext.js";
import { fnAsset, fnVersionAsset } from "./fnAssets.js";
import { fn, fnDraft, fnVersion } from "./functions.js";
import {
  functionGitBinding,
  githubConnectionAudit,
  githubInstallation,
  githubRepoAccess,
} from "./github.js";
import { fnComment, fnFork, fnMarketplaceProfile, fnStar } from "./marketplace.js";
import { invitation, member, organization } from "./organizations.js";
import { secret } from "./secrets.js";
import { apiToken } from "./tokens.js";
import { trigger } from "./triggers.js";

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  memberships: many(member),
  createdFns: many(fn),
  apiTokens: many(apiToken),
  stars: many(fnStar),
  comments: many(fnComment),
  forks: many(fnFork),
}));

export const organizationRelations = relations(organization, ({ many, one }) => ({
  members: many(member),
  invitations: many(invitation),
  functions: many(fn),
  githubInstallations: many(githubInstallation),
  githubRepoAccess: many(githubRepoAccess),
  functionGitBindings: many(functionGitBinding),
  githubConnectionAudits: many(githubConnectionAudit),
  customDomains: many(customDomain),
  subscription: one(subscription),
}));

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
}));

export const fnRelations = relations(fn, ({ one, many }) => ({
  organization: one(organization, {
    fields: [fn.orgId],
    references: [organization.id],
  }),
  createdBy: one(user, {
    fields: [fn.createdById],
    references: [user.id],
  }),
  currentVersion: one(fnVersion, {
    fields: [fn.currentVersionId],
    references: [fnVersion.id],
  }),
  versions: many(fnVersion),
  drafts: many(fnDraft),
  triggers: many(trigger),
  secrets: many(secret),
  executions: many(execution),
  gitBindings: many(functionGitBinding),
  aiContexts: many(fnAiContext),
  marketplaceProfile: one(fnMarketplaceProfile),
  stars: many(fnStar),
  comments: many(fnComment),
  sourceForks: many(fnFork, { relationName: "sourceFn" }),
  forkRecord: one(fnFork, {
    fields: [fn.id],
    references: [fnFork.forkedFnId],
    relationName: "forkedFn",
  }),
  assets: many(fnAsset),
  versionAssets: many(fnVersionAsset),
  customDomains: many(customDomain),
}));

export const fnMarketplaceProfileRelations = relations(fnMarketplaceProfile, ({ one }) => ({
  fn: one(fn, { fields: [fnMarketplaceProfile.fnId], references: [fn.id] }),
  organization: one(organization, {
    fields: [fnMarketplaceProfile.orgId],
    references: [organization.id],
  }),
}));

export const fnStarRelations = relations(fnStar, ({ one }) => ({
  fn: one(fn, { fields: [fnStar.fnId], references: [fn.id] }),
  user: one(user, { fields: [fnStar.userId], references: [user.id] }),
}));

export const fnCommentRelations = relations(fnComment, ({ one, many }) => ({
  fn: one(fn, { fields: [fnComment.fnId], references: [fn.id] }),
  author: one(user, { fields: [fnComment.authorUserId], references: [user.id] }),
  parent: one(fnComment, {
    fields: [fnComment.parentCommentId],
    references: [fnComment.id],
    relationName: "commentReplies",
  }),
  replies: many(fnComment, { relationName: "commentReplies" }),
}));

export const fnForkRelations = relations(fnFork, ({ one }) => ({
  sourceFn: one(fn, {
    fields: [fnFork.sourceFnId],
    references: [fn.id],
    relationName: "sourceFn",
  }),
  forkedFn: one(fn, {
    fields: [fnFork.forkedFnId],
    references: [fn.id],
    relationName: "forkedFn",
  }),
  forkedBy: one(user, { fields: [fnFork.forkedByUserId], references: [user.id] }),
}));

export const fnAiContextRelations = relations(fnAiContext, ({ one }) => ({
  fn: one(fn, { fields: [fnAiContext.fnId], references: [fn.id] }),
  organization: one(organization, {
    fields: [fnAiContext.orgId],
    references: [organization.id],
  }),
  createdBy: one(user, {
    fields: [fnAiContext.createdById],
    references: [user.id],
  }),
}));

export const fnVersionRelations = relations(fnVersion, ({ one, many }) => ({
  fn: one(fn, {
    fields: [fnVersion.fnId],
    references: [fn.id],
  }),
  executions: many(execution),
  assets: many(fnVersionAsset),
}));

export const fnAssetRelations = relations(fnAsset, ({ one }) => ({
  fn: one(fn, { fields: [fnAsset.fnId], references: [fn.id] }),
  organization: one(organization, {
    fields: [fnAsset.orgId],
    references: [organization.id],
  }),
}));

export const fnVersionAssetRelations = relations(fnVersionAsset, ({ one }) => ({
  fn: one(fn, { fields: [fnVersionAsset.fnId], references: [fn.id] }),
  version: one(fnVersion, {
    fields: [fnVersionAsset.versionId],
    references: [fnVersion.id],
  }),
  organization: one(organization, {
    fields: [fnVersionAsset.orgId],
    references: [organization.id],
  }),
}));

export const customDomainRelations = relations(customDomain, ({ one }) => ({
  organization: one(organization, {
    fields: [customDomain.orgId],
    references: [organization.id],
  }),
  fn: one(fn, { fields: [customDomain.fnId], references: [fn.id] }),
  createdBy: one(user, {
    fields: [customDomain.createdById],
    references: [user.id],
  }),
}));

export const triggerRelations = relations(trigger, ({ one }) => ({
  fn: one(fn, { fields: [trigger.fnId], references: [fn.id] }),
  organization: one(organization, {
    fields: [trigger.orgId],
    references: [organization.id],
  }),
}));

export const secretRelations = relations(secret, ({ one }) => ({
  fn: one(fn, { fields: [secret.fnId], references: [fn.id] }),
  organization: one(organization, {
    fields: [secret.orgId],
    references: [organization.id],
  }),
}));

export const executionRelations = relations(execution, ({ one, many }) => ({
  fn: one(fn, { fields: [execution.fnId], references: [fn.id] }),
  version: one(fnVersion, {
    fields: [execution.versionId],
    references: [fnVersion.id],
  }),
  organization: one(organization, {
    fields: [execution.orgId],
    references: [organization.id],
  }),
  logs: many(executionLog),
}));

export const executionLogRelations = relations(executionLog, ({ one }) => ({
  execution: one(execution, {
    fields: [executionLog.executionId],
    references: [execution.id],
  }),
}));

export const subscriptionRelations = relations(subscription, ({ one }) => ({
  organization: one(organization, {
    fields: [subscription.orgId],
    references: [organization.id],
  }),
  plan: one(plan, { fields: [subscription.planId], references: [plan.id] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId], // Connects the foreign key on session
    references: [user.id], // To the primary key on user
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId], // Connects the foreign key on account
    references: [user.id], // To the primary key on user
  }),
}));

export const githubInstallationRelations = relations(githubInstallation, ({ one, many }) => ({
  organization: one(organization, {
    fields: [githubInstallation.orgId],
    references: [organization.id],
  }),
  createdBy: one(user, {
    fields: [githubInstallation.createdByUserId],
    references: [user.id],
  }),
  repos: many(githubRepoAccess),
}));

export const githubRepoAccessRelations = relations(githubRepoAccess, ({ one }) => ({
  organization: one(organization, {
    fields: [githubRepoAccess.orgId],
    references: [organization.id],
  }),
}));

export const functionGitBindingRelations = relations(functionGitBinding, ({ one }) => ({
  organization: one(organization, {
    fields: [functionGitBinding.orgId],
    references: [organization.id],
  }),
  fn: one(fn, {
    fields: [functionGitBinding.fnId],
    references: [fn.id],
  }),
  createdBy: one(user, {
    fields: [functionGitBinding.createdByUserId],
    references: [user.id],
  }),
}));

export const githubConnectionAuditRelations = relations(githubConnectionAudit, ({ one }) => ({
  organization: one(organization, {
    fields: [githubConnectionAudit.orgId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [githubConnectionAudit.userId],
    references: [user.id],
  }),
}));
