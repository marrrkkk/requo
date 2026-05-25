CREATE TYPE "public"."automation_job_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."automation_log_status" AS ENUM('success', 'partial_failure', 'failure');--> statement-breakpoint
CREATE TYPE "public"."trigger_type" AS ENUM('inquiry.received', 'inquiry.qualified', 'inquiry.archived', 'quote.created', 'quote.sent', 'quote.viewed', 'quote.accepted', 'quote.rejected', 'quote.expired', 'job.created', 'job.completed', 'invoice.sent', 'invoice.paid', 'invoice.overdue', 'follow_up.due', 'follow_up.overdue');--> statement-breakpoint
CREATE TABLE "automation_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"automation_id" text,
	"business_id" text NOT NULL,
	"trigger_type" "trigger_type" NOT NULL,
	"trigger_payload" jsonb NOT NULL,
	"actions_executed" jsonb NOT NULL,
	"status" "automation_log_status" NOT NULL,
	"duration_ms" integer NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_scheduled_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"automation_id" text NOT NULL,
	"business_id" text NOT NULL,
	"trigger_payload" jsonb NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"status" "automation_job_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"last_error" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_automations" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trigger_type" "trigger_type" NOT NULL,
	"trigger_config" jsonb,
	"conditions" jsonb,
	"actions" jsonb NOT NULL,
	"delay" jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_automation_id_business_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."business_automations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_scheduled_jobs" ADD CONSTRAINT "automation_scheduled_jobs_automation_id_business_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."business_automations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_scheduled_jobs" ADD CONSTRAINT "automation_scheduled_jobs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_automations" ADD CONSTRAINT "business_automations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_automations" ADD CONSTRAINT "business_automations_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "automation_logs_automation_id_idx" ON "automation_logs" USING btree ("automation_id");--> statement-breakpoint
CREATE INDEX "automation_logs_business_id_idx" ON "automation_logs" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "automation_logs_created_at_idx" ON "automation_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "automation_scheduled_jobs_status_scheduled_for_idx" ON "automation_scheduled_jobs" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "automation_scheduled_jobs_automation_id_idx" ON "automation_scheduled_jobs" USING btree ("automation_id");--> statement-breakpoint
CREATE INDEX "automation_scheduled_jobs_business_id_idx" ON "automation_scheduled_jobs" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "business_automations_business_trigger_enabled_idx" ON "business_automations" USING btree ("business_id","trigger_type","enabled");--> statement-breakpoint
CREATE INDEX "business_automations_business_id_idx" ON "business_automations" USING btree ("business_id");