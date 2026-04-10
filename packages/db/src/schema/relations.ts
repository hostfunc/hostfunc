import { relations } from "drizzle-orm";
import { user, session, account } from "./auth.js";
import { invitation, member, organization } from "./organizations.js";
import { fn, fnDraft, fnVersion } from "./functions.js";
import { trigger } from "./triggers.js";
import { secret } from "./secrets.js";
import { execution, executionLog } from "./executions.js";
import { plan, subscription } from "./billing.js";
import { apiToken } from "./tokens.js";

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  memberships: many(member),
  createdFns: many(fn),
  apiTokens: many(apiToken),
}));

export const organizationRelations = relations(organization, ({ many, one }) => ({
  members: many(member),
  invitations: many(invitation),
  functions: many(fn),
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
}));

export const fnVersionRelations = relations(fnVersion, ({ one, many }) => ({
  fn: one(fn, {
    fields: [fnVersion.fnId],
    references: [fn.id],
  }),
  executions: many(execution),
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
      references: [user.id],    // To the primary key on user
    }),
  }));
  
  export const accountRelations = relations(account, ({ one }) => ({
    user: one(user, {
      fields: [account.userId], // Connects the foreign key on account
      references: [user.id],    // To the primary key on user
    }),
  }));