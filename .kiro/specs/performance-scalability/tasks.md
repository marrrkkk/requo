# Implementation Plan: Performance & Scalability

## Overview

Incremental performance optimizations targeting 100+ concurrent dashboard users and 500+ daily public page views within free-tier resource limits. The implementation covers Redis-based rate limiting, cached AI usage counting, static marketing pages, batched analytics rollup, edge-cached public pages, client bundle optimization, connection pool circuit breaker, extended embedding cache with batch generation, Inngest event batching, and composite database indexes.

## Tasks

- [x] 1. Redis-Based Rate Limiter
  - [x] 1.1 Create the Redis rate limiter module at `lib/rate-limit/redis-rate-limiter.ts`
    - Implement `RateLimitConfig` and `RateLimitResult` types
    - Implement sliding window counter using Upstash Redis (INCR with EX + GET, exactly 2 round-trips)
    - Redis key pattern: `rl:{action}:{fingerprint}` with TTL = windowMs
    - Implement `assertPublicActionRateLimit` that uses Redis-first with DB fallback (fail-closed on error)
    - Implement `assertBusinessActionRateLimit` that uses Redis-first with DB fallback (fail-open on error)
    - Fallback triggers on: connection failure, timeout > 2s, missing `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN`
    - Log structured warning on fallback activation with reason
    - Support all 10 existing action types and same function signature (`action`, `scope`, `limit`, `windowMs`)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8_

  - [x] 1.2 Implement rate limit response headers helper
    - Create `rateLimitHeaders(metadata)` function returning `HeadersInit`
    - Output `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers
    - Integrate header injection into public action response paths
    - _Requirements: 1.7_

  - [x] 1.3 Wire the new rate limiter into existing public action call sites
    - Replace existing `assertPublicActionRateLimit` usages in `lib/public-action-rate-limit.ts` with the Redis-backed implementation
    - Replace existing `assertBusinessActionRateLimit` usages with the Redis-backed implementation
    - Ensure all 10 action types route through the new module
    - _Requirements: 1.1, 1.2, 1.8_

  - [ ]* 1.4 Write property tests for rate limiter
    - **Property 1: Rate limit result correctness**
    - For any limit L and count C: allowed=true with remaining=L-C when C<L, allowed=false with remaining=0 when C≥L, reset is future Unix epoch seconds
    - **Validates: Requirements 1.5, 1.6**

  - [ ]* 1.5 Write property test for rate limit fallback semantics
    - **Property 2: Rate limit fallback semantics**
    - When Redis unavailable: public checks return false (fail-closed), business checks return true (fail-open)
    - **Validates: Requirements 1.4, 1.8**

  - [ ]* 1.6 Write property test for rate limit response headers
    - **Property 3: Rate limit response headers**
    - For any valid metadata (limit≥1, remaining≥0, reset>0): headers match metadata values as strings
    - **Validates: Requirements 1.7**

- [x] 2. Cached AI Usage Counter
  - [x] 2.1 Enhance `lib/ai/usage-limiter.ts` with cache-first usage checks
    - Add cache-first read in `checkUsageLimit` using Cache_Layer with key `ai_usage:business:{businessId}:{YYYY-MM}` and `ai_usage:user:{userId}:{YYYY-MM}`
    - On cache miss: execute existing DB SUM aggregate, store result with 60s TTL
    - On complete cache unavailability (Redis + in-memory): fall through to DB aggregate
    - Return cached value within 2000ms timeout
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.8_

  - [x] 2.2 Implement atomic cache increment on `recordUsage`
    - After successful AI invocation, atomically increment cached counter by weight (1-3)
    - On increment failure: delete the cache key and log warning without interrupting caller
    - Set TTL to 60s if key was newly created by increment operation
    - _Requirements: 2.3, 2.4, 2.9_

  - [ ]* 2.3 Write property test for usage counter cache-first with DB fallback
    - **Property 4: Usage counter cache-first with DB fallback**
    - Returns cached value when present; executes DB aggregate on miss and caches with 60s TTL; user and business keys are always distinct
    - **Validates: Requirements 2.1, 2.2, 2.5**

  - [ ]* 2.4 Write property test for usage counter atomic increment
    - **Property 5: Usage counter atomic increment**
    - For any weight W (1≤W≤3): cached value after increment = cached value before + W
    - **Validates: Requirements 2.3**

  - [ ]* 2.5 Write property test for usage counter total cache unavailability
    - **Property 6: Usage counter total cache unavailability fallback**
    - When both Redis and in-memory are unavailable: always falls through to DB, never throws or returns undefined
    - **Validates: Requirements 2.8**

- [x] 3. Static Generation for Marketing Pages
  - [x] 3.1 Add static generation exports to all marketing page components
    - Add `export const dynamic = "force-static"` and `export const revalidate = 3600` to: landing, pricing, legal, terms, privacy, refund-policy, security, subprocessors pages
    - Exclude `opengraph-image.tsx` and `twitter-image.tsx` from static generation
    - _Requirements: 3.1, 3.2, 3.8_

  - [x] 3.2 Remove dynamic dependencies from marketing pages and layout
    - Audit and remove any imports of `server-only`, `lib/db`, `lib/auth`, `headers()`, `cookies()` from marketing pages
    - Ensure `app/(marketing)/layout.tsx` performs no DB queries, session checks, or request-scoped API calls
    - Replace any runtime data access with build-time `NEXT_PUBLIC_*` vars, hardcoded defaults, or client-side detection
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Batched Analytics Rollup Processing
  - [x] 5.1 Refactor analytics rollup in `features/analytics/jobs/rollup.ts` to use batched processing
    - Implement configurable batch size (default: 10, min: 5, max: 25)
    - Process businesses in sequential batches using `Promise.allSettled`
    - Wait for all promises in current batch before starting next batch (at most 1 batch in-flight)
    - On individual failure: log businessId + error, include in `AnalyticsRollupSummary.errors` array, continue processing
    - Use single-query aggregation per batch where possible (reducing per-business queries)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 5.2 Write property test for analytics rollup batch processing invariants
    - **Property 7: Analytics rollup batch processing invariants**
    - For N businesses and batch size B (5≤B≤25): processes in ⌈N/B⌉ batches, each batch ≤ B businesses, batch K+1 starts only after batch K settles
    - **Validates: Requirements 4.1, 4.3**

  - [ ]* 5.3 Write property test for analytics rollup error isolation
    - **Property 8: Analytics rollup error isolation with reporting**
    - In any batch with mixed success/failure: all non-failing businesses complete; every failure appears in errors array with businessId and message
    - **Validates: Requirements 4.2, 4.4**

- [x] 6. Edge Cache Headers for Public Pages
  - [x] 6.1 Create public page cache headers utility at `lib/cache/public-page-headers.ts`
    - Implement `publicPageCacheHeaders()` returning `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` and `Vary: Accept-Encoding`
    - _Requirements: 5.1, 5.4, 5.5, 5.7_

  - [x] 6.2 Apply edge cache headers and runtime to public page routes
    - Add `export const runtime = "edge"` to `/inquire/[slug]` and `/quote/[token]` route handlers
    - Apply `publicPageCacheHeaders()` to responses from these routes
    - Ensure client-side data refetch triggers within 2s after state-changing actions (router.refresh or SWR revalidation)
    - _Requirements: 5.1, 5.2, 5.3, 5.6_

- [x] 7. Client Bundle Size Optimization
  - [x] 7.1 Create lazy-loaded wrappers for heavy libraries
    - Create `components/shared/lazy-recharts.tsx` using `next/dynamic` with `ssr: false` and chart skeleton placeholder
    - Create `components/shared/lazy-xyflow.tsx` using `next/dynamic` with `ssr: false` and workflow canvas skeleton
    - Create `components/shared/lazy-image-tools.tsx` for `react-easy-crop`, `html-to-image`, and `pdf-lib` with appropriate skeletons
    - Each skeleton must match container dimensions, add < 2 KB JS, maintain CLS < 0.1
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 7.2 Add error boundaries with retry to lazy-loaded components
    - Implement inline error boundary that displays an error message and retry control
    - On retry activation, re-attempt the chunk download
    - _Requirements: 6.7_

  - [x] 7.3 Replace direct imports with lazy-loaded wrappers in consuming pages
    - Replace Recharts imports in analytics pages with `lazy-recharts`
    - Replace @xyflow/react imports in automations builder with `lazy-xyflow`
    - Replace react-easy-crop, html-to-image, pdf-lib imports with `lazy-image-tools` wrapper
    - Verify ≥100 KB gzipped reduction in dashboard home First Load JS via `next build`
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Connection Pool Circuit Breaker
  - [x] 9.1 Create circuit breaker module at `lib/db/circuit-breaker.ts`
    - Implement `CircuitState` type (`closed`, `open`, `half-open`) and state machine
    - Implement `withCircuitBreaker<T>(queryKey, queryFn, options?)` wrapper function
    - Configure: failureThreshold=3, failureWindowMs=10000, cooldownMs=10000, maxQueuedWrites=20, staleCacheMaxAge=120000
    - On pool exhaustion in closed state: return cached data if ≤120s old, else return structured unavailability error
    - Transition closed→open on 3 failures within 10s window
    - In open state: serve reads from cache; queue writes up to 20, reject beyond that
    - After 10s cooldown: transition to half-open, allow one probe query
    - Probe success → closed; probe failure → open (restart cooldown)
    - Log each state transition with timestamp, previous state, new state, error count
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_

  - [x] 9.2 Scope circuit breaker to dashboard queries only
    - Apply `withCircuitBreaker` to shell queries and business-scoped data fetches
    - Exclude authentication, billing webhook processing, and migration operations
    - _Requirements: 7.10_

  - [ ]* 9.3 Write property test for circuit breaker cache age threshold
    - **Property 9: Circuit breaker cache age threshold**
    - For cached data of age A on pool exhaustion: returns cached data if A≤120, returns unavailability error if A>120 or no cache exists
    - **Validates: Requirements 7.1**

  - [ ]* 9.4 Write property test for circuit breaker state machine transitions
    - **Property 10: Circuit breaker state machine transitions**
    - Transitions closed→open iff 3+ failures in 10s; open→half-open after 10s cooldown; half-open→closed on probe success; half-open→open on probe failure
    - **Validates: Requirements 7.3, 7.6**

  - [ ]* 9.5 Write property test for circuit breaker write queue capacity
    - **Property 11: Circuit breaker write queue capacity**
    - For N writes in open state: exactly min(N,20) are queued; operations beyond 20 are immediately rejected with structured error
    - **Validates: Requirements 7.4**

- [x] 10. Extended Embedding Cache and Batch Generation
  - [x] 10.1 Extend embedding cache TTL and implement batch generation in `lib/ai/embeddings.ts`
    - Change `EMBEDDING_CACHE_TTL_SECONDS` from 300 to 86400 (24 hours)
    - Implement `generateEmbeddings(texts: string[])` accepting 1-20 texts, returning `(number[] | null)[]`
    - Use single provider API call for batch; fall back to sequential individual calls if batch API unavailable
    - Return empty array for empty input without making API calls
    - Reject with error if input exceeds 20 texts
    - Cache key format: `emb:{sha256(text)}` with 86400s TTL for both single and batch results
    - _Requirements: 8.1, 8.3, 8.4, 8.5, 8.6, 8.8, 8.9_

  - [x] 10.2 Implement embedding cache invalidation on knowledge base updates
    - On knowledge base entry update: delete cache key for old content hash, generate and cache new embedding
    - On knowledge base entry delete: delete cache key for content hash
    - _Requirements: 8.2, 8.7_

  - [ ]* 10.3 Write property test for embedding batch order preservation
    - **Property 12: Embedding batch order preservation**
    - For any array of 1-20 texts: result array has same length, each position i corresponds to texts[i] (embedding or null)
    - **Validates: Requirements 8.3**

  - [ ]* 10.4 Write property test for embedding cache key determinism
    - **Property 13: Embedding cache key determinism**
    - Same text always produces same cache key; distinct texts produce distinct keys (SHA-256 collision-free)
    - **Validates: Requirements 8.8**

  - [ ]* 10.5 Write property test for embedding batch cache consistency
    - **Property 14: Embedding batch cache consistency**
    - Batch-processed texts are cached with same key format and TTL as single `generateEmbedding`, subsequent single lookups find batch-generated entries
    - **Validates: Requirements 8.6**

  - [ ]* 10.6 Write property test for embedding cache invalidation on update
    - **Property 15: Embedding cache invalidation on update**
    - When content changes from T₁ to T₂: cache key for SHA-256(T₁) is deleted, new entry created for SHA-256(T₂) with 86400s TTL
    - **Validates: Requirements 8.2**

  - [ ]* 10.7 Write property test for embedding batch fallback to sequential
    - **Property 16: Embedding batch fallback to sequential**
    - When batch API fails entirely: falls back to individual calls, returns null in positions where individual generation also fails
    - **Validates: Requirements 8.5**

- [x] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Inngest Event Batching and Optimization
  - [x] 12.1 Create event batcher module at `lib/inngest/batch.ts`
    - Implement `batchSendEvents(events)` for dispatching arrays as single batch send
    - Implement `sendBatchedNotification(eventName, recipients, maxPerEvent=100)` combining recipients into single events (⌈N/100⌉ events)
    - Implement `sendDebouncedAutomationDispatch(businessId, triggers, debounceMs=5000)` combining triggers within debounce window (max 50 per event)
    - Auto-split payloads exceeding 512KB into minimum number of events within size limit, preserving ordering
    - On partial delivery failure: retry only failed payloads, up to 3 attempts with exponential backoff
    - Log batch ID, delivered/failed counts on error
    - _Requirements: 9.1, 9.2, 9.3, 9.5, 9.6, 9.7_

  - [x] 12.2 Migrate eligible cron jobs to Vercel Cron
    - Evaluate and move simple jobs (token log cleanup, expire quotes, expire subscriptions) to Vercel Cron
    - Ensure moved jobs use no Inngest step functions, require no retry logic, and complete in <30s
    - _Requirements: 9.4, 9.5_

  - [x] 12.3 Wire event batcher into existing notification and automation dispatch call sites
    - Replace per-recipient notification sends with `sendBatchedNotification`
    - Replace per-trigger automation dispatches with `sendDebouncedAutomationDispatch`
    - _Requirements: 9.1, 9.2_

  - [ ]* 12.4 Write property test for event batcher recipient combining with payload splitting
    - **Property 17: Event batcher recipient combining with payload splitting**
    - For N recipients: produces ⌈N/100⌉ events with ≤100 recipients each; payloads >512KB are further split minimally preserving order
    - **Validates: Requirements 9.1, 9.6**

  - [ ]* 12.5 Write property test for event batcher debounced automation dispatch
    - **Property 18: Event batcher debounced automation dispatch**
    - Triggers within 5s window for same business combined into single event (up to 50); emits ⌈triggers/50⌉ events total
    - **Validates: Requirements 9.2**

  - [ ]* 12.6 Write property test for event batcher partial failure retry
    - **Property 19: Event batcher partial failure retry**
    - When K of N payloads fail: retries only K failed (not N-K successful), up to 3 attempts with exponential backoff, logs batch ID + delivered/failed counts
    - **Validates: Requirements 9.7**

- [x] 13. Database Index Optimization
  - [x] 13.1 Create database migration for composite indexes
    - Add composite index on `inquiries(business_id, status, created_at)` using `CREATE INDEX CONCURRENTLY IF NOT EXISTS`
    - Add composite index on `quotes(business_id, status, created_at)` using `CREATE INDEX CONCURRENTLY IF NOT EXISTS`
    - Verify `public_action_events(action, key, created_at)` and `ai_usage_events(user_id, created_at)` / `ai_usage_events(business_id, created_at)` already exist; skip if present
    - Ensure total new index size ≤ 50MB via `pg_total_relation_size` check
    - Abort index creation if DB exceeds 80% of 500MB (400MB used)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

  - [x] 13.2 Verify query plan uses Index Scan for filtered list queries
    - Run EXPLAIN on inbox query (inquiries filtered by business_id, status, ordered by created_at DESC LIMIT 50)
    - Run EXPLAIN on quote list query (quotes filtered by business_id, status, ordered by created_at DESC LIMIT 50)
    - Confirm Index Scan or Index Only Scan is used (not Sequential Scan)
    - _Requirements: 10.9_

- [x] 14. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check (19 properties total)
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout — all implementations use TypeScript strict mode
- All optimizations operate within free-tier constraints: Supabase 5 connections, Upstash Redis 10K commands/day, Inngest 25K events/month
- Database indexes use `CREATE INDEX CONCURRENTLY` to avoid table locks in production
- Marketing page static generation excludes OG/Twitter image generation routes

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1", "6.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.2", "3.2", "5.1", "6.2", "7.1"] },
    { "id": 2, "tasks": ["1.4", "1.5", "1.6", "2.3", "2.4", "2.5", "5.2", "5.3", "7.2"] },
    { "id": 3, "tasks": ["7.3", "9.1", "10.1"] },
    { "id": 4, "tasks": ["9.2", "9.3", "9.4", "9.5", "10.2", "10.3", "10.4", "10.5", "10.6", "10.7"] },
    { "id": 5, "tasks": ["12.1", "13.1"] },
    { "id": 6, "tasks": ["12.2", "12.3", "12.4", "12.5", "12.6", "13.2"] }
  ]
}
```
