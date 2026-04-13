CREATE TABLE "webhook_event" (
  "id" text PRIMARY KEY NOT NULL,
  "source" text NOT NULL,
  "external_id" text NOT NULL,
  "kind" text NOT NULL,
  "payload" jsonb,
  "received_at" timestamp with time zone DEFAULT now() NOT NULL,
  "processed_at" timestamp with time zone,
  "error" text
);

CREATE UNIQUE INDEX "webhook_event_source_external_unique"
  ON "webhook_event" USING btree ("source","external_id");
CREATE INDEX "webhook_event_received_at_idx"
  ON "webhook_event" USING btree ("received_at");
