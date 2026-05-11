CREATE TYPE "public"."ai_conversation_surface" AS ENUM('inquiry', 'quote', 'dashboard');--> statement-breakpoint
CREATE TYPE "public"."ai_message_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."ai_message_status" AS ENUM('completed', 'generating', 'failed');--> statement-breakpoint
CREATE TYPE "public"."follow_up_channel" AS ENUM('email', 'phone', 'sms', 'whatsapp', 'messenger', 'instagram', 'other');--> statement-breakpoint
CREATE TYPE "public"."follow_up_status" AS ENUM('pending', 'completed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."inquiry_message_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."inquiry_message_status" AS ENUM('completed', 'generating', 'failed');--> statement-breakpoint
CREATE TYPE "public"."email_attempt_status" AS ENUM('success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."email_outbox_status" AS ENUM('pending', 'sending', 'sent', 'failed', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."email_provider" AS ENUM('resend', 'mailtrap', 'brevo');--> statement-breakpoint
CREATE TYPE "public"."email_type" AS ENUM('notification', 'system', 'quote', 'support', 'auth', 'inquiry');--> statement-breakpoint
ALTER TYPE "public"."quote_post_acceptance_status" ADD VALUE 'in_progress';--> statement-breakpoint
ALTER TYPE "public"."quote_post_acceptance_status" ADD VALUE 'completed';--> statement-breakpoint
ALTER TYPE "public"."quote_post_acceptance_status" ADD VALUE 'canceled';--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_user_id" text,
	"admin_email" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"business_id" text NOT NULL,
	"surface" "ai_conversation_surface" NOT NULL,
	"entity_id" text NOT NULL,
	"title" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"role" "ai_message_role" NOT NULL,
	"content" text NOT NULL,
	"provider" text,
	"model" text,
	"status" "ai_message_status" DEFAULT 'completed' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follow_ups" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"inquiry_id" text,
	"quote_id" text,
	"assigned_to_user_id" text,
	"title" text NOT NULL,
	"reason" text NOT NULL,
	"category" text DEFAULT 'sales' NOT NULL,
	"channel" "follow_up_channel" DEFAULT 'email' NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"skipped_at" timestamp with time zone,
	"status" "follow_up_status" DEFAULT 'pending' NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follow_ups_related_record_required" CHECK ("follow_ups"."inquiry_id" is not null or "follow_ups"."quote_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "inquiry_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"inquiry_id" text NOT NULL,
	"role" "inquiry_message_role" NOT NULL,
	"content" text NOT NULL,
	"provider" text,
	"model" text,
	"status" "inquiry_message_status" DEFAULT 'completed' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_notification_reads" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"notification_id" text NOT NULL,
	"user_id" text NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_win_checklist_items" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"quote_id" text NOT NULL,
	"label" text NOT NULL,
	"completed_at" timestamp with time zone,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_recent_businesses" (
	"user_id" text NOT NULL,
	"business_id" text NOT NULL,
	"last_opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"email_outbox_id" text NOT NULL,
	"provider" "email_provider" NOT NULL,
	"status" "email_attempt_status" NOT NULL,
	"provider_message_id" text,
	"error_code" text,
	"error_message" text,
	"retryable" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text,
	"user_id" text,
	"type" "email_type" DEFAULT 'notification' NOT NULL,
	"to" jsonb NOT NULL,
	"cc" jsonb,
	"bcc" jsonb,
	"from" text NOT NULL,
	"subject" text NOT NULL,
	"html" text NOT NULL,
	"text" text,
	"status" "email_outbox_status" DEFAULT 'pending' NOT NULL,
	"idempotency_key" text NOT NULL,
	"provider" "email_provider",
	"provider_message_id" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "account_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" "subscription_status" DEFAULT 'free' NOT NULL,
	"plan" text NOT NULL,
	"billing_provider" "billing_provider" NOT NULL,
	"billing_currency" "billing_currency" NOT NULL,
	"provider_customer_id" text,
	"provider_subscription_id" text,
	"provider_checkout_id" text,
	"payment_method" text,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"trial_ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"status" "subscription_status" DEFAULT 'free' NOT NULL,
	"plan" text NOT NULL,
	"billing_provider" "billing_provider" NOT NULL,
	"billing_currency" "billing_currency" NOT NULL,
	"provider_customer_id" text,
	"provider_subscription_id" text,
	"provider_checkout_id" text,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"trial_ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"business_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_events" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "google_calendar_connections" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workspace_members" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workspaces" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workspace_subscriptions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "calendar_events" CASCADE;--> statement-breakpoint
DROP TABLE "google_calendar_connections" CASCADE;--> statement-breakpoint
DROP TABLE "workspace_members" CASCADE;--> statement-breakpoint
DROP TABLE "workspaces" CASCADE;--> statement-breakpoint
DROP TABLE "workspace_subscriptions" CASCADE;--> statement-breakpoint
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_business_id_businesses_id_fk";
--> statement-breakpoint
ALTER TABLE "businesses" DROP CONSTRAINT "businesses_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "billing_events" DROP CONSTRAINT "billing_events_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "payment_attempts" DROP CONSTRAINT "payment_attempts_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "account_subscriptions" ALTER COLUMN "billing_currency" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "business_subscriptions" ALTER COLUMN "billing_currency" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "payment_attempts" ALTER COLUMN "currency" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."billing_currency";--> statement-breakpoint
CREATE TYPE "public"."billing_currency" AS ENUM('USD');--> statement-breakpoint
ALTER TABLE "account_subscriptions" ALTER COLUMN "billing_currency" SET DATA TYPE "public"."billing_currency" USING "billing_currency"::"public"."billing_currency";--> statement-breakpoint
ALTER TABLE "business_subscriptions" ALTER COLUMN "billing_currency" SET DATA TYPE "public"."billing_currency" USING "billing_currency"::"public"."billing_currency";--> statement-breakpoint
ALTER TABLE "payment_attempts" ALTER COLUMN "currency" SET DATA TYPE "public"."billing_currency" USING "currency"::"public"."billing_currency";--> statement-breakpoint
ALTER TABLE "account_subscriptions" ALTER COLUMN "billing_provider" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "billing_events" ALTER COLUMN "provider" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "business_subscriptions" ALTER COLUMN "billing_provider" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "payment_attempts" ALTER COLUMN "provider" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."billing_provider";--> statement-breakpoint
CREATE TYPE "public"."billing_provider" AS ENUM('paddle');--> statement-breakpoint
ALTER TABLE "account_subscriptions" ALTER COLUMN "billing_provider" SET DATA TYPE "public"."billing_provider" USING "billing_provider"::"public"."billing_provider";--> statement-breakpoint
ALTER TABLE "billing_events" ALTER COLUMN "provider" SET DATA TYPE "public"."billing_provider" USING "provider"::"public"."billing_provider";--> statement-breakpoint
ALTER TABLE "business_subscriptions" ALTER COLUMN "billing_provider" SET DATA TYPE "public"."billing_provider" USING "billing_provider"::"public"."billing_provider";--> statement-breakpoint
ALTER TABLE "payment_attempts" ALTER COLUMN "provider" SET DATA TYPE "public"."billing_provider" USING "provider"::"public"."billing_provider";--> statement-breakpoint
DROP INDEX "audit_logs_workspace_created_at_idx";--> statement-breakpoint
DROP INDEX "audit_logs_workspace_actor_created_at_idx";--> statement-breakpoint
DROP INDEX "audit_logs_workspace_entity_created_at_idx";--> statement-breakpoint
DROP INDEX "audit_logs_workspace_action_created_at_idx";--> statement-breakpoint
DROP INDEX "audit_logs_workspace_business_created_at_idx";--> statement-breakpoint
DROP INDEX "businesses_workspace_id_idx";--> statement-breakpoint
DROP INDEX "businesses_workspace_archived_at_idx";--> statement-breakpoint
DROP INDEX "businesses_workspace_deleted_at_idx";--> statement-breakpoint
DROP INDEX "billing_events_workspace_id_idx";--> statement-breakpoint
DROP INDEX "payment_attempts_workspace_id_idx";--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "business_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_expires" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "completed_by" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "canceled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "canceled_by" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "cancellation_note" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "owner_user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "plan" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "customer_contact_channel" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "notify_in_app_on_quote_sent" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "notify_push_on_new_inquiry" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "notify_push_on_quote_sent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "notify_push_on_quote_response" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "notify_push_on_member_invite_response" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "notify_on_follow_up_reminder" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "notify_in_app_on_follow_up_reminder" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "notify_on_quote_expiring" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "notify_in_app_on_quote_expiring" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "locked_by" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "locked_reason" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "company_size" text;--> statement-breakpoint
ALTER TABLE "billing_events" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "billing_events" ADD COLUMN "business_id" text;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD COLUMN "business_id" text;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_user_id_user_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_assigned_to_user_id_user_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_messages" ADD CONSTRAINT "inquiry_messages_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_notification_reads" ADD CONSTRAINT "business_notification_reads_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_notification_reads" ADD CONSTRAINT "business_notification_reads_notification_id_business_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."business_notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_notification_reads" ADD CONSTRAINT "business_notification_reads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_win_checklist_items" ADD CONSTRAINT "post_win_checklist_items_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_win_checklist_items" ADD CONSTRAINT "post_win_checklist_items_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_recent_businesses" ADD CONSTRAINT "user_recent_businesses_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_recent_businesses" ADD CONSTRAINT "user_recent_businesses_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_attempts" ADD CONSTRAINT "email_attempts_email_outbox_id_email_outbox_id_fk" FOREIGN KEY ("email_outbox_id") REFERENCES "public"."email_outbox"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_subscriptions" ADD CONSTRAINT "account_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_subscriptions" ADD CONSTRAINT "business_subscriptions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_admin_created_at_idx" ON "admin_audit_logs" USING btree ("admin_user_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_action_created_at_idx" ON "admin_audit_logs" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_target_created_at_idx" ON "admin_audit_logs" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_conversations_user_business_idx" ON "ai_conversations" USING btree ("user_id","business_id");--> statement-breakpoint
CREATE INDEX "ai_conversations_surface_entity_idx" ON "ai_conversations" USING btree ("surface","entity_id");--> statement-breakpoint
CREATE INDEX "ai_conversations_dashboard_recent_idx" ON "ai_conversations" USING btree ("user_id","business_id","last_message_at") WHERE "ai_conversations"."surface" = 'dashboard';--> statement-breakpoint
CREATE UNIQUE INDEX "ai_conversations_default_entity_unique" ON "ai_conversations" USING btree ("user_id","business_id","surface","entity_id") WHERE "ai_conversations"."surface" in ('inquiry', 'quote') and "ai_conversations"."is_default" = true;--> statement-breakpoint
CREATE INDEX "ai_messages_conversation_id_idx" ON "ai_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "ai_messages_created_at_idx" ON "ai_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_messages_conversation_created_at_idx" ON "ai_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_messages_conversation_created_at_id_idx" ON "ai_messages" USING btree ("conversation_id","created_at","id");--> statement-breakpoint
CREATE INDEX "follow_ups_business_status_due_at_idx" ON "follow_ups" USING btree ("business_id","status","due_at");--> statement-breakpoint
CREATE INDEX "follow_ups_business_pending_due_at_idx" ON "follow_ups" USING btree ("business_id","due_at") WHERE "follow_ups"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "follow_ups_inquiry_id_idx" ON "follow_ups" USING btree ("inquiry_id");--> statement-breakpoint
CREATE INDEX "follow_ups_quote_id_idx" ON "follow_ups" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "follow_ups_assigned_to_user_id_idx" ON "follow_ups" USING btree ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "inquiry_messages_inquiry_id_idx" ON "inquiry_messages" USING btree ("inquiry_id");--> statement-breakpoint
CREATE INDEX "inquiry_messages_created_at_idx" ON "inquiry_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "inquiry_messages_inquiry_created_at_idx" ON "inquiry_messages" USING btree ("inquiry_id","created_at");--> statement-breakpoint
CREATE INDEX "inquiry_messages_inquiry_created_at_id_idx" ON "inquiry_messages" USING btree ("inquiry_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_notification_reads_notification_user_unique" ON "business_notification_reads" USING btree ("notification_id","user_id");--> statement-breakpoint
CREATE INDEX "business_notification_reads_user_business_idx" ON "business_notification_reads" USING btree ("user_id","business_id");--> statement-breakpoint
CREATE INDEX "post_win_checklist_items_business_id_idx" ON "post_win_checklist_items" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "post_win_checklist_items_quote_id_idx" ON "post_win_checklist_items" USING btree ("quote_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_win_checklist_items_quote_position_unique" ON "post_win_checklist_items" USING btree ("quote_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "user_recent_businesses_user_business_unique" ON "user_recent_businesses" USING btree ("user_id","business_id");--> statement-breakpoint
CREATE INDEX "user_recent_businesses_user_recent_idx" ON "user_recent_businesses" USING btree ("user_id","last_opened_at");--> statement-breakpoint
CREATE INDEX "user_recent_businesses_business_id_idx" ON "user_recent_businesses" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "email_attempts_outbox_created_at_idx" ON "email_attempts" USING btree ("email_outbox_id","created_at");--> statement-breakpoint
CREATE INDEX "email_attempts_provider_created_at_idx" ON "email_attempts" USING btree ("provider","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "email_outbox_idempotency_key_unique" ON "email_outbox" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "email_outbox_business_created_at_idx" ON "email_outbox" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "email_outbox_status_created_at_idx" ON "email_outbox" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "email_outbox_provider_message_id_idx" ON "email_outbox" USING btree ("provider","provider_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_subscriptions_user_id_unique" ON "account_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "account_subscriptions_status_idx" ON "account_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "account_subscriptions_provider_subscription_id_idx" ON "account_subscriptions" USING btree ("provider_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_subscriptions_business_id_unique" ON "business_subscriptions" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "business_subscriptions_status_idx" ON "business_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "business_subscriptions_provider_subscription_id_idx" ON "business_subscriptions" USING btree ("provider_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_user_endpoint_unique" ON "push_subscriptions" USING btree ("user_id","endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_business_id_idx" ON "push_subscriptions" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_completed_by_user_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_canceled_by_user_id_fk" FOREIGN KEY ("canceled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_locked_by_user_id_fk" FOREIGN KEY ("locked_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_business_created_at_idx" ON "audit_logs" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_business_actor_created_at_idx" ON "audit_logs" USING btree ("business_id","actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_business_entity_created_at_idx" ON "audit_logs" USING btree ("business_id","entity_type","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_business_action_created_at_idx" ON "audit_logs" USING btree ("business_id","action","created_at");--> statement-breakpoint
CREATE INDEX "quotes_accepted_post_win_idx" ON "quotes" USING btree ("business_id","post_acceptance_status") WHERE "quotes"."status" = 'accepted' and "quotes"."deleted_at" is null and "quotes"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "businesses_owner_user_id_idx" ON "businesses" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "businesses_owner_deleted_at_idx" ON "businesses" USING btree ("owner_user_id","deleted_at");--> statement-breakpoint
CREATE INDEX "businesses_owner_archived_at_idx" ON "businesses" USING btree ("owner_user_id","archived_at");--> statement-breakpoint
CREATE INDEX "businesses_owner_locked_at_idx" ON "businesses" USING btree ("owner_user_id","locked_at");--> statement-breakpoint
CREATE INDEX "billing_events_user_id_idx" ON "billing_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "billing_events_business_id_idx" ON "billing_events" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "payment_attempts_user_id_idx" ON "payment_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payment_attempts_business_id_idx" ON "payment_attempts" USING btree ("business_id");--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN "workspace_id";--> statement-breakpoint
ALTER TABLE "quotes" DROP COLUMN "public_token_encrypted";--> statement-breakpoint
ALTER TABLE "businesses" DROP COLUMN "workspace_id";--> statement-breakpoint
ALTER TABLE "billing_events" DROP COLUMN "workspace_id";--> statement-breakpoint
ALTER TABLE "payment_attempts" DROP COLUMN "workspace_id";--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_plan_valid" CHECK ("businesses"."plan" in ('free', 'pro', 'business'));--> statement-breakpoint
DROP TYPE "public"."workspace_member_role";