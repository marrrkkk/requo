CREATE TYPE "public"."follow_up_termination_condition" AS ENUM('count', 'terminal_status');--> statement-breakpoint
ALTER TYPE "public"."quote_library_entry_kind" ADD VALUE 'template';--> statement-breakpoint
ALTER TABLE "follow_ups" ADD COLUMN "termination_condition" "follow_up_termination_condition";--> statement-breakpoint
ALTER TABLE "quote_library_entries" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "quote_library_entries" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "quote_library_entries" ADD COLUMN "terms" text;--> statement-breakpoint
ALTER TABLE "quote_library_entries" ADD COLUMN "validity_days" integer;--> statement-breakpoint
ALTER TABLE "quote_library_entries" ADD CONSTRAINT "quote_library_entries_validity_days_range" CHECK ("quote_library_entries"."validity_days" is null or ("quote_library_entries"."validity_days" >= 1 and "quote_library_entries"."validity_days" <= 365));