CREATE INDEX IF NOT EXISTS "inquiries_business_status_created_at_idx" ON "inquiries" USING btree ("business_id","status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotes_business_status_created_at_idx" ON "quotes" USING btree ("business_id","status","created_at");--> statement-breakpoint
ALTER TABLE "businesses" DROP COLUMN "ai_tone_preference";--> statement-breakpoint
DROP TYPE "public"."business_ai_tone_preference";