CREATE TABLE "fn_kv" (
	"fn_id" text NOT NULL,
	"org_id" text NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fn_kv_fn_id_key_pk" PRIMARY KEY("fn_id","key")
);
--> statement-breakpoint
ALTER TABLE "fn_kv" ADD CONSTRAINT "fn_kv_fn_id_fn_id_fk" FOREIGN KEY ("fn_id") REFERENCES "public"."fn"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fn_kv" ADD CONSTRAINT "fn_kv_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fn_kv_org_idx" ON "fn_kv" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "fn_kv_expires_idx" ON "fn_kv" USING btree ("fn_id","expires_at");