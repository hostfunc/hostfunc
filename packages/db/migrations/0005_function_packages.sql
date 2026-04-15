ALTER TABLE "fn" ADD COLUMN IF NOT EXISTS "packages" jsonb NOT NULL DEFAULT '[]'::jsonb;
