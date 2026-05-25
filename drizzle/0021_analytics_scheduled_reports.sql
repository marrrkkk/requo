CREATE TABLE "analytics_goal_thresholds" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"metric_key" text NOT NULL,
	"target_value" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_scheduled_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"recipient_emails" text[] NOT NULL,
	"schedule" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics_goal_thresholds" ADD CONSTRAINT "analytics_goal_thresholds_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_scheduled_reports" ADD CONSTRAINT "analytics_scheduled_reports_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_goal_thresholds_business_metric_idx" ON "analytics_goal_thresholds" USING btree ("business_id","metric_key");--> statement-breakpoint
CREATE INDEX "analytics_scheduled_reports_business_idx" ON "analytics_scheduled_reports" USING btree ("business_id");