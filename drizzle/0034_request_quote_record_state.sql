DO $$
BEGIN
  ALTER TYPE "public"."quote_status" ADD VALUE 'voided';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "archived_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "archived_by" text;
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "deleted_by" text;
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "archived_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "archived_by" text;
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "deleted_by" text;
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "voided_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "voided_by" text;
--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_archived_by_user_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_archived_by_user_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_voided_by_user_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "inquiries_business_archived_at_idx" ON "inquiries" USING btree ("business_id","archived_at");
--> statement-breakpoint
CREATE INDEX "inquiries_business_deleted_at_idx" ON "inquiries" USING btree ("business_id","deleted_at");
--> statement-breakpoint
CREATE INDEX "quotes_business_archived_at_idx" ON "quotes" USING btree ("business_id","archived_at");
--> statement-breakpoint
CREATE INDEX "quotes_business_deleted_at_idx" ON "quotes" USING btree ("business_id","deleted_at");
--> statement-breakpoint
DROP INDEX IF EXISTS "inquiries_open_deadline_idx";
--> statement-breakpoint
CREATE INDEX "inquiries_open_deadline_idx" ON "inquiries" USING btree ("business_id","requested_deadline","submitted_at") WHERE ("quote_requested" = true AND "requested_deadline" IS NOT NULL AND "status" IN ('new', 'waiting') AND "archived_at" IS NULL AND "deleted_at" IS NULL);
--> statement-breakpoint
DROP INDEX IF EXISTS "quotes_sent_valid_until_idx";
--> statement-breakpoint
CREATE INDEX "quotes_sent_valid_until_idx" ON "quotes" USING btree ("business_id","expires_at") WHERE ("status" = 'sent' AND "deleted_at" IS NULL);
--> statement-breakpoint
DROP INDEX IF EXISTS "quotes_sent_follow_up_idx";
--> statement-breakpoint
CREATE INDEX "quotes_sent_follow_up_idx" ON "quotes" USING btree ("business_id","sent_at") WHERE ("status" = 'sent' AND "customer_responded_at" IS NULL AND "deleted_at" IS NULL);
--> statement-breakpoint
UPDATE "inquiries"
SET "archived_at" = COALESCE("updated_at", "created_at", "submitted_at", now())
WHERE "status" = 'archived' AND "archived_at" IS NULL;
