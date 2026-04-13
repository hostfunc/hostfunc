import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const webhookEvent = pgTable(
  "webhook_event",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    kind: text("kind").notNull(),
    payload: jsonb("payload"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    error: text("error"),
  },
  (t) => ({
    sourceExternalUnique: uniqueIndex("webhook_event_source_external_unique").on(
      t.source,
      t.externalId,
    ),
    receivedAtIdx: index("webhook_event_received_at_idx").on(t.receivedAt),
  }),
);
