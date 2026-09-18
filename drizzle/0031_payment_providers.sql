CREATE TYPE "public"."payment_event_status" AS ENUM('processing', 'processed', 'failed', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('paymongo', 'stripe', 'paypal');--> statement-breakpoint
CREATE TYPE "public"."payment_source" AS ENUM('manual', 'provider');--> statement-breakpoint
CREATE TYPE "public"."provider_environment" AS ENUM('test', 'live');--> statement-breakpoint
CREATE TYPE "public"."provider_payment_status" AS ENUM('pending', 'processing', 'succeeded', 'failed', 'canceled', 'partially_refunded', 'refunded');--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" text PRIMARY KEY NOT NULL,
	"connection_id" text NOT NULL,
	"business_id" text NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_event_id" text NOT NULL,
	"status" "payment_event_status" DEFAULT 'processing' NOT NULL,
	"payload" jsonb NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payment_provider_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"environment" "provider_environment" NOT NULL,
	"credentials_ciphertext" text NOT NULL,
	"public_hint" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "source" "payment_source" DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "provider" "payment_provider";--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "provider_connection_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "provider_checkout_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "provider_payment_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "status" "provider_payment_status";--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refunded_amount_in_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "checkout_url" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "checkout_idempotency_key" text;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_connection_id_payment_provider_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."payment_provider_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_provider_connections" ADD CONSTRAINT "payment_provider_connections_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_events_business_id_idx" ON "payment_events" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "payment_events_connection_id_idx" ON "payment_events" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "payment_events_status_idx" ON "payment_events" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_events_connection_event_unique" ON "payment_events" USING btree ("connection_id","provider_event_id");--> statement-breakpoint
CREATE INDEX "payment_provider_connections_business_id_idx" ON "payment_provider_connections" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_provider_connections_business_provider_env_unique" ON "payment_provider_connections" USING btree ("business_id","provider","environment");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_provider_connection_id_payment_provider_connections_id_fk" FOREIGN KEY ("provider_connection_id") REFERENCES "public"."payment_provider_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_provider_connection_id_idx" ON "payments" USING btree ("provider_connection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_connection_checkout_unique" ON "payments" USING btree ("provider_connection_id","provider_checkout_id") WHERE "payments"."provider_checkout_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_payment_unique" ON "payments" USING btree ("provider","provider_payment_id") WHERE "payments"."provider_payment_id" is not null;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_refunded_valid" CHECK ("payments"."refunded_amount_in_cents" >= 0 and "payments"."refunded_amount_in_cents" <= "payments"."amount_in_cents");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_source_valid" CHECK (("payments"."source" = 'manual' and "payments"."provider" is null) or ("payments"."source" = 'provider' and "payments"."provider" is not null and "payments"."status" is not null));