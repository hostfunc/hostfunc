-- Per-function logo image. Stores a Supabase Storage public URL, or null when
-- the function has no custom logo (the UI falls back to the default mark).
ALTER TABLE "fn" ADD COLUMN "logo" text;
