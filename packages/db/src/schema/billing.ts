import {
  bigint,
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
import { organization } from "./organizations.js";

/**
 * Plan limits — the source of truth lives in code (packages/db/src/seed/plans.ts)
 * and is synced to this table on deploy. The DB copy exists so a query can
 * join subscription → plan → limits without hitting the app layer.
 */
export interface PlanLimits {
  maxFunctions: number;
  maxExecutionsPerDay: number;
  maxWallMs: number;
  maxCpuMs: number;
  maxMemoryMb: number;
  maxEgressKbPerExecution: number;
  maxSubrequestsPerExecution: number;
  maxCallDepth: number;
  maxSecretsPerFunction: number;
  maxTeamMembers: number;
}

export const plan = pgTable("plan", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** URL-safe plan identifier, e.g. "free", "pro", "team". */
  slug: text("slug").notNull().unique(),
  priceMonthlyCents: integer("price_monthly_cents").notNull().default(0),
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  stripeMeterId: text("stripe_meter_id"),
  stripeMeterEventName: text("stripe_meter_event_name"),
  limits: jsonb("limits").$type<PlanLimits>().notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
]);

export const subscription = pgTable(
  "subscription",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => plan.id, { onDelete: "restrict" }),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgUnique: uniqueIndex("subscription_org_unique").on(t.orgId),
    stripeSubIdx: index("subscription_stripe_sub_idx").on(t.stripeSubscriptionId),
  }),
);

/**
 * One row per billable event. Aggregated nightly and pushed to Stripe metered billing.
 */
export const usageEvent = pgTable(
  "usage_event",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // "execution" | "cpu_ms" | "egress_bytes" | ...
    quantity: bigint("quantity", { mode: "number" }).notNull(),
    executionId: text("execution_id"),
    ts: timestamp("ts", { withTimezone: true }).notNull(),
    reportedToStripeAt: timestamp("reported_to_stripe_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgTsIdx: index("usage_event_org_ts_idx").on(t.orgId, t.ts),
    unreportedIdx: index("usage_event_unreported_idx").on(t.reportedToStripeAt),
  }),
);
