-- Migration: Remove issuer column from account table (Better Auth 1.7.3+)
-- Better Auth 1.7.0 through 1.7.2 required a NOT NULL "issuer" column on
-- "account" with a unique index on ("issuer", "account_id").
-- Better Auth 1.7.3+ reverted account identity to ("provider_id", "account_id")
-- as in 1.6 and no longer writes "issuer". A NOT NULL "issuer" column rejects
-- every new sign-up and account link, so drop the index/column and restore
-- the original unique constraint.
-- See: https://www.better-auth.com/docs/guides/1-7-upgrade-guide#account-identity-keeps-the-provider-key

DROP INDEX IF EXISTS "account_issuer_account_id_unique";
DROP INDEX IF EXISTS "account_issuer_accountId_uidx";

ALTER TABLE "account" DROP COLUMN IF EXISTS "issuer";

CREATE UNIQUE INDEX IF NOT EXISTS "account_provider_account_unique" ON "account" ("provider_id", "account_id");
