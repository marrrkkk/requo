-- Paddle refund support.
-- Adds a `refunds` table that tracks refund requests created via Paddle adjustments
-- and their approval status from `adjustment.updated` webhooks.

CREATE TYPE "public"."refund_status" AS ENUM('pending_approval', 'approved', 'rejected', 'failed');

CREATE TABLE IF NOT EXISTS "refunds" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "payment_attempt_id" text NOT NULL,
  "subscription_id" text,
  "business_id" text,
  "provider" "billing_provider" NOT NULL,
  "provider_transaction_id" text NOT NULL,
  "provider_adjustment_id" text,
  "status" "refund_status" NOT NULL DEFAULT 'pending_approval',
  "reason" text,
  "requested_by_user_id" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "refunds"
  ADD CONSTRAINT "refunds_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

ALTER TABLE "refunds"
  ADD CONSTRAINT "refunds_payment_attempt_id_payment_attempts_id_fk"
  FOREIGN KEY ("payment_attempt_id") REFERENCES "payment_attempts"("id") ON DELETE CASCADE;

ALTER TABLE "refunds"
  ADD CONSTRAINT "refunds_subscription_id_account_subscriptions_id_fk"
  FOREIGN KEY ("subscription_id") REFERENCES "account_subscriptions"("id") ON DELETE SET NULL;

ALTER TABLE "refunds"
  ADD CONSTRAINT "refunds_business_id_businesses_id_fk"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL;

ALTER TABLE "refunds"
  ADD CONSTRAINT "refunds_requested_by_user_id_user_id_fk"
  FOREIGN KEY ("requested_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "refunds_user_id_idx" ON "refunds" ("user_id");
CREATE INDEX IF NOT EXISTS "refunds_payment_attempt_id_idx" ON "refunds" ("payment_attempt_id");
CREATE INDEX IF NOT EXISTS "refunds_provider_adjustment_id_idx" ON "refunds" ("provider_adjustment_id");
CREATE INDEX IF NOT EXISTS "refunds_status_idx" ON "refunds" ("status");
