CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'unpaid', 'partially_paid', 'paid', 'overdue', 'voided');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'bank_transfer', 'gcash', 'maya', 'check', 'other');--> statement-breakpoint
CREATE TABLE "invoice_line_items" (
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
	CONSTRAINT "invoice_line_items_values_valid" CHECK ("invoice_line_items"."quantity" > 0 and "invoice_line_items"."unit_price_in_cents" >= 0 and "invoice_line_items"."line_total_in_cents" >= 0 and "invoice_line_items"."line_total_in_cents" = "invoice_line_items"."quantity" * "invoice_line_items"."unit_price_in_cents" and "invoice_line_items"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
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
	"payment_terms" text,
	"subtotal_in_cents" integer DEFAULT 0 NOT NULL,
	"discount_in_cents" integer DEFAULT 0 NOT NULL,
	"tax_in_cents" integer DEFAULT 0 NOT NULL,
	"tax_label" text,
	"total_in_cents" integer DEFAULT 0 NOT NULL,
	"issue_date" date NOT NULL,
	"due_date" date NOT NULL,
	"sent_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"voided_by" text,
	"void_reason" text,
	"deleted_at" timestamp with time zone,
	"deleted_by" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_totals_valid" CHECK ("invoices"."subtotal_in_cents" >= 0 and "invoices"."discount_in_cents" >= 0 and "invoices"."tax_in_cents" >= 0 and "invoices"."total_in_cents" >= 0 and "invoices"."subtotal_in_cents" >= "invoices"."discount_in_cents" and "invoices"."total_in_cents" = "invoices"."subtotal_in_cents" - "invoices"."discount_in_cents" + "invoices"."tax_in_cents"),
	CONSTRAINT "invoices_dates_valid" CHECK ("invoices"."due_date" >= "invoices"."issue_date")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"amount_in_cents" integer NOT NULL,
	"payment_date" date NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference" text,
	"notes" text,
	"created_by" text,
	"voided_at" timestamp with time zone,
	"voided_by" text,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_valid" CHECK ("payments"."amount_in_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_voided_by_user_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_voided_by_user_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoice_line_items_business_id_idx" ON "invoice_line_items" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "invoice_line_items_invoice_id_idx" ON "invoice_line_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_line_items_invoice_position_unique" ON "invoice_line_items" USING btree ("invoice_id","position");--> statement-breakpoint
CREATE INDEX "invoices_business_id_idx" ON "invoices" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "invoices_business_status_idx" ON "invoices" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "invoices_business_due_date_idx" ON "invoices" USING btree ("business_id","due_date");--> statement-breakpoint
CREATE INDEX "invoices_business_customer_idx" ON "invoices" USING btree ("business_id","customer_email");--> statement-breakpoint
CREATE INDEX "invoices_quote_id_idx" ON "invoices" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "invoices_deleted_at_idx" ON "invoices" USING btree ("business_id","deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_business_invoice_number_unique" ON "invoices" USING btree ("business_id","invoice_number");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_business_quote_active_unique" ON "invoices" USING btree ("business_id","quote_id") WHERE "invoices"."quote_id" is not null and "invoices"."deleted_at" is null and "invoices"."status" <> 'voided';--> statement-breakpoint
CREATE INDEX "payments_business_id_idx" ON "payments" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "payments_invoice_id_idx" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "payments_payment_date_idx" ON "payments" USING btree ("business_id","payment_date");--> statement-breakpoint
ALTER TABLE "public"."invoice_line_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "deny_all" ON "public"."invoice_line_items" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "deny_all" ON "public"."invoices" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "deny_all" ON "public"."payments" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
