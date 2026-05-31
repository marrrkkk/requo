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
	"payment_method" text,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"trial_ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_events" ADD COLUMN "business_id" text;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD COLUMN "business_id" text;--> statement-breakpoint
ALTER TABLE "business_subscriptions" ADD CONSTRAINT "business_subscriptions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_subscriptions_business_id_unique" ON "business_subscriptions" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "business_subscriptions_status_idx" ON "business_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "business_subscriptions_provider_subscription_id_idx" ON "business_subscriptions" USING btree ("provider_subscription_id");--> statement-breakpoint
CREATE INDEX "business_subscriptions_provider_customer_id_idx" ON "business_subscriptions" USING btree ("provider_customer_id");--> statement-breakpoint
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_events_business_id_idx" ON "billing_events" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "payment_attempts_business_id_idx" ON "payment_attempts" USING btree ("business_id");