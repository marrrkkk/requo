ALTER TYPE "public"."business_notification_type" ADD VALUE 'automation';--> statement-breakpoint
CREATE TABLE "analytics_daily_rollups" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"date" date NOT NULL,
	"form_views" integer DEFAULT 0 NOT NULL,
	"unique_visitors" integer DEFAULT 0 NOT NULL,
	"inquiry_submissions" integer DEFAULT 0 NOT NULL,
	"quotes_sent" integer DEFAULT 0 NOT NULL,
	"quotes_accepted" integer DEFAULT 0 NOT NULL,
	"quotes_rejected" integer DEFAULT 0 NOT NULL,
	"revenue_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_members" ADD COLUMN "dashboard_tour_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "analytics_digest_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "industry_category" text;--> statement-breakpoint
ALTER TABLE "business_automations" ADD COLUMN "consecutive_failures" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics_daily_rollups" ADD CONSTRAINT "analytics_daily_rollups_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_daily_rollups_business_date_idx" ON "analytics_daily_rollups" USING btree ("business_id","date");--> statement-breakpoint
CREATE INDEX "analytics_daily_rollups_date_idx" ON "analytics_daily_rollups" USING btree ("date");