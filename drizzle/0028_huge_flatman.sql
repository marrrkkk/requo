CREATE TYPE "public"."billing_currency" AS ENUM('PHP', 'USD');--> statement-breakpoint
CREATE TYPE "public"."billing_provider" AS ENUM('paymongo', 'lemonsqueezy');--> statement-breakpoint
CREATE TYPE "public"."payment_attempt_status" AS ENUM('pending', 'succeeded', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('free', 'pending', 'active', 'past_due', 'canceled', 'expired', 'incomplete');--> statement-breakpoint
CREATE TABLE "billing_events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_event_id" text NOT NULL,
	"provider" "billing_provider" NOT NULL,
	"event_type" text NOT NULL,
	"workspace_id" text,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"plan" text NOT NULL,
	"provider" "billing_provider" NOT NULL,
	"provider_payment_id" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" "billing_currency" NOT NULL,
	"status" "payment_attempt_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
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
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_subscriptions" ADD CONSTRAINT "workspace_subscriptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "billing_events_provider_event_id_unique" ON "billing_events" USING btree ("provider_event_id");--> statement-breakpoint
CREATE INDEX "billing_events_workspace_id_idx" ON "billing_events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "billing_events_provider_idx" ON "billing_events" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "payment_attempts_workspace_id_idx" ON "payment_attempts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "payment_attempts_provider_payment_id_idx" ON "payment_attempts" USING btree ("provider_payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_subscriptions_workspace_id_unique" ON "workspace_subscriptions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_subscriptions_status_idx" ON "workspace_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workspace_subscriptions_provider_subscription_id_idx" ON "workspace_subscriptions" USING btree ("provider_subscription_id");--> statement-breakpoint
CREATE INDEX "inquiries_open_deadline_idx" ON "inquiries" USING btree ("business_id","requested_deadline") WHERE "inquiries"."status" in ('new', 'waiting', 'quoted') and "inquiries"."requested_deadline" is not null;--> statement-breakpoint
CREATE INDEX "quotes_sent_valid_until_idx" ON "quotes" USING btree ("business_id","expires_at") WHERE "quotes"."status" = 'sent';--> statement-breakpoint
CREATE INDEX "quotes_sent_follow_up_idx" ON "quotes" USING btree ("business_id","sent_at") WHERE "quotes"."status" = 'sent' and "quotes"."customer_responded_at" is null;