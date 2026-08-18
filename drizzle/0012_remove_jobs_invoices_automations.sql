ALTER TYPE "public"."business_notification_type" ADD VALUE 'quote_viewed' BEFORE 'business_member_invite_accepted';

--> statement-breakpoint

ALTER TYPE "public"."business_notification_type" ADD VALUE 'quote_expiring' BEFORE 'business_member_invite_accepted';

--> statement-breakpoint

ALTER TYPE "public"."business_notification_type" ADD VALUE 'follow_up_due' BEFORE 'business_member_invite_accepted';

--> statement-breakpoint

ALTER TABLE "post_win_checklist_items" DISABLE ROW LEVEL SECURITY;

--> statement-breakpoint

ALTER TABLE "job_items" DISABLE ROW LEVEL SECURITY;

--> statement-breakpoint

ALTER TABLE "jobs" DISABLE ROW LEVEL SECURITY;

--> statement-breakpoint

ALTER TABLE "invoice_items" DISABLE ROW LEVEL SECURITY;

--> statement-breakpoint

ALTER TABLE "invoices" DISABLE ROW LEVEL SECURITY;

--> statement-breakpoint

ALTER TABLE "automation_logs" DISABLE ROW LEVEL SECURITY;

--> statement-breakpoint

ALTER TABLE "automation_scheduled_jobs" DISABLE ROW LEVEL SECURITY;

--> statement-breakpoint

ALTER TABLE "business_automations" DISABLE ROW LEVEL SECURITY;

--> statement-breakpoint

DROP TABLE "post_win_checklist_items" CASCADE;

--> statement-breakpoint

DROP TABLE "job_items" CASCADE;

--> statement-breakpoint

DROP TABLE "jobs" CASCADE;

--> statement-breakpoint

DROP TABLE "invoice_items" CASCADE;

--> statement-breakpoint

DROP TABLE "invoices" CASCADE;

--> statement-breakpoint

DROP TABLE "automation_logs" CASCADE;

--> statement-breakpoint

DROP TABLE "automation_scheduled_jobs" CASCADE;

--> statement-breakpoint

DROP TABLE "business_automations" CASCADE;

--> statement-breakpoint

ALTER TABLE "businesses" DROP CONSTRAINT "businesses_default_invoice_due_days_range";

--> statement-breakpoint

DROP INDEX "quotes_accepted_post_win_idx";

--> statement-breakpoint

ALTER TABLE "businesses" ADD COLUMN "send_inquiry_ack_email" boolean DEFAULT true NOT NULL;

--> statement-breakpoint

ALTER TABLE "businesses" ADD COLUMN "auto_draft_quote_on_qualify" boolean DEFAULT true NOT NULL;

--> statement-breakpoint

ALTER TABLE "businesses" ADD COLUMN "auto_archive_stale_inquiries" boolean DEFAULT true NOT NULL;

--> statement-breakpoint

ALTER TABLE "businesses" ADD COLUMN "auto_archive_stale_inquiry_days" integer DEFAULT 14 NOT NULL;

--> statement-breakpoint

ALTER TABLE "businesses" ADD COLUMN "auto_follow_up_on_quote_viewed" boolean DEFAULT true NOT NULL;

--> statement-breakpoint

ALTER TABLE "businesses" ADD COLUMN "quote_viewed_follow_up_delay_days" integer DEFAULT 3 NOT NULL;

--> statement-breakpoint

ALTER TABLE "quotes" DROP COLUMN "post_acceptance_status";

--> statement-breakpoint

ALTER TABLE "businesses" DROP COLUMN "default_invoice_due_days";

--> statement-breakpoint

ALTER TABLE "businesses" DROP COLUMN "auto_create_jobs_on_acceptance";

--> statement-breakpoint

ALTER TABLE "businesses" ADD CONSTRAINT "businesses_auto_archive_stale_inquiry_days_range" CHECK ("businesses"."auto_archive_stale_inquiry_days" between 1 and 365);

--> statement-breakpoint

ALTER TABLE "businesses" ADD CONSTRAINT "businesses_quote_viewed_follow_up_delay_days_range" CHECK ("businesses"."quote_viewed_follow_up_delay_days" between 1 and 90);

--> statement-breakpoint

DROP TYPE "public"."job_status";

--> statement-breakpoint

DROP TYPE "public"."invoice_status";

--> statement-breakpoint

DROP TYPE "public"."automation_job_status";

--> statement-breakpoint

DROP TYPE "public"."automation_log_status";

--> statement-breakpoint

DROP TYPE "public"."trigger_type";
