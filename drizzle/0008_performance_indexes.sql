-- Performance composite indexes migration
-- Adds composite indexes on inquiries and quotes for filtered + sorted list queries.
--
-- NOTE: This migration uses CREATE INDEX IF NOT EXISTS (without CONCURRENTLY)
-- because Drizzle's migrator wraps migrations in transactions, and
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction block.
--
-- For PRODUCTION deployment with zero-downtime requirements, run the
-- CONCURRENTLY variant manually BEFORE deploying this migration:
--
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS inquiries_business_status_created_at_idx
--     ON inquiries (business_id, status, created_at);
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS quotes_business_status_created_at_idx
--     ON quotes (business_id, status, created_at);
--
-- Then mark this migration as applied:
--   DATABASE_MIGRATION_URL=<direct-url> npx tsx scripts/mark-migrations-applied.ts
--
-- The IF NOT EXISTS clause makes this idempotent — safe whether indexes
-- were created manually beforehand or not.
--
-- Existing indexes verified (already present, skipped):
--   - public_action_events(action, key, created_at) -> public_action_events_action_key_created_at_idx
--   - ai_usage_events(user_id, created_at) -> ai_usage_events_user_month_idx
--   - ai_usage_events(business_id, created_at) -> ai_usage_events_business_month_idx

-- Step 1: Check database size. Abort if DB exceeds 80% of 500MB (400MB).
DO $$
DECLARE
  db_size_bytes bigint;
  max_allowed_bytes bigint := 419430400; -- 400MB = 80% of 500MB
BEGIN
  SELECT pg_database_size(current_database()) INTO db_size_bytes;
  IF db_size_bytes > max_allowed_bytes THEN
    RAISE EXCEPTION 'Database size (% bytes) exceeds 80%% of 500MB limit (400MB). Aborting index creation to preserve storage budget.',
      db_size_bytes;
  END IF;
  RAISE NOTICE 'Database size check passed: % bytes (limit: % bytes)', db_size_bytes, max_allowed_bytes;
END
$$;--> statement-breakpoint

-- Step 2: Create composite indexes (IF NOT EXISTS for idempotency).
CREATE INDEX IF NOT EXISTS "inquiries_business_status_created_at_idx" ON "inquiries" ("business_id","status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotes_business_status_created_at_idx" ON "quotes" ("business_id","status","created_at");--> statement-breakpoint

-- Step 3: Verify index creation and check size budget (≤ 50MB total for new indexes).
DO $$
DECLARE
  idx1_size bigint;
  idx2_size bigint;
  total_new_idx_size bigint;
  max_index_budget bigint := 52428800; -- 50MB
BEGIN
  SELECT pg_relation_size('inquiries_business_status_created_at_idx')
    INTO idx1_size;

  SELECT pg_relation_size('quotes_business_status_created_at_idx')
    INTO idx2_size;

  total_new_idx_size := COALESCE(idx1_size, 0) + COALESCE(idx2_size, 0);

  RAISE NOTICE 'Index sizes - inquiries_business_status_created_at_idx: % bytes, quotes_business_status_created_at_idx: % bytes, total: % bytes',
    idx1_size, idx2_size, total_new_idx_size;

  IF total_new_idx_size > max_index_budget THEN
    RAISE WARNING 'Total new index size (% bytes) exceeds 50MB budget. Consider dropping indexes if storage is constrained.',
      total_new_idx_size;
  ELSE
    RAISE NOTICE 'Index size check passed: % bytes within 50MB budget', total_new_idx_size;
  END IF;
END
$$;
