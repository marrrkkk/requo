ALTER TYPE "public"."billing_currency" ADD VALUE 'PHP';--> statement-breakpoint
ALTER TABLE "business_subscriptions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "business_subscriptions" CASCADE;--> statement-breakpoint
ALTER TABLE "billing_events" DROP CONSTRAINT "billing_events_business_id_businesses_id_fk";
--> statement-breakpoint
ALTER TABLE "payment_attempts" DROP CONSTRAINT "payment_attempts_business_id_businesses_id_fk";
--> statement-breakpoint
ALTER TABLE "refunds" DROP CONSTRAINT "refunds_payment_attempt_id_payment_attempts_id_fk";
--> statement-breakpoint
ALTER TABLE "refunds" DROP CONSTRAINT "refunds_subscription_id_account_subscriptions_id_fk";
--> statement-breakpoint
ALTER TABLE "refunds" DROP CONSTRAINT "refunds_business_id_businesses_id_fk";
--> statement-breakpoint
ALTER TABLE "refunds" DROP CONSTRAINT "refunds_requested_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "account_subscriptions" ALTER COLUMN "billing_provider" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "billing_events" ALTER COLUMN "provider" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "payment_attempts" ALTER COLUMN "provider" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "refunds" ALTER COLUMN "provider" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."billing_provider";--> statement-breakpoint
CREATE TYPE "public"."billing_provider" AS ENUM('dodo');--> statement-breakpoint
ALTER TABLE "account_subscriptions" ALTER COLUMN "billing_provider" SET DATA TYPE "public"."billing_provider" USING "billing_provider"::"public"."billing_provider";--> statement-breakpoint
ALTER TABLE "billing_events" ALTER COLUMN "provider" SET DATA TYPE "public"."billing_provider" USING "provider"::"public"."billing_provider";--> statement-breakpoint
ALTER TABLE "payment_attempts" ALTER COLUMN "provider" SET DATA TYPE "public"."billing_provider" USING "provider"::"public"."billing_provider";--> statement-breakpoint
ALTER TABLE "refunds" ALTER COLUMN "provider" SET DATA TYPE "public"."billing_provider" USING "provider"::"public"."billing_provider";--> statement-breakpoint
ALTER TABLE "refunds" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "refunds" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
DROP TYPE "public"."refund_status";--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('pending', 'approved', 'failed');--> statement-breakpoint
ALTER TABLE "refunds" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."refund_status";--> statement-breakpoint
ALTER TABLE "refunds" ALTER COLUMN "status" SET DATA TYPE "public"."refund_status" USING "status"::"public"."refund_status";--> statement-breakpoint
DROP INDEX "billing_events_business_id_idx";--> statement-breakpoint
DROP INDEX "payment_attempts_business_id_idx";--> statement-breakpoint
DROP INDEX "refunds_payment_attempt_id_idx";--> statement-breakpoint
DROP INDEX "refunds_provider_adjustment_id_idx";--> statement-breakpoint
ALTER TABLE "account_subscriptions" ADD COLUMN "adaptive_currency" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "billing_events" ADD COLUMN "status" text DEFAULT 'processing' NOT NULL;--> statement-breakpoint
ALTER TABLE "billing_events" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "provider_refund_id" text;--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "provider_payment_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "amount" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "currency" "billing_currency" NOT NULL;--> statement-breakpoint
CREATE INDEX "refunds_provider_payment_id_idx" ON "refunds" USING btree ("provider_payment_id");--> statement-breakpoint
ALTER TABLE "billing_events" DROP COLUMN "business_id";--> statement-breakpoint
ALTER TABLE "payment_attempts" DROP COLUMN "business_id";--> statement-breakpoint
ALTER TABLE "refunds" DROP COLUMN "payment_attempt_id";--> statement-breakpoint
ALTER TABLE "refunds" DROP COLUMN "subscription_id";--> statement-breakpoint
ALTER TABLE "refunds" DROP COLUMN "business_id";--> statement-breakpoint
ALTER TABLE "refunds" DROP COLUMN "provider_transaction_id";--> statement-breakpoint
ALTER TABLE "refunds" DROP COLUMN "provider_adjustment_id";--> statement-breakpoint
ALTER TABLE "refunds" DROP COLUMN "requested_by_user_id";