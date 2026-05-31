CREATE TYPE "public"."ai_conversation_surface" AS ENUM('inquiry', 'quote', 'dashboard');--> statement-breakpoint
CREATE TYPE "public"."ai_message_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."ai_message_status" AS ENUM('completed', 'generating', 'failed');--> statement-breakpoint
CREATE TYPE "public"."analytics_event_type" AS ENUM('inquiry_form_viewed', 'quote_public_viewed');--> statement-breakpoint
CREATE TYPE "public"."follow_up_channel" AS ENUM('email', 'phone', 'sms', 'whatsapp', 'messenger', 'instagram', 'other');--> statement-breakpoint
CREATE TYPE "public"."follow_up_recurrence" AS ENUM('none', 'daily', 'every_3_days', 'weekly', 'biweekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."follow_up_status" AS ENUM('pending', 'completed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."inquiry_message_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."inquiry_message_status" AS ENUM('completed', 'generating', 'failed');--> statement-breakpoint
CREATE TYPE "public"."inquiry_status" AS ENUM('new', 'quoted', 'waiting', 'won', 'lost', 'archived', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."business_notification_type" AS ENUM('public_inquiry_submitted', 'quote_customer_accepted', 'quote_customer_rejected', 'quote_revision_requested', 'business_member_invite_accepted', 'business_member_invite_declined', 'automation');--> statement-breakpoint
CREATE TYPE "public"."quote_library_entry_kind" AS ENUM('block', 'package');--> statement-breakpoint
CREATE TYPE "public"."quote_post_acceptance_status" AS ENUM('none', 'booked', 'scheduled', 'in_progress', 'completed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('draft', 'sent', 'revision_requested', 'accepted', 'rejected', 'expired', 'voided');--> statement-breakpoint
CREATE TYPE "public"."business_ai_tone_preference" AS ENUM('balanced', 'warm', 'direct', 'formal');--> statement-breakpoint
CREATE TYPE "public"."business_member_role" AS ENUM('owner', 'manager', 'staff');--> statement-breakpoint
CREATE TYPE "public"."profile_theme_preference" AS ENUM('light', 'dark', 'system');--> statement-breakpoint
CREATE TYPE "public"."email_attempt_status" AS ENUM('success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."email_outbox_status" AS ENUM('pending', 'sending', 'sent', 'failed', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."email_provider" AS ENUM('resend', 'mailtrap', 'brevo');--> statement-breakpoint
CREATE TYPE "public"."email_type" AS ENUM('notification', 'system', 'quote', 'support', 'auth', 'inquiry');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('todo', 'in_progress', 'done');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'viewed', 'paid', 'overdue', 'voided');--> statement-breakpoint
CREATE TYPE "public"."billing_currency" AS ENUM('USD', 'PHP');--> statement-breakpoint
CREATE TYPE "public"."billing_provider" AS ENUM('polar');--> statement-breakpoint
CREATE TYPE "public"."payment_attempt_status" AS ENUM('pending', 'succeeded', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('pending', 'approved', 'failed');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('free', 'pending', 'active', 'past_due', 'canceled', 'expired', 'incomplete');--> statement-breakpoint
CREATE TYPE "public"."automation_job_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."automation_log_status" AS ENUM('success', 'partial_failure', 'failure');--> statement-breakpoint
CREATE TYPE "public"."trigger_type" AS ENUM('inquiry.received', 'inquiry.qualified', 'inquiry.archived', 'quote.created', 'quote.sent', 'quote.viewed', 'quote.accepted', 'quote.rejected', 'quote.expired', 'job.created', 'job.completed', 'invoice.sent', 'invoice.paid', 'invoice.overdue', 'follow_up.due', 'follow_up.overdue');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"inquiry_id" text,
	"quote_id" text,
	"actor_user_id" text,
	"type" text NOT NULL,
	"summary" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "conversation_summaries" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"summary" text NOT NULL,
	"message_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_summaries_conversation_id_unique" UNIQUE("conversation_id")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"actor_user_id" text,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"action" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source" text DEFAULT 'app' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "analytics_events" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"business_inquiry_form_id" text,
	"quote_id" text,
	"event_type" "analytics_event_type" NOT NULL,
	"visitor_hash" text NOT NULL,
	"metadata" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text NOT NULL,
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"impersonated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text,
	"banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
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
	"recurrence" "follow_up_recurrence" DEFAULT 'none' NOT NULL,
	"recurrence_limit" integer,
	"recurrence_count" integer DEFAULT 0 NOT NULL,
	"parent_follow_up_id" text,
	"deleted_at" timestamp with time zone,
	"deleted_by_user_id" text,
	"reminder_sent_at" timestamp with time zone,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follow_ups_related_record_required" CHECK ("follow_ups"."inquiry_id" is not null or "follow_ups"."quote_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"business_inquiry_form_id" text NOT NULL,
	"status" "inquiry_status" DEFAULT 'new' NOT NULL,
	"subject" text,
	"customer_name" text NOT NULL,
	"customer_email" text,
	"customer_contact_method" text DEFAULT 'email' NOT NULL,
	"customer_contact_handle" text DEFAULT '' NOT NULL,
	"service_category" text NOT NULL,
	"requested_deadline" date,
	"budget_text" text,
	"details" text NOT NULL,
	"submitted_field_snapshot" jsonb,
	"source" text,
	"quote_requested" boolean DEFAULT true NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_responded_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"deleted_at" timestamp with time zone,
	"deleted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"qualification_score" integer,
	"qualification_temperature" text,
	"qualification_signals" jsonb,
	"qualified_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiry_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"inquiry_id" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"storage_path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inquiry_attachments_file_size_nonnegative" CHECK ("inquiry_attachments"."file_size" >= 0)
);
--> statement-breakpoint
CREATE TABLE "inquiry_duplicates" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"inquiry_id" text NOT NULL,
	"original_inquiry_id" text NOT NULL,
	"reason" text NOT NULL,
	"token_overlap" integer,
	"dismissed_at" timestamp with time zone,
	"dismissed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE "inquiry_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"inquiry_id" text NOT NULL,
	"author_user_id" text,
	"body" text NOT NULL,
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
CREATE TABLE "business_notification_states" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"user_id" text NOT NULL,
	"last_read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"inquiry_id" text,
	"quote_id" text,
	"type" "business_notification_type" NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_action_events" (
	"id" text PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_library_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"kind" "quote_library_entry_kind" NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quote_library_entries_currency_format" CHECK ("quote_library_entries"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "quote_library_entry_items" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"entry_id" text NOT NULL,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_in_cents" integer DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quote_library_entry_items_values_valid" CHECK ("quote_library_entry_items"."quantity" > 0 and "quote_library_entry_items"."unit_price_in_cents" >= 0 and "quote_library_entry_items"."position" >= 0)
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
CREATE TABLE "quote_items" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"quote_id" text NOT NULL,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_in_cents" integer DEFAULT 0 NOT NULL,
	"line_total_in_cents" integer DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quote_items_values_valid" CHECK ("quote_items"."quantity" > 0 and "quote_items"."unit_price_in_cents" >= 0 and "quote_items"."line_total_in_cents" >= 0 and "quote_items"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "quote_revision_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"quote_id" text NOT NULL,
	"version" integer NOT NULL,
	"message" text,
	"item_comments" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "quote_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"quote_id" text NOT NULL,
	"version" integer NOT NULL,
	"title" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text,
	"customer_contact_method" text DEFAULT 'email' NOT NULL,
	"customer_contact_handle" text DEFAULT '' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"notes" text,
	"terms" text,
	"subtotal_in_cents" integer DEFAULT 0 NOT NULL,
	"discount_in_cents" integer DEFAULT 0 NOT NULL,
	"tax_amount_in_cents" integer DEFAULT 0 NOT NULL,
	"tax_label" text,
	"total_in_cents" integer DEFAULT 0 NOT NULL,
	"valid_until" date NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"inquiry_id" text,
	"status" "quote_status" DEFAULT 'draft' NOT NULL,
	"quote_number" text NOT NULL,
	"public_token" text,
	"public_token_hash" text,
	"title" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text,
	"customer_contact_method" text DEFAULT 'email' NOT NULL,
	"customer_contact_handle" text DEFAULT '' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"message" text,
	"terms" text,
	"subtotal_in_cents" integer DEFAULT 0 NOT NULL,
	"tax_in_cents" integer DEFAULT 0 NOT NULL,
	"tax_amount_in_cents" integer DEFAULT 0 NOT NULL,
	"tax_label" text,
	"total_in_cents" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"public_viewed_at" timestamp with time zone,
	"customer_responded_at" timestamp with time zone,
	"customer_response_message" text,
	"post_acceptance_status" "quote_post_acceptance_status" DEFAULT 'none' NOT NULL,
	"expires_at" date NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"deleted_at" timestamp with time zone,
	"deleted_by" text,
	"voided_at" timestamp with time zone,
	"voided_by" text,
	"completed_at" timestamp with time zone,
	"completed_by" text,
	"canceled_at" timestamp with time zone,
	"canceled_by" text,
	"cancellation_reason" text,
	"cancellation_note" text,
	"version" integer DEFAULT 1 NOT NULL,
	"auto_follow_up_enabled" boolean DEFAULT false NOT NULL,
	"auto_follow_up_delay_days" integer DEFAULT 3 NOT NULL,
	"auto_follow_up_max_attempts" integer DEFAULT 2 NOT NULL,
	"auto_follow_up_attempts" integer DEFAULT 0 NOT NULL,
	"auto_follow_up_last_sent_at" timestamp with time zone,
	"auto_follow_up_stopped_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_totals_valid" CHECK ("quotes"."subtotal_in_cents" >= 0 and "quotes"."tax_in_cents" >= 0 and "quotes"."tax_amount_in_cents" >= 0 and "quotes"."total_in_cents" >= 0 and "quotes"."subtotal_in_cents" >= "quotes"."tax_in_cents" and "quotes"."total_in_cents" = "quotes"."subtotal_in_cents" - "quotes"."tax_in_cents" + "quotes"."tax_amount_in_cents")
);
--> statement-breakpoint
CREATE TABLE "reply_snippets" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_inquiry_forms" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"business_type" text DEFAULT 'general_project_services' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"public_inquiry_enabled" boolean DEFAULT true NOT NULL,
	"inquiry_form_config" jsonb NOT NULL,
	"inquiry_page_config" jsonb NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_inquiry_forms_slug_format" CHECK ("business_inquiry_forms"."slug" ~ '^[a-z0-9-]+$')
);
--> statement-breakpoint
CREATE TABLE "business_member_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"inviter_user_id" text NOT NULL,
	"email" text NOT NULL,
	"role" "business_member_role" DEFAULT 'staff' NOT NULL,
	"token" text,
	"token_hash" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_members" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "business_member_role" DEFAULT 'staff' NOT NULL,
	"dashboard_tour_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"business_type" text DEFAULT 'general_project_services' NOT NULL,
	"country_code" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"short_description" text,
	"customer_contact_channel" text,
	"contact_email" text,
	"logo_storage_path" text,
	"logo_content_type" text,
	"public_inquiry_enabled" boolean DEFAULT true NOT NULL,
	"inquiry_headline" text,
	"inquiry_form_config" jsonb,
	"inquiry_page_config" jsonb,
	"default_email_signature" text,
	"default_quote_notes" text,
	"default_quote_terms" text,
	"quote_email_template" jsonb,
	"default_quote_validity_days" integer DEFAULT 14 NOT NULL,
	"ai_tone_preference" "business_ai_tone_preference" DEFAULT 'balanced' NOT NULL,
	"notify_on_new_inquiry" boolean DEFAULT true NOT NULL,
	"notify_on_quote_sent" boolean DEFAULT true NOT NULL,
	"notify_on_quote_response" boolean DEFAULT true NOT NULL,
	"notify_in_app_on_new_inquiry" boolean DEFAULT true NOT NULL,
	"notify_in_app_on_quote_sent" boolean DEFAULT true NOT NULL,
	"notify_in_app_on_quote_response" boolean DEFAULT true NOT NULL,
	"notify_on_member_invite_response" boolean DEFAULT true NOT NULL,
	"notify_in_app_on_member_invite_response" boolean DEFAULT true NOT NULL,
	"notify_push_on_new_inquiry" boolean DEFAULT false NOT NULL,
	"notify_push_on_quote_sent" boolean DEFAULT false NOT NULL,
	"notify_push_on_quote_response" boolean DEFAULT false NOT NULL,
	"notify_push_on_member_invite_response" boolean DEFAULT false NOT NULL,
	"notify_on_follow_up_reminder" boolean DEFAULT true NOT NULL,
	"notify_in_app_on_follow_up_reminder" boolean DEFAULT true NOT NULL,
	"notify_on_quote_expiring" boolean DEFAULT true NOT NULL,
	"notify_in_app_on_quote_expiring" boolean DEFAULT true NOT NULL,
	"default_currency" text DEFAULT 'USD' NOT NULL,
	"analytics_digest_enabled" boolean DEFAULT true NOT NULL,
	"industry_category" text,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"locked_reason" text,
	"deleted_at" timestamp with time zone,
	"deleted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_slug_format" CHECK ("businesses"."slug" ~ '^[a-z0-9-]+$'),
	CONSTRAINT "businesses_country_code_format" CHECK ("businesses"."country_code" is null or "businesses"."country_code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "businesses_default_quote_validity_days_range" CHECK ("businesses"."default_quote_validity_days" between 1 and 365),
	CONSTRAINT "businesses_plan_valid" CHECK ("businesses"."plan" in ('free', 'pro', 'business'))
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"job_title" text,
	"company_size" text,
	"referral_source" text,
	"avatar_storage_path" text,
	"avatar_content_type" text,
	"onboarding_completed_at" timestamp with time zone,
	"dashboard_tour_completed_at" timestamp with time zone,
	"form_editor_tour_completed_at" timestamp with time zone,
	"theme_preference" "profile_theme_preference" DEFAULT 'system' NOT NULL,
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
CREATE TABLE "job_items" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"job_id" text NOT NULL,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_in_cents" integer DEFAULT 0 NOT NULL,
	"line_total_in_cents" integer DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_items_values_valid" CHECK ("job_items"."quantity" > 0 and "job_items"."unit_price_in_cents" >= 0 and "job_items"."line_total_in_cents" >= 0 and "job_items"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"quote_id" text NOT NULL,
	"title" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text,
	"customer_contact_method" text DEFAULT 'email' NOT NULL,
	"customer_contact_handle" text DEFAULT '' NOT NULL,
	"status" "job_status" DEFAULT 'todo' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"total_in_cents" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"position" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"completed_by" text,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"deleted_at" timestamp with time zone,
	"deleted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_total_nonnegative" CHECK ("jobs"."total_in_cents" >= 0),
	CONSTRAINT "jobs_position_nonnegative" CHECK ("jobs"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_in_cents" integer DEFAULT 0 NOT NULL,
	"line_total_in_cents" integer DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_items_values_valid" CHECK ("invoice_items"."quantity" > 0 and "invoice_items"."unit_price_in_cents" >= 0 and "invoice_items"."line_total_in_cents" >= 0 and "invoice_items"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"job_id" text,
	"quote_id" text,
	"invoice_number" text NOT NULL,
	"title" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text,
	"customer_contact_method" text DEFAULT 'email' NOT NULL,
	"customer_contact_handle" text DEFAULT '' NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"notes" text,
	"terms" text,
	"subtotal_in_cents" integer DEFAULT 0 NOT NULL,
	"discount_in_cents" integer DEFAULT 0 NOT NULL,
	"tax_in_cents" integer DEFAULT 0 NOT NULL,
	"tax_label" text,
	"total_in_cents" integer DEFAULT 0 NOT NULL,
	"issued_at" timestamp with time zone,
	"due_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"viewed_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"paid_by" text,
	"voided_at" timestamp with time zone,
	"voided_by" text,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"deleted_at" timestamp with time zone,
	"deleted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_totals_valid" CHECK ("invoices"."subtotal_in_cents" >= 0 and "invoices"."discount_in_cents" >= 0 and "invoices"."tax_in_cents" >= 0 and "invoices"."total_in_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "business_memories" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"embedding" jsonb DEFAULT 'null'::jsonb,
	"category" text DEFAULT 'business_rules' NOT NULL,
	CONSTRAINT "business_memories_position_nonnegative" CHECK ("business_memories"."position" >= 0),
	CONSTRAINT "business_memories_title_length" CHECK (char_length("business_memories"."title") <= 200),
	CONSTRAINT "business_memories_content_length" CHECK (char_length("business_memories"."content") <= 4000),
	CONSTRAINT "business_memories_category_check" CHECK ("business_memories"."category" IN ('business_rules', 'pricing_knowledge', 'customer_context', 'workflow_preferences'))
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
CREATE TABLE "billing_events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_event_id" text NOT NULL,
	"provider" "billing_provider" NOT NULL,
	"event_type" text NOT NULL,
	"user_id" text,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"error_message" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"plan" text NOT NULL,
	"provider" "billing_provider" NOT NULL,
	"provider_payment_id" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" "billing_currency" NOT NULL,
	"status" "payment_attempt_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" "billing_provider" NOT NULL,
	"provider_refund_id" text,
	"provider_payment_id" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" "billing_currency" NOT NULL,
	"status" "refund_status" DEFAULT 'pending' NOT NULL,
	"reason" text,
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
CREATE TABLE "ai_security_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"pattern_matched" text,
	"user_id" text,
	"business_id" text,
	"input_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_exports" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"user_id" text NOT NULL,
	"format" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"storage_path" text,
	"file_size_bytes" bigint,
	"parts" integer DEFAULT 1,
	"expires_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
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
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_user_id_user_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_drafts" ADD CONSTRAINT "ai_drafts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_drafts" ADD CONSTRAINT "ai_drafts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_summaries" ADD CONSTRAINT "conversation_summaries_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_annotations" ADD CONSTRAINT "analytics_annotations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_annotations" ADD CONSTRAINT "analytics_annotations_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_daily_rollups" ADD CONSTRAINT "analytics_daily_rollups_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_business_inquiry_form_id_business_inquiry_forms_id_fk" FOREIGN KEY ("business_inquiry_form_id") REFERENCES "public"."business_inquiry_forms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_goal_thresholds" ADD CONSTRAINT "analytics_goal_thresholds_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_scheduled_reports" ADD CONSTRAINT "analytics_scheduled_reports_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_assigned_to_user_id_user_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_deleted_by_user_id_user_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_business_inquiry_form_id_business_inquiry_forms_id_fk" FOREIGN KEY ("business_inquiry_form_id") REFERENCES "public"."business_inquiry_forms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_archived_by_user_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_attachments" ADD CONSTRAINT "inquiry_attachments_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_attachments" ADD CONSTRAINT "inquiry_attachments_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_duplicates" ADD CONSTRAINT "inquiry_duplicates_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_duplicates" ADD CONSTRAINT "inquiry_duplicates_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_duplicates" ADD CONSTRAINT "inquiry_duplicates_original_inquiry_id_inquiries_id_fk" FOREIGN KEY ("original_inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_duplicates" ADD CONSTRAINT "inquiry_duplicates_dismissed_by_user_id_fk" FOREIGN KEY ("dismissed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_messages" ADD CONSTRAINT "inquiry_messages_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_notes" ADD CONSTRAINT "inquiry_notes_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_notes" ADD CONSTRAINT "inquiry_notes_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_notes" ADD CONSTRAINT "inquiry_notes_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_notification_reads" ADD CONSTRAINT "business_notification_reads_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_notification_reads" ADD CONSTRAINT "business_notification_reads_notification_id_business_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."business_notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_notification_reads" ADD CONSTRAINT "business_notification_reads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_notification_states" ADD CONSTRAINT "business_notification_states_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_notification_states" ADD CONSTRAINT "business_notification_states_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_notifications" ADD CONSTRAINT "business_notifications_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_notifications" ADD CONSTRAINT "business_notifications_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_notifications" ADD CONSTRAINT "business_notifications_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_library_entries" ADD CONSTRAINT "quote_library_entries_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_library_entry_items" ADD CONSTRAINT "quote_library_entry_items_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_library_entry_items" ADD CONSTRAINT "quote_library_entry_items_entry_id_quote_library_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."quote_library_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_win_checklist_items" ADD CONSTRAINT "post_win_checklist_items_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_win_checklist_items" ADD CONSTRAINT "post_win_checklist_items_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_revision_requests" ADD CONSTRAINT "quote_revision_requests_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_revision_requests" ADD CONSTRAINT "quote_revision_requests_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_archived_by_user_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_voided_by_user_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_completed_by_user_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_canceled_by_user_id_fk" FOREIGN KEY ("canceled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_snippets" ADD CONSTRAINT "reply_snippets_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_inquiry_forms" ADD CONSTRAINT "business_inquiry_forms_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_member_invites" ADD CONSTRAINT "business_member_invites_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_member_invites" ADD CONSTRAINT "business_member_invites_inviter_user_id_user_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_archived_by_user_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_locked_by_user_id_fk" FOREIGN KEY ("locked_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_recent_businesses" ADD CONSTRAINT "user_recent_businesses_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_recent_businesses" ADD CONSTRAINT "user_recent_businesses_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_attempts" ADD CONSTRAINT "email_attempts_email_outbox_id_email_outbox_id_fk" FOREIGN KEY ("email_outbox_id") REFERENCES "public"."email_outbox"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_items" ADD CONSTRAINT "job_items_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_items" ADD CONSTRAINT "job_items_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_completed_by_user_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_archived_by_user_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_paid_by_user_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_voided_by_user_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_archived_by_user_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_memories" ADD CONSTRAINT "business_memories_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_subscriptions" ADD CONSTRAINT "account_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_exports" ADD CONSTRAINT "data_exports_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_exports" ADD CONSTRAINT "data_exports_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_automation_id_business_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."business_automations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_scheduled_jobs" ADD CONSTRAINT "automation_scheduled_jobs_automation_id_business_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."business_automations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_scheduled_jobs" ADD CONSTRAINT "automation_scheduled_jobs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_automations" ADD CONSTRAINT "business_automations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_automations" ADD CONSTRAINT "business_automations_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_business_id_idx" ON "activity_logs" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "activity_logs_business_created_at_idx" ON "activity_logs" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_logs_business_type_idx" ON "activity_logs" USING btree ("business_id","type");--> statement-breakpoint
CREATE INDEX "activity_logs_inquiry_id_idx" ON "activity_logs" USING btree ("inquiry_id");--> statement-breakpoint
CREATE INDEX "activity_logs_quote_id_idx" ON "activity_logs" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "activity_logs_actor_user_id_idx" ON "activity_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_admin_created_at_idx" ON "admin_audit_logs" USING btree ("admin_user_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_action_created_at_idx" ON "admin_audit_logs" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_target_created_at_idx" ON "admin_audit_logs" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_conversations_user_business_idx" ON "ai_conversations" USING btree ("user_id","business_id");--> statement-breakpoint
CREATE INDEX "ai_conversations_surface_entity_idx" ON "ai_conversations" USING btree ("surface","entity_id");--> statement-breakpoint
CREATE INDEX "ai_conversations_dashboard_recent_idx" ON "ai_conversations" USING btree ("user_id","business_id","last_message_at") WHERE "ai_conversations"."surface" = 'dashboard';--> statement-breakpoint
CREATE UNIQUE INDEX "ai_conversations_default_entity_unique" ON "ai_conversations" USING btree ("user_id","business_id","surface","entity_id") WHERE "ai_conversations"."surface" in ('inquiry', 'quote') and "ai_conversations"."is_default" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_drafts_entity_task_unique" ON "ai_drafts" USING btree ("entity_id","task_type");--> statement-breakpoint
CREATE INDEX "ai_drafts_business_idx" ON "ai_drafts" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "ai_drafts_user_idx" ON "ai_drafts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_drafts_last_accessed_idx" ON "ai_drafts" USING btree ("last_accessed_at");--> statement-breakpoint
CREATE INDEX "ai_messages_conversation_id_idx" ON "ai_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "ai_messages_created_at_idx" ON "ai_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_messages_conversation_created_at_idx" ON "ai_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_messages_conversation_created_at_id_idx" ON "ai_messages" USING btree ("conversation_id","created_at","id");--> statement-breakpoint
CREATE INDEX "ai_token_logs_user_idx" ON "ai_token_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_token_logs_business_idx" ON "ai_token_logs" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "ai_token_logs_task_type_idx" ON "ai_token_logs" USING btree ("task_type");--> statement-breakpoint
CREATE INDEX "ai_token_logs_created_at_idx" ON "ai_token_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_token_logs_provider_idx" ON "ai_token_logs" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "ai_usage_events_user_month_idx" ON "ai_usage_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_events_business_month_idx" ON "ai_usage_events" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "conversation_summaries_conversation_id_idx" ON "conversation_summaries" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "audit_logs_business_created_at_idx" ON "audit_logs" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_business_actor_created_at_idx" ON "audit_logs" USING btree ("business_id","actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_business_entity_created_at_idx" ON "audit_logs" USING btree ("business_id","entity_type","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_business_action_created_at_idx" ON "audit_logs" USING btree ("business_id","action","created_at");--> statement-breakpoint
CREATE INDEX "analytics_annotations_business_date_idx" ON "analytics_annotations" USING btree ("business_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_benchmarks_category_size_metric_idx" ON "analytics_benchmarks" USING btree ("industry_category","size_tier","metric_key");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_daily_rollups_business_date_idx" ON "analytics_daily_rollups" USING btree ("business_id","date");--> statement-breakpoint
CREATE INDEX "analytics_daily_rollups_date_idx" ON "analytics_daily_rollups" USING btree ("date");--> statement-breakpoint
CREATE INDEX "analytics_events_business_type_occurred_at_idx" ON "analytics_events" USING btree ("business_id","event_type","occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_events_form_type_occurred_at_idx" ON "analytics_events" USING btree ("business_inquiry_form_id","event_type","occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_events_quote_type_occurred_at_idx" ON "analytics_events" USING btree ("quote_id","event_type","occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_events_business_type_visitor_hash_idx" ON "analytics_events" USING btree ("business_id","event_type","visitor_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_goal_thresholds_business_metric_idx" ON "analytics_goal_thresholds" USING btree ("business_id","metric_key");--> statement-breakpoint
CREATE INDEX "analytics_scheduled_reports_business_idx" ON "analytics_scheduled_reports" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_unique" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limit_id_unique" ON "rate_limit" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_unique" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_unique" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "follow_ups_business_status_due_at_idx" ON "follow_ups" USING btree ("business_id","status","due_at");--> statement-breakpoint
CREATE INDEX "follow_ups_business_pending_due_at_idx" ON "follow_ups" USING btree ("business_id","due_at") WHERE "follow_ups"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "follow_ups_inquiry_id_idx" ON "follow_ups" USING btree ("inquiry_id");--> statement-breakpoint
CREATE INDEX "follow_ups_quote_id_idx" ON "follow_ups" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "follow_ups_assigned_to_user_id_idx" ON "follow_ups" USING btree ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "follow_ups_not_deleted_idx" ON "follow_ups" USING btree ("business_id","status") WHERE "follow_ups"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "inquiries_business_id_idx" ON "inquiries" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "inquiries_business_inquiry_form_id_idx" ON "inquiries" USING btree ("business_inquiry_form_id");--> statement-breakpoint
CREATE INDEX "inquiries_business_status_idx" ON "inquiries" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "inquiries_business_archived_at_idx" ON "inquiries" USING btree ("business_id","archived_at");--> statement-breakpoint
CREATE INDEX "inquiries_business_deleted_at_idx" ON "inquiries" USING btree ("business_id","deleted_at");--> statement-breakpoint
CREATE INDEX "inquiries_business_submitted_at_idx" ON "inquiries" USING btree ("business_id","submitted_at");--> statement-breakpoint
CREATE INDEX "inquiries_open_deadline_idx" ON "inquiries" USING btree ("business_id","requested_deadline") WHERE "inquiries"."status" in ('new', 'waiting', 'quoted') and "inquiries"."requested_deadline" is not null and "inquiries"."archived_at" is null and "inquiries"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "inquiries_business_service_category_idx" ON "inquiries" USING btree ("business_id","service_category");--> statement-breakpoint
CREATE INDEX "inquiries_business_qualification_score_idx" ON "inquiries" USING btree ("business_id","qualification_score");--> statement-breakpoint
CREATE INDEX "inquiry_attachments_business_id_idx" ON "inquiry_attachments" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "inquiry_attachments_inquiry_id_idx" ON "inquiry_attachments" USING btree ("inquiry_id");--> statement-breakpoint
CREATE INDEX "inquiry_attachments_business_inquiry_idx" ON "inquiry_attachments" USING btree ("business_id","inquiry_id");--> statement-breakpoint
CREATE INDEX "inquiry_duplicates_business_id_idx" ON "inquiry_duplicates" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inquiry_duplicates_inquiry_id_idx" ON "inquiry_duplicates" USING btree ("inquiry_id");--> statement-breakpoint
CREATE INDEX "inquiry_duplicates_original_inquiry_id_idx" ON "inquiry_duplicates" USING btree ("original_inquiry_id");--> statement-breakpoint
CREATE INDEX "inquiry_messages_inquiry_id_idx" ON "inquiry_messages" USING btree ("inquiry_id");--> statement-breakpoint
CREATE INDEX "inquiry_messages_created_at_idx" ON "inquiry_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "inquiry_messages_inquiry_created_at_idx" ON "inquiry_messages" USING btree ("inquiry_id","created_at");--> statement-breakpoint
CREATE INDEX "inquiry_messages_inquiry_created_at_id_idx" ON "inquiry_messages" USING btree ("inquiry_id","created_at","id");--> statement-breakpoint
CREATE INDEX "inquiry_notes_business_id_idx" ON "inquiry_notes" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "inquiry_notes_inquiry_id_idx" ON "inquiry_notes" USING btree ("inquiry_id");--> statement-breakpoint
CREATE INDEX "inquiry_notes_business_inquiry_idx" ON "inquiry_notes" USING btree ("business_id","inquiry_id");--> statement-breakpoint
CREATE INDEX "inquiry_notes_author_user_id_idx" ON "inquiry_notes" USING btree ("author_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_notification_reads_notification_user_unique" ON "business_notification_reads" USING btree ("notification_id","user_id");--> statement-breakpoint
CREATE INDEX "business_notification_reads_user_business_idx" ON "business_notification_reads" USING btree ("user_id","business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_notification_states_business_user_unique" ON "business_notification_states" USING btree ("business_id","user_id");--> statement-breakpoint
CREATE INDEX "business_notification_states_user_business_idx" ON "business_notification_states" USING btree ("user_id","business_id");--> statement-breakpoint
CREATE INDEX "business_notifications_business_created_at_idx" ON "business_notifications" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "business_notifications_business_type_created_at_idx" ON "business_notifications" USING btree ("business_id","type","created_at");--> statement-breakpoint
CREATE INDEX "business_notifications_inquiry_id_idx" ON "business_notifications" USING btree ("inquiry_id");--> statement-breakpoint
CREATE INDEX "business_notifications_quote_id_idx" ON "business_notifications" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "public_action_events_action_key_created_at_idx" ON "public_action_events" USING btree ("action","key","created_at");--> statement-breakpoint
CREATE INDEX "public_action_events_created_at_idx" ON "public_action_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "quote_library_entries_business_id_idx" ON "quote_library_entries" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "quote_library_entries_business_kind_name_idx" ON "quote_library_entries" USING btree ("business_id","kind","name");--> statement-breakpoint
CREATE INDEX "quote_library_entries_business_created_at_idx" ON "quote_library_entries" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "quote_library_entry_items_business_id_idx" ON "quote_library_entry_items" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "quote_library_entry_items_entry_id_idx" ON "quote_library_entry_items" USING btree ("entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_library_entry_items_entry_position_unique" ON "quote_library_entry_items" USING btree ("entry_id","position");--> statement-breakpoint
CREATE INDEX "post_win_checklist_items_business_id_idx" ON "post_win_checklist_items" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "post_win_checklist_items_quote_id_idx" ON "post_win_checklist_items" USING btree ("quote_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_win_checklist_items_quote_position_unique" ON "post_win_checklist_items" USING btree ("quote_id","position");--> statement-breakpoint
CREATE INDEX "quote_items_business_id_idx" ON "quote_items" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "quote_items_quote_id_idx" ON "quote_items" USING btree ("quote_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_items_quote_position_unique" ON "quote_items" USING btree ("quote_id","position");--> statement-breakpoint
CREATE INDEX "quote_revision_requests_quote_id_idx" ON "quote_revision_requests" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "quote_revision_requests_business_id_idx" ON "quote_revision_requests" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "quote_versions_quote_id_idx" ON "quote_versions" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "quote_versions_business_id_idx" ON "quote_versions" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_versions_quote_version_unique" ON "quote_versions" USING btree ("quote_id","version");--> statement-breakpoint
CREATE INDEX "quotes_business_id_idx" ON "quotes" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "quotes_business_status_idx" ON "quotes" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "quotes_business_archived_at_idx" ON "quotes" USING btree ("business_id","archived_at");--> statement-breakpoint
CREATE INDEX "quotes_business_deleted_at_idx" ON "quotes" USING btree ("business_id","deleted_at");--> statement-breakpoint
CREATE INDEX "quotes_business_created_at_idx" ON "quotes" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "quotes_sent_valid_until_idx" ON "quotes" USING btree ("business_id","expires_at") WHERE "quotes"."status" = 'sent' and "quotes"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "quotes_sent_follow_up_idx" ON "quotes" USING btree ("business_id","sent_at") WHERE "quotes"."status" = 'sent' and "quotes"."customer_responded_at" is null and "quotes"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "quotes_auto_follow_up_pending_idx" ON "quotes" USING btree ("sent_at") WHERE "quotes"."auto_follow_up_enabled" = true and "quotes"."auto_follow_up_stopped_at" is null and "quotes"."status" = 'sent' and "quotes"."public_viewed_at" is null and "quotes"."customer_responded_at" is null and "quotes"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "quotes_inquiry_id_idx" ON "quotes" USING btree ("inquiry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_public_token_unique" ON "quotes" USING btree ("public_token");--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_public_token_hash_unique" ON "quotes" USING btree ("public_token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_business_quote_number_unique" ON "quotes" USING btree ("business_id","quote_number");--> statement-breakpoint
CREATE INDEX "quotes_accepted_post_win_idx" ON "quotes" USING btree ("business_id","post_acceptance_status") WHERE "quotes"."status" = 'accepted' and "quotes"."deleted_at" is null and "quotes"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "reply_snippets_business_id_idx" ON "reply_snippets" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "reply_snippets_business_created_at_idx" ON "reply_snippets" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "business_inquiry_forms_business_slug_unique" ON "business_inquiry_forms" USING btree ("business_id","slug");--> statement-breakpoint
CREATE INDEX "business_inquiry_forms_business_id_idx" ON "business_inquiry_forms" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "business_inquiry_forms_business_default_idx" ON "business_inquiry_forms" USING btree ("business_id","is_default");--> statement-breakpoint
CREATE INDEX "business_inquiry_forms_business_archived_idx" ON "business_inquiry_forms" USING btree ("business_id","archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "business_member_invites_token_unique" ON "business_member_invites" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "business_member_invites_token_hash_unique" ON "business_member_invites" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "business_member_invites_business_email_unique" ON "business_member_invites" USING btree ("business_id","email");--> statement-breakpoint
CREATE INDEX "business_member_invites_business_id_idx" ON "business_member_invites" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "business_member_invites_email_idx" ON "business_member_invites" USING btree ("email");--> statement-breakpoint
CREATE INDEX "business_member_invites_token_hash_idx" ON "business_member_invites" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "business_member_invites_expires_at_idx" ON "business_member_invites" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "business_members_business_user_unique" ON "business_members" USING btree ("business_id","user_id");--> statement-breakpoint
CREATE INDEX "business_members_user_id_idx" ON "business_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "business_members_business_role_idx" ON "business_members" USING btree ("business_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "businesses_slug_unique" ON "businesses" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "businesses_created_at_idx" ON "businesses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "businesses_owner_user_id_idx" ON "businesses" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "businesses_owner_deleted_at_idx" ON "businesses" USING btree ("owner_user_id","deleted_at");--> statement-breakpoint
CREATE INDEX "businesses_owner_archived_at_idx" ON "businesses" USING btree ("owner_user_id","archived_at");--> statement-breakpoint
CREATE INDEX "businesses_owner_locked_at_idx" ON "businesses" USING btree ("owner_user_id","locked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_recent_businesses_user_business_unique" ON "user_recent_businesses" USING btree ("user_id","business_id");--> statement-breakpoint
CREATE INDEX "user_recent_businesses_user_recent_idx" ON "user_recent_businesses" USING btree ("user_id","last_opened_at");--> statement-breakpoint
CREATE INDEX "user_recent_businesses_business_id_idx" ON "user_recent_businesses" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "email_attempts_outbox_created_at_idx" ON "email_attempts" USING btree ("email_outbox_id","created_at");--> statement-breakpoint
CREATE INDEX "email_attempts_provider_created_at_idx" ON "email_attempts" USING btree ("provider","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "email_outbox_idempotency_key_unique" ON "email_outbox" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "email_outbox_business_created_at_idx" ON "email_outbox" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "email_outbox_status_created_at_idx" ON "email_outbox" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "email_outbox_provider_message_id_idx" ON "email_outbox" USING btree ("provider","provider_message_id");--> statement-breakpoint
CREATE INDEX "job_items_business_id_idx" ON "job_items" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "job_items_job_id_idx" ON "job_items" USING btree ("job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "job_items_job_position_unique" ON "job_items" USING btree ("job_id","position");--> statement-breakpoint
CREATE INDEX "jobs_business_id_idx" ON "jobs" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "jobs_business_status_idx" ON "jobs" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "jobs_business_created_at_idx" ON "jobs" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "jobs_business_deleted_at_idx" ON "jobs" USING btree ("business_id","deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_quote_id_unique" ON "jobs" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "invoice_items_business_id_idx" ON "invoice_items" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_items_invoice_position_unique" ON "invoice_items" USING btree ("invoice_id","position");--> statement-breakpoint
CREATE INDEX "invoices_business_id_idx" ON "invoices" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "invoices_business_status_idx" ON "invoices" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "invoices_business_created_at_idx" ON "invoices" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "invoices_business_deleted_at_idx" ON "invoices" USING btree ("business_id","deleted_at");--> statement-breakpoint
CREATE INDEX "invoices_job_id_idx" ON "invoices" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "invoices_quote_id_idx" ON "invoices" USING btree ("quote_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_business_invoice_number_unique" ON "invoices" USING btree ("business_id","invoice_number");--> statement-breakpoint
CREATE INDEX "business_memories_business_id_idx" ON "business_memories" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "business_memories_business_position_idx" ON "business_memories" USING btree ("business_id","position");--> statement-breakpoint
CREATE INDEX "business_memories_business_category_idx" ON "business_memories" USING btree ("business_id","category");--> statement-breakpoint
CREATE UNIQUE INDEX "account_subscriptions_user_id_unique" ON "account_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "account_subscriptions_status_idx" ON "account_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "account_subscriptions_provider_subscription_id_idx" ON "account_subscriptions" USING btree ("provider_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_events_provider_event_id_unique" ON "billing_events" USING btree ("provider_event_id");--> statement-breakpoint
CREATE INDEX "billing_events_user_id_idx" ON "billing_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "billing_events_provider_idx" ON "billing_events" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "payment_attempts_user_id_idx" ON "payment_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payment_attempts_provider_payment_id_idx" ON "payment_attempts" USING btree ("provider_payment_id");--> statement-breakpoint
CREATE INDEX "refunds_user_id_idx" ON "refunds" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refunds_provider_payment_id_idx" ON "refunds" USING btree ("provider_payment_id");--> statement-breakpoint
CREATE INDEX "refunds_status_idx" ON "refunds" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_user_business_endpoint_unique" ON "push_subscriptions" USING btree ("user_id","business_id","endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_business_id_idx" ON "push_subscriptions" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "automation_logs_automation_id_idx" ON "automation_logs" USING btree ("automation_id");--> statement-breakpoint
CREATE INDEX "automation_logs_business_id_idx" ON "automation_logs" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "automation_logs_created_at_idx" ON "automation_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "automation_scheduled_jobs_status_scheduled_for_idx" ON "automation_scheduled_jobs" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "automation_scheduled_jobs_automation_id_idx" ON "automation_scheduled_jobs" USING btree ("automation_id");--> statement-breakpoint
CREATE INDEX "automation_scheduled_jobs_business_id_idx" ON "automation_scheduled_jobs" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "business_automations_business_trigger_enabled_idx" ON "business_automations" USING btree ("business_id","trigger_type","enabled");--> statement-breakpoint
CREATE INDEX "business_automations_business_id_idx" ON "business_automations" USING btree ("business_id");