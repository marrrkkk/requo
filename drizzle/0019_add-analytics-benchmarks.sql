CREATE TABLE "analytics_annotations" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"date" date NOT NULL,
	"label" text NOT NULL,
	"color" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_benchmarks" (
	"id" text PRIMARY KEY NOT NULL,
	"industry_category" text NOT NULL,
	"size_tier" text NOT NULL,
	"metric_key" text NOT NULL,
	"median_value" double precision NOT NULL,
	"business_count" integer NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "analytics_goal_thresholds" CASCADE;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "analytics_annotations" ADD CONSTRAINT "analytics_annotations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_annotations" ADD CONSTRAINT "analytics_annotations_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_annotations_business_date_idx" ON "analytics_annotations" USING btree ("business_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_benchmarks_category_size_metric_idx" ON "analytics_benchmarks" USING btree ("industry_category","size_tier","metric_key");