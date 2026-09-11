ALTER TYPE "public"."business_notification_type" ADD VALUE 'invoice_paid';--> statement-breakpoint
ALTER TYPE "public"."business_notification_type" ADD VALUE 'invoice_overdue';--> statement-breakpoint
ALTER TABLE "business_notifications" ADD COLUMN "invoice_id" text;--> statement-breakpoint
ALTER TABLE "business_notifications" ADD CONSTRAINT "business_notifications_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_notifications_invoice_id_idx" ON "business_notifications" USING btree ("invoice_id");