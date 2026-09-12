UPDATE "inquiries" SET "source" = 'service_form' WHERE "source" = 'public-inquiry-page';--> statement-breakpoint
UPDATE "inquiries" SET "source" = 'manual' WHERE "source" = 'manual-dashboard';--> statement-breakpoint
UPDATE "inquiries" SET "source" = 'ai_assistant' WHERE "source" IN ('ai_agent', 'ai_agent_handoff', 'ai');--> statement-breakpoint
UPDATE "inquiries" SET "source" = 'unknown' WHERE "source" IS NULL;--> statement-breakpoint
DROP INDEX "inquiries_business_service_category_idx";--> statement-breakpoint
ALTER TABLE "inquiries" ALTER COLUMN "service_category" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "inquiries_business_source_idx" ON "inquiries" USING btree ("business_id","source");