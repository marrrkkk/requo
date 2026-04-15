-- Migration: Billing infrastructure
-- Creates tables for workspace subscriptions, billing events, and payment attempts.

-- 1. Create enums
DO $$ BEGIN
  CREATE TYPE "billing_provider" AS ENUM ('paymongo', 'lemonsqueezy');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "subscription_status" AS ENUM ('free', 'pending', 'active', 'past_due', 'canceled', 'expired', 'incomplete');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "billing_currency" AS ENUM ('PHP', 'USD');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "payment_attempt_status" AS ENUM ('pending', 'succeeded', 'failed', 'expired');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Create workspace_subscriptions table
CREATE TABLE IF NOT EXISTS "workspace_subscriptions" (
  "id" text PRIMARY KEY,
  "workspace_id" text NOT NULL REFERENCES "workspaces" ("id") ON DELETE CASCADE,
  "status" "subscription_status" NOT NULL DEFAULT 'free',
  "plan" text NOT NULL,
  "billing_provider" "billing_provider" NOT NULL,
  "billing_currency" "billing_currency" NOT NULL,
  "provider_customer_id" text,
  "provider_subscription_id" text,
  "provider_checkout_id" text,
  "current_period_start" timestamptz,
  "current_period_end" timestamptz,
  "canceled_at" timestamptz,
  "trial_ends_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_subscriptions_workspace_id_unique"
  ON "workspace_subscriptions" ("workspace_id");
CREATE INDEX IF NOT EXISTS "workspace_subscriptions_status_idx"
  ON "workspace_subscriptions" ("status");
CREATE INDEX IF NOT EXISTS "workspace_subscriptions_provider_subscription_id_idx"
  ON "workspace_subscriptions" ("provider_subscription_id");

-- 3. Create billing_events table
CREATE TABLE IF NOT EXISTS "billing_events" (
  "id" text PRIMARY KEY,
  "provider_event_id" text NOT NULL,
  "provider" "billing_provider" NOT NULL,
  "event_type" text NOT NULL,
  "workspace_id" text REFERENCES "workspaces" ("id") ON DELETE SET NULL,
  "payload" jsonb NOT NULL,
  "processed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "billing_events_provider_event_id_unique"
  ON "billing_events" ("provider_event_id");
CREATE INDEX IF NOT EXISTS "billing_events_workspace_id_idx"
  ON "billing_events" ("workspace_id");
CREATE INDEX IF NOT EXISTS "billing_events_provider_idx"
  ON "billing_events" ("provider");

-- 4. Create payment_attempts table
CREATE TABLE IF NOT EXISTS "payment_attempts" (
  "id" text PRIMARY KEY,
  "workspace_id" text NOT NULL REFERENCES "workspaces" ("id") ON DELETE CASCADE,
  "plan" text NOT NULL,
  "provider" "billing_provider" NOT NULL,
  "provider_payment_id" text NOT NULL,
  "amount" integer NOT NULL,
  "currency" "billing_currency" NOT NULL,
  "status" "payment_attempt_status" NOT NULL DEFAULT 'pending',
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "payment_attempts_workspace_id_idx"
  ON "payment_attempts" ("workspace_id");
CREATE INDEX IF NOT EXISTS "payment_attempts_provider_payment_id_idx"
  ON "payment_attempts" ("provider_payment_id");
