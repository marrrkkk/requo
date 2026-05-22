-- Jobs and Invoices feature
-- Jobs track accepted quote work through a kanban board (todo → in_progress → done).
-- Invoices are generated from completed jobs or directly from accepted quotes.

-- Job status enum
DO $$ BEGIN
  CREATE TYPE "public"."job_status" AS ENUM('todo', 'in_progress', 'done');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Invoice status enum
DO $$ BEGIN
  CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'viewed', 'paid', 'overdue', 'voided');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Jobs table
CREATE TABLE IF NOT EXISTS "jobs" (
  "id" text PRIMARY KEY NOT NULL,
  "business_id" text NOT NULL,
  "quote_id" text NOT NULL,
  "title" text NOT NULL,
  "customer_name" text NOT NULL,
  "customer_email" text,
  "customer_contact_method" text NOT NULL DEFAULT 'email',
  "customer_contact_handle" text NOT NULL DEFAULT '',
  "status" "job_status" NOT NULL DEFAULT 'todo',
  "currency" text NOT NULL DEFAULT 'USD',
  "total_in_cents" integer NOT NULL DEFAULT 0,
  "notes" text,
  "position" integer NOT NULL DEFAULT 0,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "completed_by" text,
  "archived_at" timestamp with time zone,
  "archived_by" text,
  "deleted_at" timestamp with time zone,
  "deleted_by" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "jobs_total_nonnegative" CHECK ("total_in_cents" >= 0),
  CONSTRAINT "jobs_position_nonnegative" CHECK ("position" >= 0)
);

-- Job items table
CREATE TABLE IF NOT EXISTS "job_items" (
  "id" text PRIMARY KEY NOT NULL,
  "business_id" text NOT NULL,
  "job_id" text NOT NULL,
  "description" text NOT NULL,
  "quantity" integer NOT NULL DEFAULT 1,
  "unit_price_in_cents" integer NOT NULL DEFAULT 0,
  "line_total_in_cents" integer NOT NULL DEFAULT 0,
  "position" integer NOT NULL DEFAULT 0,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "job_items_values_valid" CHECK ("quantity" > 0 and "unit_price_in_cents" >= 0 and "line_total_in_cents" >= 0 and "position" >= 0)
);

-- Invoices table
CREATE TABLE IF NOT EXISTS "invoices" (
  "id" text PRIMARY KEY NOT NULL,
  "business_id" text NOT NULL,
  "job_id" text,
  "quote_id" text,
  "invoice_number" text NOT NULL,
  "title" text NOT NULL,
  "customer_name" text NOT NULL,
  "customer_email" text,
  "customer_contact_method" text NOT NULL DEFAULT 'email',
  "customer_contact_handle" text NOT NULL DEFAULT '',
  "status" "invoice_status" NOT NULL DEFAULT 'draft',
  "currency" text NOT NULL DEFAULT 'USD',
  "notes" text,
  "terms" text,
  "subtotal_in_cents" integer NOT NULL DEFAULT 0,
  "discount_in_cents" integer NOT NULL DEFAULT 0,
  "tax_in_cents" integer NOT NULL DEFAULT 0,
  "tax_label" text,
  "total_in_cents" integer NOT NULL DEFAULT 0,
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
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "invoices_totals_valid" CHECK ("subtotal_in_cents" >= 0 and "discount_in_cents" >= 0 and "tax_in_cents" >= 0 and "total_in_cents" >= 0)
);

-- Invoice items table
CREATE TABLE IF NOT EXISTS "invoice_items" (
  "id" text PRIMARY KEY NOT NULL,
  "business_id" text NOT NULL,
  "invoice_id" text NOT NULL,
  "description" text NOT NULL,
  "quantity" integer NOT NULL DEFAULT 1,
  "unit_price_in_cents" integer NOT NULL DEFAULT 0,
  "line_total_in_cents" integer NOT NULL DEFAULT 0,
  "position" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "invoice_items_values_valid" CHECK ("quantity" > 0 and "unit_price_in_cents" >= 0 and "line_total_in_cents" >= 0 and "position" >= 0)
);

-- Foreign keys for jobs
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_completed_by_user_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_archived_by_user_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;

-- Foreign keys for job_items
ALTER TABLE "job_items" ADD CONSTRAINT "job_items_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "job_items" ADD CONSTRAINT "job_items_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;

-- Foreign keys for invoices
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_paid_by_user_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_voided_by_user_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_archived_by_user_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;

-- Foreign keys for invoice_items
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;

-- Indexes for jobs
CREATE INDEX IF NOT EXISTS "jobs_business_id_idx" ON "jobs" USING btree ("business_id");
CREATE INDEX IF NOT EXISTS "jobs_business_status_idx" ON "jobs" USING btree ("business_id", "status");
CREATE INDEX IF NOT EXISTS "jobs_business_created_at_idx" ON "jobs" USING btree ("business_id", "created_at");
CREATE INDEX IF NOT EXISTS "jobs_business_deleted_at_idx" ON "jobs" USING btree ("business_id", "deleted_at");
CREATE UNIQUE INDEX IF NOT EXISTS "jobs_quote_id_unique" ON "jobs" USING btree ("quote_id");

-- Indexes for job_items
CREATE INDEX IF NOT EXISTS "job_items_business_id_idx" ON "job_items" USING btree ("business_id");
CREATE INDEX IF NOT EXISTS "job_items_job_id_idx" ON "job_items" USING btree ("job_id");
CREATE UNIQUE INDEX IF NOT EXISTS "job_items_job_position_unique" ON "job_items" USING btree ("job_id", "position");

-- Indexes for invoices
CREATE INDEX IF NOT EXISTS "invoices_business_id_idx" ON "invoices" USING btree ("business_id");
CREATE INDEX IF NOT EXISTS "invoices_business_status_idx" ON "invoices" USING btree ("business_id", "status");
CREATE INDEX IF NOT EXISTS "invoices_business_created_at_idx" ON "invoices" USING btree ("business_id", "created_at");
CREATE INDEX IF NOT EXISTS "invoices_business_deleted_at_idx" ON "invoices" USING btree ("business_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "invoices_job_id_idx" ON "invoices" USING btree ("job_id");
CREATE INDEX IF NOT EXISTS "invoices_quote_id_idx" ON "invoices" USING btree ("quote_id");
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_business_invoice_number_unique" ON "invoices" USING btree ("business_id", "invoice_number");

-- Indexes for invoice_items
CREATE INDEX IF NOT EXISTS "invoice_items_business_id_idx" ON "invoice_items" USING btree ("business_id");
CREATE INDEX IF NOT EXISTS "invoice_items_invoice_id_idx" ON "invoice_items" USING btree ("invoice_id");
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_items_invoice_position_unique" ON "invoice_items" USING btree ("invoice_id", "position");
