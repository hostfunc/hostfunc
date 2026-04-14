ALTER TABLE "plan" ADD COLUMN IF NOT EXISTS "stripe_product_id" text;
ALTER TABLE "plan" ADD COLUMN IF NOT EXISTS "stripe_meter_id" text;
ALTER TABLE "plan" ADD COLUMN IF NOT EXISTS "stripe_meter_event_name" text;
