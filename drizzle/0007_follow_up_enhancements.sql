-- Follow-up enhancements: recurrence, soft-delete, reminders
-- Run: npx drizzle-kit push or npm run db:migrate

-- Create the follow_up_recurrence enum
DO $$ BEGIN
  CREATE TYPE "follow_up_recurrence" AS ENUM ('none', 'daily', 'every_3_days', 'weekly', 'biweekly', 'monthly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add recurrence columns
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "recurrence" "follow_up_recurrence" NOT NULL DEFAULT 'none';
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "recurrence_limit" integer;
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "recurrence_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "parent_follow_up_id" text;

-- Add soft-delete columns
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "deleted_by_user_id" text REFERENCES "user"("id") ON DELETE SET NULL;

-- Add reminder tracking
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "reminder_sent_at" timestamp with time zone;

-- Add index for non-deleted follow-ups
CREATE INDEX IF NOT EXISTS "follow_ups_not_deleted_idx" ON "follow_ups" ("business_id", "status") WHERE "deleted_at" IS NULL;
