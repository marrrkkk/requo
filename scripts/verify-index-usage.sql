-- Verify query plans use Index Scan for filtered list queries
-- Run after applying migration 0008_performance_indexes.sql
--
-- Usage: psql $DATABASE_URL -f scripts/verify-index-usage.sql
-- Or:   npx tsx scripts/verify-index-usage.ts (programmatic version)
--
-- Expected: Index Scan or Index Only Scan (NOT Seq Scan)

-- Query 1: Inquiries inbox query
-- Expects: Index Scan using inquiries_business_status_created_at_idx
EXPLAIN SELECT * FROM inquiries 
WHERE business_id = 'test_id' AND status = 'new' 
ORDER BY created_at DESC LIMIT 50;

-- Query 2: Quotes list query
-- Expects: Index Scan using quotes_business_status_created_at_idx
EXPLAIN SELECT * FROM quotes 
WHERE business_id = 'test_id' AND status = 'draft' 
ORDER BY created_at DESC LIMIT 50;
