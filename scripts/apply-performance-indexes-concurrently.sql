-- Performance Indexes: CONCURRENTLY variant for zero-downtime production deployment
--
-- Run this script DIRECTLY against the production database (outside Drizzle migrator)
-- BEFORE deploying the 0008_performance_indexes migration.
--
-- Usage:
--   psql $DATABASE_MIGRATION_URL -f scripts/apply-performance-indexes-concurrently.sql
--
-- After running, mark the migration as applied:
--   DATABASE_MIGRATION_URL=<direct-url> npx tsx scripts/mark-migrations-applied.ts
--
-- The IF NOT EXISTS clause makes both this script and the Drizzle migration
-- idempotent — safe to run in either order.

-- Check database size first (abort if > 400MB used)
DO $$
DECLARE
  db_size_bytes bigint;
  max_allowed_bytes bigint := 419430400; -- 400MB = 80% of 500MB
BEGIN
  SELECT pg_database_size(current_database()) INTO db_size_bytes;
  IF db_size_bytes > max_allowed_bytes THEN
    RAISE EXCEPTION 'Database size (% bytes) exceeds 80%% of 500MB limit (400MB). Aborting index creation.',
      db_size_bytes;
  END IF;
  RAISE NOTICE 'Database size check passed: % bytes (limit: % bytes)', db_size_bytes, max_allowed_bytes;
END
$$;

-- Create indexes without locking tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS inquiries_business_status_created_at_idx
  ON inquiries (business_id, status, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS quotes_business_status_created_at_idx
  ON quotes (business_id, status, created_at);

-- Verify indexes exist and check size
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

  RAISE NOTICE 'Index sizes - inquiries: % bytes, quotes: % bytes, total: % bytes',
    idx1_size, idx2_size, total_new_idx_size;

  IF total_new_idx_size > max_index_budget THEN
    RAISE WARNING 'Total new index size (% bytes) exceeds 50MB budget!', total_new_idx_size;
  ELSE
    RAISE NOTICE 'Index size check passed: % bytes within 50MB budget', total_new_idx_size;
  END IF;
END
$$;
