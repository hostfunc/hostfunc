CREATE TYPE "public"."custom_domain_status" AS ENUM('pending_dns', 'pending_ssl', 'active', 'failed');--> statement-breakpoint
CREATE TABLE "custom_domain" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"fn_id" text NOT NULL,
	"hostname" text NOT NULL,
	"cf_hostname_id" text,
	"status" "custom_domain_status" DEFAULT 'pending_dns' NOT NULL,
	"ssl_status" text,
	"dcv_records" jsonb,
	"ownership_verification" jsonb,
	"last_error" text,
	"created_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "custom_domain" ADD CONSTRAINT "custom_domain_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_domain" ADD CONSTRAINT "custom_domain_fn_id_fn_id_fk" FOREIGN KEY ("fn_id") REFERENCES "public"."fn"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_domain" ADD CONSTRAINT "custom_domain_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "custom_domain_hostname_unique" ON "custom_domain" USING btree ("hostname");--> statement-breakpoint
CREATE INDEX "custom_domain_org_idx" ON "custom_domain" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "custom_domain_fn_idx" ON "custom_domain" USING btree ("fn_id");--> statement-breakpoint
-- Match the RLS lock-down applied to every other table in 0012_enable_rls.
ALTER TABLE "custom_domain" ENABLE ROW LEVEL SECURITY;