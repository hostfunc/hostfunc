ALTER TYPE "public"."fn_asset_kind" ADD VALUE IF NOT EXISTS 'html' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."fn_asset_kind" ADD VALUE IF NOT EXISTS 'style' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."fn_asset_kind" ADD VALUE IF NOT EXISTS 'script' BEFORE 'other';
