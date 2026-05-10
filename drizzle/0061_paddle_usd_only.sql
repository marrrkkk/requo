-- Normalize legacy billing rows before tightening enums.
UPDATE "account_subscriptions"
SET "billing_provider" = 'paddle'
WHERE "billing_provider" <> 'paddle';

UPDATE "business_subscriptions"
SET "billing_provider" = 'paddle'
WHERE "billing_provider" <> 'paddle';

UPDATE "billing_events"
SET "provider" = 'paddle'
WHERE "provider" <> 'paddle';

UPDATE "payment_attempts"
SET "provider" = 'paddle'
WHERE "provider" <> 'paddle';

UPDATE "account_subscriptions"
SET "billing_currency" = 'USD'
WHERE "billing_currency" <> 'USD';

UPDATE "business_subscriptions"
SET "billing_currency" = 'USD'
WHERE "billing_currency" <> 'USD';

UPDATE "payment_attempts"
SET "currency" = 'USD'
WHERE "currency" <> 'USD';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_provider_old') THEN
    DROP TYPE billing_provider_old;
  END IF;
END $$;

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

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_currency_old') THEN
    DROP TYPE billing_currency_old;
  END IF;
END $$;

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
