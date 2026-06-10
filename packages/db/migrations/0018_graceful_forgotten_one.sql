ALTER TABLE "trigger" ADD COLUMN "email_address" text;--> statement-breakpoint
ALTER TABLE "custom_domain" ADD COLUMN "resend_domain_id" text;--> statement-breakpoint
ALTER TABLE "custom_domain" ADD COLUMN "email_status" text;--> statement-breakpoint
ALTER TABLE "custom_domain" ADD COLUMN "email_records" jsonb;--> statement-breakpoint
ALTER TABLE "custom_domain" ADD COLUMN "email_status_checked_at" timestamp with time zone;--> statement-breakpoint
UPDATE "trigger" SET "email_address" = lower("config"->'email'->>'address') WHERE "kind" = 'email' AND "config"->'email'->>'address' IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "trigger_email_address_unique" ON "trigger" USING btree ("email_address");