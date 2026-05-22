-- Safety net: Requo has zero paying users on Dodo. Any existing rows in these
-- tables on dev/preview environments are seed data and are acceptable to drop
-- before swapping the billing_provider enum value. Production has no rows.
DELETE FROM "refunds";--> statement-breakpoint
DELETE FROM "payment_attempts";--> statement-breakpoint
DELETE FROM "billing_events";--> statement-breakpoint
DELETE FROM "account_subscriptions";--> statement-breakpoint
CREATE TYPE "public"."billing_provider_new" AS ENUM('polar');--> statement-breakpoint
ALTER TABLE "account_subscriptions" ALTER COLUMN "billing_provider" SET DATA TYPE "public"."billing_provider_new" USING 'polar'::"public"."billing_provider_new";--> statement-breakpoint
ALTER TABLE "billing_events" ALTER COLUMN "provider" SET DATA TYPE "public"."billing_provider_new" USING 'polar'::"public"."billing_provider_new";--> statement-breakpoint
ALTER TABLE "payment_attempts" ALTER COLUMN "provider" SET DATA TYPE "public"."billing_provider_new" USING 'polar'::"public"."billing_provider_new";--> statement-breakpoint
ALTER TABLE "refunds" ALTER COLUMN "provider" SET DATA TYPE "public"."billing_provider_new" USING 'polar'::"public"."billing_provider_new";--> statement-breakpoint
DROP TYPE "public"."billing_provider";--> statement-breakpoint
ALTER TYPE "public"."billing_provider_new" RENAME TO "billing_provider";
