-- Add new notification preference columns to businesses table
-- Push notification channels
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "notify_in_app_on_quote_sent" boolean NOT NULL DEFAULT true;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "notify_push_on_new_inquiry" boolean NOT NULL DEFAULT false;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "notify_push_on_quote_sent" boolean NOT NULL DEFAULT false;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "notify_push_on_quote_response" boolean NOT NULL DEFAULT false;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "notify_push_on_member_invite_response" boolean NOT NULL DEFAULT false;

-- New event types: follow-up reminders and quote expiring
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "notify_on_follow_up_reminder" boolean NOT NULL DEFAULT true;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "notify_in_app_on_follow_up_reminder" boolean NOT NULL DEFAULT true;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "notify_on_quote_expiring" boolean NOT NULL DEFAULT true;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "notify_in_app_on_quote_expiring" boolean NOT NULL DEFAULT true;

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "business_id" text NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_user_endpoint_unique"
  ON "push_subscriptions" ("user_id", "endpoint");
CREATE INDEX IF NOT EXISTS "push_subscriptions_business_id_idx"
  ON "push_subscriptions" ("business_id");
CREATE INDEX IF NOT EXISTS "push_subscriptions_user_id_idx"
  ON "push_subscriptions" ("user_id");
