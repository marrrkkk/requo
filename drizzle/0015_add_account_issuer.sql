-- Migration: Add issuer column to account table for Better Auth 1.7.x
-- Better Auth 1.7.x uses (issuer, accountId) as the unique compound key for accounts.

ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "issuer" text;

UPDATE "account"
SET "issuer" = CASE
  WHEN "provider_id" = 'credential' THEN 'local:credential'
  ELSE 'local:oauth:' || "provider_id"
END
WHERE "issuer" IS NULL;

ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;

DROP INDEX IF EXISTS "account_provider_account_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "account_issuer_account_id_unique" ON "account" ("issuer", "account_id");
