ALTER TABLE "inquiries" ADD COLUMN "first_viewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "first_viewed_by" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_first_viewed_by_user_id_fk" FOREIGN KEY ("first_viewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "inquiries" SET "first_viewed_at" = "created_at" WHERE "first_viewed_at" IS NULL;--> statement-breakpoint
CREATE INDEX "inquiries_business_unviewed_idx" ON "inquiries" USING btree ("business_id") WHERE "inquiries"."first_viewed_at" is null and "inquiries"."archived_at" is null and "inquiries"."deleted_at" is null;