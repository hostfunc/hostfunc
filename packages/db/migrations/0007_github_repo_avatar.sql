ALTER TABLE "github_repo_access"
ADD COLUMN "owner_avatar_url" text NOT NULL DEFAULT '';

UPDATE "github_repo_access"
SET "owner_avatar_url" = 'https://github.com/' || "owner" || '.png?size=64'
WHERE "owner_avatar_url" = '';
