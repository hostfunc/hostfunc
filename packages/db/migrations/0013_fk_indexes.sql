-- Cover all foreign-key columns that lacked a backing index. Without these,
-- the planner can fall back to sequential scans on the referencing table when
-- the parent row is updated/deleted (e.g. ON DELETE CASCADE), and joins
-- through the FK column are slower than they need to be.
CREATE INDEX IF NOT EXISTS "account_user_id_idx" ON "account" ("user_id");
CREATE INDEX IF NOT EXISTS "execution_version_id_idx" ON "execution" ("version_id");
CREATE INDEX IF NOT EXISTS "fn_created_by_id_idx" ON "fn" ("created_by_id");
CREATE INDEX IF NOT EXISTS "fn_ai_context_created_by_id_idx" ON "fn_ai_context" ("created_by_id");
CREATE INDEX IF NOT EXISTS "fn_comment_author_user_id_idx" ON "fn_comment" ("author_user_id");
CREATE INDEX IF NOT EXISTS "fn_draft_user_id_idx" ON "fn_draft" ("user_id");
CREATE INDEX IF NOT EXISTS "fn_fork_forked_by_user_id_idx" ON "fn_fork" ("forked_by_user_id");
CREATE INDEX IF NOT EXISTS "fn_version_created_by_id_idx" ON "fn_version" ("created_by_id");
CREATE INDEX IF NOT EXISTS "fn_version_asset_org_id_idx" ON "fn_version_asset" ("org_id");
CREATE INDEX IF NOT EXISTS "function_git_binding_created_by_user_id_idx" ON "function_git_binding" ("created_by_user_id");
CREATE INDEX IF NOT EXISTS "function_git_binding_fn_id_idx" ON "function_git_binding" ("fn_id");
CREATE INDEX IF NOT EXISTS "github_connection_audit_user_id_idx" ON "github_connection_audit" ("user_id");
CREATE INDEX IF NOT EXISTS "github_installation_created_by_user_id_idx" ON "github_installation" ("created_by_user_id");
CREATE INDEX IF NOT EXISTS "invitation_inviter_id_idx" ON "invitation" ("inviter_id");
CREATE INDEX IF NOT EXISTS "secret_created_by_id_idx" ON "secret" ("created_by_id");
CREATE INDEX IF NOT EXISTS "session_user_id_idx" ON "session" ("user_id");
CREATE INDEX IF NOT EXISTS "subscription_plan_id_idx" ON "subscription" ("plan_id");
