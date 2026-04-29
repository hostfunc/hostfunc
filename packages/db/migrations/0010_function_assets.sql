CREATE TYPE "public"."fn_asset_kind" AS ENUM('readme', 'image', 'font', 'other');--> statement-breakpoint

CREATE TABLE "fn_asset" (
	"id" text PRIMARY KEY NOT NULL,
	"fn_id" text NOT NULL,
	"org_id" text NOT NULL,
	"path" text NOT NULL,
	"kind" "fn_asset_kind" DEFAULT 'other' NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"content" bytea NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "fn_version_asset" (
	"id" text PRIMARY KEY NOT NULL,
	"version_id" text NOT NULL,
	"fn_id" text NOT NULL,
	"org_id" text NOT NULL,
	"path" text NOT NULL,
	"kind" "fn_asset_kind" DEFAULT 'other' NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"content" bytea NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "fn_asset" ADD CONSTRAINT "fn_asset_fn_id_fn_id_fk" FOREIGN KEY ("fn_id") REFERENCES "public"."fn"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fn_asset" ADD CONSTRAINT "fn_asset_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fn_version_asset" ADD CONSTRAINT "fn_version_asset_version_id_fn_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."fn_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fn_version_asset" ADD CONSTRAINT "fn_version_asset_fn_id_fn_id_fk" FOREIGN KEY ("fn_id") REFERENCES "public"."fn"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fn_version_asset" ADD CONSTRAINT "fn_version_asset_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX "fn_asset_fn_path_unique" ON "fn_asset" USING btree ("fn_id","path");--> statement-breakpoint
CREATE INDEX "fn_asset_fn_idx" ON "fn_asset" USING btree ("fn_id");--> statement-breakpoint
CREATE INDEX "fn_asset_org_idx" ON "fn_asset" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fn_version_asset_version_path_unique" ON "fn_version_asset" USING btree ("version_id","path");--> statement-breakpoint
CREATE INDEX "fn_version_asset_fn_version_idx" ON "fn_version_asset" USING btree ("fn_id","version_id");
