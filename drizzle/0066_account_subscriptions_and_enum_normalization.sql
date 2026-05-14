-- Creates account_subscriptions and business_subscriptions tables that were
-- previously applied via db:push. Also normalizes billing enums to production
-- values (paddle-only provider, USD-only currency).
--
-- This migration is idempotent: it skips creation if tables/types already exist.

-- 1. Create account_subscriptions table
CREATE TABLE IF NOT EXISTS "account_subscriptions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "status" "subscription_status" DEFAULT 'free' NOT NULL,
  "plan" text NOT NULL,
  "billing_provider" "billing_provider" NOT NULL,
  "billing_currency" "billing_currency" NOT NULL,
  "provider_customer_id" text,
  "provider_subscription_id" text,
  "provider_checkout_id" text,
  "payment_method" text,
  "current_period_start" timestamp with time zone,
  "current_period_end" timestamp with time zone,
  "canceled_at" timestamp with time zone,
  "trial_ends_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'account_subscriptions_user_id_user_id_fk'
  ) THEN
    ALTER TABLE "account_subscriptions"
      ADD CONSTRAINT "account_subscriptions_user_id_user_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE CASCADE;
  END IF;
END $$;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "account_subscriptions_user_id_unique"
  ON "account_subscriptions" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_subscriptions_status_idx"
  ON "account_subscriptions" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_subscriptions_provider_subscription_id_idx"
  ON "account_subscriptions" USING btree ("provider_subscription_id");
--> statement-breakpoint

-- 2. Create business_subscriptions table (deprecated but needed for enum normalization)
CREATE TABLE IF NOT EXISTS "business_subscriptions" (
  "id" text PRIMARY KEY NOT NULL,
  "business_id" text NOT NULL,
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_subscriptions_business_id_businesses_id_fk'
  ) THEN
    ALTER TABLE "business_subscriptions"
      ADD CONSTRAINT "business_subscriptions_business_id_businesses_id_fk"
      FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;
  END IF;
END $$;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "business_subscriptions_business_id_unique"
  ON "business_subscriptions" USING btree ("business_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "business_subscriptions_status_idx"
  ON "business_subscriptions" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "business_subscriptions_provider_subscription_id_idx"
  ON "business_subscriptions" USING btree ("provider_subscription_id");
--> statement-breakpoint

-- 3. Normalize billing_provider enum to paddle-only
-- Skip if already normalized (only 'paddle' exists)
DO $$
DECLARE
  _has_legacy boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'billing_provider'
      AND e.enumlabel IN ('paymongo', 'lemonsqueezy')
  ) INTO _has_legacy;

  IF NOT _has_legacy THEN
    RETURN;
  END IF;

  -- Normalize existing rows to paddle
  UPDATE "account_subscriptions" SET "billing_provider" = 'paddle' WHERE "billing_provider" <> 'paddle';
  UPDATE "business_subscriptions" SET "billing_provider" = 'paddle' WHERE "billing_provider" <> 'paddle';
  UPDATE "billing_events" SET "provider" = 'paddle' WHERE "provider" <> 'paddle';
  UPDATE "payment_attempts" SET "provider" = 'paddle' WHERE "provider" <> 'paddle';

  -- Recreate enum with only paddle
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_provider_old') THEN
    DROP TYPE billing_provider_old;
  END IF;

  ALTER TYPE "billing_provider" RENAME TO "billing_provider_old";
  CREATE TYPE "billing_provider" AS ENUM ('paddle');

  ALTER TABLE "account_subscriptions"
    ALTER COLUMN "billing_provider" TYPE "billing_provider"
    USING ("billing_provider"::text::"billing_provider");
  ALTER TABLE "business_subscriptions"
    ALTER COLUMN "billing_provider" TYPE "billing_provider"
    USING ("billing_provider"::text::"billing_provider");
  ALTER TABLE "billing_events"
    ALTER COLUMN "provider" TYPE "billing_provider"
    USING ("provider"::text::"billing_provider");
  ALTER TABLE "payment_attempts"
    ALTER COLUMN "provider" TYPE "billing_provider"
    USING ("provider"::text::"billing_provider");

  DROP TYPE "billing_provider_old";
END $$;
--> statement-breakpoint

-- 4. Normalize billing_currency enum to USD-only
DO $$
DECLARE
  _has_php boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'billing_currency'
      AND e.enumlabel = 'PHP'
  ) INTO _has_php;

  IF NOT _has_php THEN
    RETURN;
  END IF;

  -- Normalize existing rows to USD
  UPDATE "account_subscriptions" SET "billing_currency" = 'USD' WHERE "billing_currency" <> 'USD';
  UPDATE "business_subscriptions" SET "billing_currency" = 'USD' WHERE "billing_currency" <> 'USD';
  UPDATE "payment_attempts" SET "currency" = 'USD' WHERE "currency" <> 'USD';

  -- Recreate enum with only USD
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_currency_old') THEN
    DROP TYPE billing_currency_old;
  END IF;

  ALTER TYPE "billing_currency" RENAME TO "billing_currency_old";
  CREATE TYPE "billing_currency" AS ENUM ('USD');

  ALTER TABLE "account_subscriptions"
    ALTER COLUMN "billing_currency" TYPE "billing_currency"
    USING ("billing_currency"::text::"billing_currency");
  ALTER TABLE "business_subscriptions"
    ALTER COLUMN "billing_currency" TYPE "billing_currency"
    USING ("billing_currency"::text::"billing_currency");
  ALTER TABLE "payment_attempts"
    ALTER COLUMN "currency" TYPE "billing_currency"
    USING ("currency"::text::"billing_currency");

  DROP TYPE "billing_currency_old";
END $$;
--> statement-breakpoint

-- 5. Ensure realtime publication includes required tables
DO $$
DECLARE
  realtime_table text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    FOREACH realtime_table IN ARRAY ARRAY[
      'business_notifications',
      'business_notification_states',
      'inquiries'
    ]
    LOOP
      IF to_regclass('public.' || realtime_table) IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM pg_publication_tables
          WHERE pubname = 'supabase_realtime'
            AND schemaname = 'public'
            AND tablename = realtime_table
        ) THEN
        EXECUTE format(
          'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
          realtime_table
        );
      END IF;
    END LOOP;
  END IF;
END $$;
