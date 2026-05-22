DO $$ BEGIN
  CREATE TYPE "public"."job_status" AS ENUM('todo', 'in_progress', 'done');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'viewed', 'paid', 'overdue', 'voided');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
ALTER TYPE "public"."business_notification_type" ADD VALUE IF NOT EXISTS 'quote_revision_requested';--> statement-breakpoint
ALTER TYPE "public"."quote_status" ADD VALUE IF NOT EXISTS 'revision_requested';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quote_revision_requests" (
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
CREATE TABLE IF NOT EXISTS "quote_versions" (
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
CREATE TABLE IF NOT EXISTS "job_items" (
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
CREATE TABLE IF NOT EXISTS "jobs" (
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
CREATE TABLE IF NOT EXISTS "invoice_items" (
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
CREATE TABLE IF NOT EXISTS "invoices" (
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
ALTER TABLE "quotes" DROP CONSTRAINT IF EXISTS "quotes_totals_valid";--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "terms" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "tax_amount_in_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "tax_label" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "auto_follow_up_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "auto_follow_up_delay_days" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "auto_follow_up_max_attempts" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "auto_follow_up_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "auto_follow_up_last_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "auto_follow_up_stopped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "default_quote_terms" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "first_name" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "last_name" text;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "quote_revision_requests" ADD CONSTRAINT "quote_revision_requests_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "quote_revision_requests" ADD CONSTRAINT "quote_revision_requests_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "job_items" ADD CONSTRAINT "job_items_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "job_items" ADD CONSTRAINT "job_items_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "jobs" ADD CONSTRAINT "jobs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "jobs" ADD CONSTRAINT "jobs_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "jobs" ADD CONSTRAINT "jobs_completed_by_user_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "jobs" ADD CONSTRAINT "jobs_archived_by_user_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "jobs" ADD CONSTRAINT "jobs_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_paid_by_user_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_voided_by_user_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_archived_by_user_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quote_revision_requests_quote_id_idx" ON "quote_revision_requests" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quote_revision_requests_business_id_idx" ON "quote_revision_requests" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quote_versions_quote_id_idx" ON "quote_versions" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quote_versions_business_id_idx" ON "quote_versions" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "quote_versions_quote_version_unique" ON "quote_versions" USING btree ("quote_id","version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_items_business_id_idx" ON "job_items" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_items_job_id_idx" ON "job_items" USING btree ("job_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "job_items_job_position_unique" ON "job_items" USING btree ("job_id","position");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_business_id_idx" ON "jobs" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_business_status_idx" ON "jobs" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_business_created_at_idx" ON "jobs" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_business_deleted_at_idx" ON "jobs" USING btree ("business_id","deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "jobs_quote_id_unique" ON "jobs" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoice_items_business_id_idx" ON "invoice_items" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoice_items_invoice_id_idx" ON "invoice_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_items_invoice_position_unique" ON "invoice_items" USING btree ("invoice_id","position");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_business_id_idx" ON "invoices" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_business_status_idx" ON "invoices" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_business_created_at_idx" ON "invoices" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_business_deleted_at_idx" ON "invoices" USING btree ("business_id","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_job_id_idx" ON "invoices" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_quote_id_idx" ON "invoices" USING btree ("quote_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_business_invoice_number_unique" ON "invoices" USING btree ("business_id","invoice_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotes_auto_follow_up_pending_idx" ON "quotes" USING btree ("sent_at") WHERE "quotes"."auto_follow_up_enabled" = true and "quotes"."auto_follow_up_stopped_at" is null and "quotes"."status" = 'sent' and "quotes"."public_viewed_at" is null and "quotes"."customer_responded_at" is null and "quotes"."deleted_at" is null;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_totals_valid" CHECK ("quotes"."subtotal_in_cents" >= 0 and "quotes"."tax_in_cents" >= 0 and "quotes"."tax_amount_in_cents" >= 0 and "quotes"."total_in_cents" >= 0 and "quotes"."subtotal_in_cents" >= "quotes"."tax_in_cents" and "quotes"."total_in_cents" = "quotes"."subtotal_in_cents" - "quotes"."tax_in_cents" + "quotes"."tax_amount_in_cents");
