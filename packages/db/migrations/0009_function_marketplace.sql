CREATE TYPE "public"."marketplace_category" AS ENUM('utilities', 'ai', 'data', 'integrations', 'notifications', 'webhooks', 'automation');--> statement-breakpoint

ALTER TABLE "fn" ALTER COLUMN "visibility" SET DEFAULT 'public';--> statement-breakpoint
ALTER TABLE "fn" ADD COLUMN "forked_from_fn_id" text;--> statement-breakpoint

CREATE TABLE "fn_marketplace_profile" (
	"fn_id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"category" "marketplace_category" DEFAULT 'utilities' NOT NULL,
	"use_cases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"short_description" text DEFAULT '' NOT NULL,
	"readme" text DEFAULT '' NOT NULL,
	"featured_rank" integer,
	"published_at" timestamp with time zone,
	"fork_count" integer DEFAULT 0 NOT NULL,
	"star_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "fn_star" (
	"fn_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fn_star_pk" PRIMARY KEY("fn_id","user_id")
);--> statement-breakpoint

CREATE TABLE "fn_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"fn_id" text NOT NULL,
	"author_user_id" text NOT NULL,
	"parent_comment_id" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "fn_fork" (
	"source_fn_id" text NOT NULL,
	"forked_fn_id" text NOT NULL,
	"forked_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fn_fork_pk" PRIMARY KEY("source_fn_id","forked_fn_id")
);--> statement-breakpoint

ALTER TABLE "fn" ADD CONSTRAINT "fn_forked_from_fn_id_fn_id_fk" FOREIGN KEY ("forked_from_fn_id") REFERENCES "public"."fn"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fn_marketplace_profile" ADD CONSTRAINT "fn_marketplace_profile_fn_id_fn_id_fk" FOREIGN KEY ("fn_id") REFERENCES "public"."fn"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fn_marketplace_profile" ADD CONSTRAINT "fn_marketplace_profile_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fn_star" ADD CONSTRAINT "fn_star_fn_id_fn_id_fk" FOREIGN KEY ("fn_id") REFERENCES "public"."fn"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fn_star" ADD CONSTRAINT "fn_star_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fn_comment" ADD CONSTRAINT "fn_comment_fn_id_fn_id_fk" FOREIGN KEY ("fn_id") REFERENCES "public"."fn"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fn_comment" ADD CONSTRAINT "fn_comment_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fn_comment" ADD CONSTRAINT "fn_comment_parent_comment_id_fn_comment_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."fn_comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fn_fork" ADD CONSTRAINT "fn_fork_source_fn_id_fn_id_fk" FOREIGN KEY ("source_fn_id") REFERENCES "public"."fn"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fn_fork" ADD CONSTRAINT "fn_fork_forked_fn_id_fn_id_fk" FOREIGN KEY ("forked_fn_id") REFERENCES "public"."fn"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fn_fork" ADD CONSTRAINT "fn_fork_forked_by_user_id_user_id_fk" FOREIGN KEY ("forked_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "fn_forked_from_idx" ON "fn" USING btree ("forked_from_fn_id");--> statement-breakpoint
CREATE INDEX "fn_marketplace_profile_org_idx" ON "fn_marketplace_profile" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "fn_marketplace_profile_category_idx" ON "fn_marketplace_profile" USING btree ("category");--> statement-breakpoint
CREATE INDEX "fn_marketplace_profile_featured_idx" ON "fn_marketplace_profile" USING btree ("featured_rank");--> statement-breakpoint
CREATE INDEX "fn_marketplace_profile_published_idx" ON "fn_marketplace_profile" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "fn_star_user_idx" ON "fn_star" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fn_comment_fn_created_idx" ON "fn_comment" USING btree ("fn_id","created_at");--> statement-breakpoint
CREATE INDEX "fn_comment_parent_idx" ON "fn_comment" USING btree ("parent_comment_id");--> statement-breakpoint
CREATE INDEX "fn_fork_source_idx" ON "fn_fork" USING btree ("source_fn_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fn_fork_forked_unique" ON "fn_fork" USING btree ("forked_fn_id");
