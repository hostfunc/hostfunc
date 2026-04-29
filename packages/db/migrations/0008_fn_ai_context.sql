CREATE TYPE "public"."fn_ai_context_kind" AS ENUM('note', 'url', 'file');--> statement-breakpoint

CREATE TABLE "fn_ai_context" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"fn_id" text NOT NULL,
	"created_by_id" text NOT NULL,
	"kind" "fn_ai_context_kind" NOT NULL,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"source_uri" text,
	"mime" text,
	"bytes" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "fn_ai_context" ADD CONSTRAINT "fn_ai_context_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fn_ai_context" ADD CONSTRAINT "fn_ai_context_fn_id_fn_id_fk" FOREIGN KEY ("fn_id") REFERENCES "public"."fn"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fn_ai_context" ADD CONSTRAINT "fn_ai_context_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "fn_ai_context_fn_idx" ON "fn_ai_context" USING btree ("fn_id");--> statement-breakpoint
CREATE INDEX "fn_ai_context_org_idx" ON "fn_ai_context" USING btree ("org_id");
