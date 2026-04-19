CREATE TYPE "public"."analytics_event_type" AS ENUM('inquiry_form_viewed', 'quote_public_viewed');--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"business_inquiry_form_id" text,
	"quote_id" text,
	"event_type" "analytics_event_type" NOT NULL,
	"visitor_hash" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_business_inquiry_form_id_business_inquiry_forms_id_fk" FOREIGN KEY ("business_inquiry_form_id") REFERENCES "public"."business_inquiry_forms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_events_business_type_occurred_at_idx" ON "analytics_events" USING btree ("business_id","event_type","occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_events_form_type_occurred_at_idx" ON "analytics_events" USING btree ("business_inquiry_form_id","event_type","occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_events_quote_type_occurred_at_idx" ON "analytics_events" USING btree ("quote_id","event_type","occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_events_business_type_visitor_hash_idx" ON "analytics_events" USING btree ("business_id","event_type","visitor_hash");
