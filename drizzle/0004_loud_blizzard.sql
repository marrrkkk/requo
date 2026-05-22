CREATE TABLE "ai_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"user_id" text NOT NULL,
	"entity_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"task_type" text NOT NULL,
	"content" jsonb NOT NULL,
	"source_data_timestamp" timestamp with time zone NOT NULL,
	"is_stale" boolean DEFAULT false NOT NULL,
	"last_accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_token_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"business_id" text NOT NULL,
	"task_type" text NOT NULL,
	"model" text NOT NULL,
	"provider" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost_cents" integer,
	"cache_hit" boolean DEFAULT false NOT NULL,
	"latency_ms" integer NOT NULL,
	"status" text NOT NULL,
	"error_message" text,
	"unpriced" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"business_id" text NOT NULL,
	"task_type" text NOT NULL,
	"weight" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_drafts" ADD CONSTRAINT "ai_drafts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_drafts" ADD CONSTRAINT "ai_drafts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_drafts_entity_task_unique" ON "ai_drafts" USING btree ("entity_id","task_type");--> statement-breakpoint
CREATE INDEX "ai_drafts_business_idx" ON "ai_drafts" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "ai_drafts_user_idx" ON "ai_drafts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_drafts_last_accessed_idx" ON "ai_drafts" USING btree ("last_accessed_at");--> statement-breakpoint
CREATE INDEX "ai_token_logs_user_idx" ON "ai_token_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_token_logs_business_idx" ON "ai_token_logs" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "ai_token_logs_task_type_idx" ON "ai_token_logs" USING btree ("task_type");--> statement-breakpoint
CREATE INDEX "ai_token_logs_created_at_idx" ON "ai_token_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_token_logs_provider_idx" ON "ai_token_logs" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "ai_usage_events_user_month_idx" ON "ai_usage_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_events_business_month_idx" ON "ai_usage_events" USING btree ("business_id","created_at");