CREATE TYPE "public"."connection_auth_mode" AS ENUM('byo', 'platform');--> statement-breakpoint
CREATE TYPE "public"."connection_status" AS ENUM('onboarding', 'action_required', 'ready', 'revoked');--> statement-breakpoint
ALTER TABLE "payment_provider_connections" ADD COLUMN "provider_account_id" text;--> statement-breakpoint
ALTER TABLE "payment_provider_connections" ADD COLUMN "status" "connection_status" DEFAULT 'ready' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_provider_connections" ADD COLUMN "auth_mode" "connection_auth_mode" DEFAULT 'byo' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_provider_connections_provider_env_account_unique" ON "payment_provider_connections" USING btree ("provider","environment","provider_account_id") WHERE "payment_provider_connections"."provider_account_id" is not null;