CREATE TYPE "public"."git_provider" AS ENUM('github');--> statement-breakpoint
CREATE TYPE "public"."github_installation_status" AS ENUM('active', 'disconnected');--> statement-breakpoint

CREATE TABLE "function_git_binding" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"fn_id" text NOT NULL,
	"provider" "git_provider" DEFAULT 'github' NOT NULL,
	"repo_id" integer NOT NULL,
	"repo_full_name" text NOT NULL,
	"branch" text NOT NULL,
	"path_prefix" text,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "github_connection_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"event_type" text NOT NULL,
	"status" text NOT NULL,
	"detail_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "github_installation" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"github_installation_id" integer NOT NULL,
	"github_account_login" text NOT NULL,
	"github_account_type" text NOT NULL,
	"status" "github_installation_status" DEFAULT 'active' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "github_repo_access" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"github_installation_id" integer NOT NULL,
	"repo_id" integer NOT NULL,
	"owner" text NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"default_branch" text NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"permissions_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "function_git_binding" ADD CONSTRAINT "function_git_binding_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "function_git_binding" ADD CONSTRAINT "function_git_binding_fn_id_fn_id_fk" FOREIGN KEY ("fn_id") REFERENCES "public"."fn"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "function_git_binding" ADD CONSTRAINT "function_git_binding_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_connection_audit" ADD CONSTRAINT "github_connection_audit_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_connection_audit" ADD CONSTRAINT "github_connection_audit_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installation" ADD CONSTRAINT "github_installation_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installation" ADD CONSTRAINT "github_installation_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_repo_access" ADD CONSTRAINT "github_repo_access_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX "function_git_binding_org_fn_provider_unique" ON "function_git_binding" USING btree ("org_id","fn_id","provider");--> statement-breakpoint
CREATE INDEX "function_git_binding_org_fn_idx" ON "function_git_binding" USING btree ("org_id","fn_id");--> statement-breakpoint
CREATE INDEX "github_connection_audit_org_created_idx" ON "github_connection_audit" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "github_installation_org_installation_unique" ON "github_installation" USING btree ("org_id","github_installation_id");--> statement-breakpoint
CREATE INDEX "github_installation_org_idx" ON "github_installation" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "github_repo_access_org_repo_unique" ON "github_repo_access" USING btree ("org_id","repo_id");--> statement-breakpoint
CREATE INDEX "github_repo_access_org_installation_idx" ON "github_repo_access" USING btree ("org_id","github_installation_id");--> statement-breakpoint
CREATE INDEX "github_repo_access_org_full_name_idx" ON "github_repo_access" USING btree ("org_id","full_name");
