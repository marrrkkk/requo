CREATE TABLE "business_invite_links" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"role" "business_member_role" DEFAULT 'staff' NOT NULL,
	"token" text NOT NULL,
	"token_hash" text NOT NULL,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_invite_links_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "business_invite_links_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX "business_invite_links_business_unique" ON "business_invite_links" USING btree ("business_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "business_invite_links_token_unique" ON "business_invite_links" USING btree ("token");
--> statement-breakpoint
CREATE UNIQUE INDEX "business_invite_links_token_hash_unique" ON "business_invite_links" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX "business_invite_links_token_hash_idx" ON "business_invite_links" USING btree ("token_hash");
