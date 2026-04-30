UPDATE "trigger" AS t
SET "config" = jsonb_set(
  COALESCE(t."config", '{}'::jsonb),
  '{http,requireAuth}',
  'false'::jsonb,
  true
)
FROM "fn" AS f
WHERE t."fn_id" = f."id"
  AND t."kind" = 'http'
  AND f."visibility" = 'public'
  AND COALESCE(t."config"->'http'->>'requireAuth', 'true') <> 'false';
