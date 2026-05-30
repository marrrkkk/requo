ALTER TYPE "public"."quote_post_acceptance_status" ADD VALUE 'no_job_tracking' BEFORE 'completed';--> statement-breakpoint
ALTER TABLE "follow_ups" ADD COLUMN "completion_note" text;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD COLUMN "snoozed_until" timestamp with time zone;