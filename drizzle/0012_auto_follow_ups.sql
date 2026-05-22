-- Auto follow-up columns on quotes table
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "auto_follow_up_enabled" boolean NOT NULL DEFAULT false;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "auto_follow_up_delay_days" integer NOT NULL DEFAULT 3;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "auto_follow_up_max_attempts" integer NOT NULL DEFAULT 2;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "auto_follow_up_attempts" integer NOT NULL DEFAULT 0;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "auto_follow_up_last_sent_at" timestamp with time zone;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "auto_follow_up_stopped_at" timestamp with time zone;

-- Index for efficient cron lookup of quotes needing auto follow-up
CREATE INDEX IF NOT EXISTS "quotes_auto_follow_up_pending_idx" ON "quotes" ("sent_at")
  WHERE auto_follow_up_enabled = true
    AND auto_follow_up_stopped_at IS NULL
    AND status = 'sent'
    AND public_viewed_at IS NULL
    AND customer_responded_at IS NULL
    AND deleted_at IS NULL;
