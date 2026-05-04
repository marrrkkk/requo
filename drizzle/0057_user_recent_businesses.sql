CREATE TABLE "user_recent_businesses" (
  "user_id" text NOT NULL,
  "business_id" text NOT NULL,
  "last_opened_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_recent_businesses"
  ADD CONSTRAINT "user_recent_businesses_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_recent_businesses"
  ADD CONSTRAINT "user_recent_businesses_business_id_businesses_id_fk"
  FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "user_recent_businesses_user_business_unique"
  ON "user_recent_businesses" USING btree ("user_id","business_id");
--> statement-breakpoint
CREATE INDEX "user_recent_businesses_user_recent_idx"
  ON "user_recent_businesses" USING btree ("user_id","last_opened_at");
--> statement-breakpoint
CREATE INDEX "user_recent_businesses_business_id_idx"
  ON "user_recent_businesses" USING btree ("business_id");
