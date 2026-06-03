# Requirements Document

## Introduction

Performance and multi-user scalability improvements for Requo, targeting 100+ concurrent dashboard users and 500+ daily public page views without exceeding free-tier resource limits. The changes address the top bottlenecks identified in the current architecture: database-backed rate limiting consuming connection pool slots, per-request AI usage aggregation queries, static content served dynamically, sequential analytics processing, uncached public pages, large client bundles, fragile connection pooling, short-lived embedding caches, unbatched background events, and missing composite indexes. All improvements operate within existing free-tier constraints (Supabase 500MB/5 pooler connections, Upstash Redis 10K commands/day, Inngest 25K events/month, Vercel Hobby/Pro) and preserve the current architecture patterns.

## Glossary

- **Rate_Limiter**: The public action rate limiting module in `lib/public-action-rate-limit.ts` that checks and records request frequency for public-facing actions.
- **Redis_Rate_Limiter**: A new rate limiting implementation using Upstash Redis sliding window counters instead of database SELECT+INSERT operations.
- **Usage_Counter**: The monthly AI usage counting mechanism in `lib/ai/usage-limiter.ts` that computes SUM aggregates over `ai_usage_events` to check quota.
- **Cache_Layer**: The existing distributed cache module in `lib/ai/cache-layer.ts` providing Upstash Redis with in-memory fallback.
- **Marketing_Pages**: The static content pages in `app/(marketing)/` including landing, pricing, legal, terms, privacy, refund-policy, security, and subprocessors.
- **Analytics_Rollup**: The background Inngest job that computes periodic analytics aggregates for businesses.
- **Public_Pages**: The publicly accessible pages in `app/(public)/` including inquiry intake forms and quote response pages.
- **Bundle_Optimizer**: The lazy-loading strategy for heavy client-side libraries using `next/dynamic` with `ssr: false`.
- **Connection_Pool**: The Supabase PostgreSQL connection pooler with a maximum of 5 concurrent connections available to the application.
- **Circuit_Breaker**: A resilience pattern that detects connection pool exhaustion and returns cached or stale data instead of failing requests.
- **Embedding_Batcher**: A batch embedding generation function that processes multiple texts in a single provider call where supported.
- **Event_Batcher**: A pattern for combining multiple Inngest event sends into fewer dispatches to conserve the monthly event quota.
- **DB_Index**: A composite database index on frequently queried column combinations to reduce query planning and execution time.

## Requirements

### Requirement 1: Redis-Based Public Action Rate Limiting

**User Story:** As a system operator, I want public action rate limiting to use Redis sliding window counters instead of database queries, so that rate limit checks do not consume scarce connection pool slots or create write contention under load.

#### Acceptance Criteria

1. WHEN a public action rate limit check is performed, THE Redis_Rate_Limiter SHALL evaluate the request using an Upstash Redis sliding window counter keyed by action type and client fingerprint, without executing any database SELECT or INSERT query for the rate limit check itself.
2. THE Redis_Rate_Limiter SHALL accept the same `action`, `scope`, `limit`, and `windowMs` parameters as the existing `assertPublicActionRateLimit` function signature and support all 10 existing action types.
3. THE Redis_Rate_Limiter SHALL use at most 2 Redis round-trip commands per rate limit check (one to increment the counter with an atomic TTL set equal to the window duration, one to read the current window count).
4. IF Redis is unavailable (connection failure, timeout exceeding 2 seconds, or missing `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` environment variables), THEN THE Redis_Rate_Limiter SHALL fall back to the existing database-backed rate limiting implementation, preserve the original fail-closed behavior for public actions, and log a structured warning to the console indicating the fallback activation reason.
5. WHEN a rate limit check succeeds (request count is below the configured limit within the sliding window), THE Redis_Rate_Limiter SHALL return a result indicating allowed status (`true`) along with metadata containing the configured limit, the remaining request count, and the window reset time as a Unix epoch timestamp in seconds.
6. WHEN the request count equals or exceeds the configured limit within the sliding window, THE Redis_Rate_Limiter SHALL return a result indicating denied status (`false`) along with the same metadata (limit, remaining as 0, and reset time as Unix epoch seconds).
7. WHEN a response is sent for a public action that performed a rate limit check, THE System SHALL include `X-RateLimit-Limit` (configured maximum), `X-RateLimit-Remaining` (requests remaining in window), and `X-RateLimit-Reset` (Unix epoch seconds when the window resets) response headers using the metadata returned by the Redis_Rate_Limiter.
8. WHEN the business-scoped rate limiter (`assertBusinessActionRateLimit`) is invoked, THE Redis_Rate_Limiter SHALL use Redis sliding window counters with the same Redis-first strategy, and IF Redis is unavailable, THEN THE Redis_Rate_Limiter SHALL fall back to the existing database-backed implementation while preserving the original fail-open behavior (return `true` on error) for business-scoped actions.

### Requirement 2: Redis-Cached AI Usage Counter

**User Story:** As a business owner using AI features, I want usage limit checks to respond without waiting for a database aggregate query, so that AI interactions feel instant even when many users are active simultaneously.

#### Acceptance Criteria

1. WHEN checking monthly AI usage, THE Usage_Counter SHALL first read a cached usage count from the Cache_Layer with a key scoped to businessId and the current UTC month (pattern `ai_usage:business:{businessId}:{YYYY-MM}`), returning the cached value if present within 2000 milliseconds.
2. IF the cached usage count is not present (cache miss), THEN THE Usage_Counter SHALL execute the existing database SUM aggregate query, store the result in the Cache_Layer with a TTL of 60 seconds, and return the computed value.
3. WHEN a successful AI invocation is recorded via `recordUsage`, THE Usage_Counter SHALL atomically increment the cached counter in the Cache_Layer by the invocation weight (1–3 as defined by TASK_WEIGHTS), so that subsequent checks reflect the new usage without requiring a database query.
4. IF the Redis increment operation fails, THEN THE Usage_Counter SHALL invalidate (delete) the cached counter so that the next check falls through to the database aggregate, and SHALL log a warning without interrupting the caller.
5. THE Usage_Counter SHALL maintain separate cache keys for user-level and business-level monthly totals, following the patterns `ai_usage:user:{userId}:{YYYY-MM}` and `ai_usage:business:{businessId}:{YYYY-MM}`.
6. WHEN a new calendar month begins (UTC), THE Usage_Counter SHALL allow the previous month's cache keys to expire naturally via the 60-second TTL without requiring explicit invalidation logic.
7. THE cached usage counter SHALL tolerate a staleness window of up to 60 seconds for read operations, accepting that a user may briefly exceed their plan quota by at most one additional weighted request (maximum overshoot of 3 weight units) before the next database-backed check refreshes the counter.
8. IF the Cache_Layer is entirely unavailable (both Redis and in-memory fallback return errors), THEN THE Usage_Counter SHALL fall through to the database aggregate query, ensuring usage checks never fail silently and always return a usage value.
9. WHEN the cached counter is incremented after a successful AI invocation, THE Usage_Counter SHALL set the TTL on the cache key to 60 seconds if the key was newly created by the increment operation, preserving natural expiration alignment.

### Requirement 3: Static Generation for Marketing Pages

**User Story:** As a visitor browsing Requo's marketing site, I want pages to load instantly from CDN cache, so that the marketing experience is fast regardless of origin server load.

#### Acceptance Criteria

1. THE Marketing_Pages (landing, pricing, legal, terms, privacy, refund-policy, security, subprocessors) SHALL export `dynamic = "force-static"` to ensure Next.js generates them as static HTML at build time.
2. THE Marketing_Pages SHALL export `revalidate = 3600` so that Next.js regenerates the static HTML at most once every 3600 seconds (1 hour) via incremental static regeneration.
3. WHEN a marketing page is requested after a successful build, THE application SHALL serve the response with a cache status indicating CDN edge delivery (e.g., Vercel `x-vercel-cache: HIT` or `STALE` header) and SHALL NOT invoke database queries or session-dependent server functions on the origin server during the request.
4. THE Marketing_Pages SHALL not import or reference any server-only modules (e.g., `server-only`, database client from `lib/db`), session utilities (e.g., `lib/auth`), or request-dependent APIs (e.g., `headers()`, `cookies()`) that would prevent static generation.
5. IF a marketing page currently uses dynamic request data (geo-detection headers for currency display, feature flags, or runtime environment variables), THEN THE page SHALL replace that data access with build-time resolution using public environment variables (`NEXT_PUBLIC_*`), hardcoded default values, or client-side detection after hydration, preserving the `force-static` export.
6. WHEN the marketing layout (`app/(marketing)/layout.tsx`) renders, THE layout SHALL not perform any database queries, session checks, or calls to request-scoped APIs (`headers()`, `cookies()`) that would force all child marketing pages into dynamic rendering.
7. IF ISR revalidation fails for a marketing page (e.g., build error during background regeneration), THEN THE application SHALL continue serving the previously cached static version until a subsequent successful revalidation occurs.
8. THE Marketing_Pages scope SHALL be limited to route-level page components within `app/(marketing)/`. Image generation routes (`opengraph-image.tsx`, `twitter-image.tsx`) within the same directory are excluded from the `force-static` requirement since they execute on-demand by design.

### Requirement 4: Batched Analytics Rollup Processing

**User Story:** As a system operator, I want analytics rollup jobs to process businesses in parallel batches rather than sequentially, so that the total job duration decreases and connection pool usage is bounded.

#### Acceptance Criteria

1. WHEN the Analytics_Rollup job executes, THE job SHALL process businesses in parallel batches of a configurable size (default: 10 businesses per batch, minimum: 5, maximum: 25).
2. THE Analytics_Rollup SHALL use `Promise.allSettled` for each batch so that a failure in one business's rollup does not prevent other businesses in the same batch from completing.
3. WHEN a batch completes, THE Analytics_Rollup SHALL wait for all promises in the current batch to settle before starting the next batch, ensuring that at most one batch is in-flight at any time so that concurrent database connections do not exceed the pool limit of 5.
4. IF a business rollup within a batch fails, THEN THE Analytics_Rollup SHALL log the businessId and error message, include the businessId and error in the returned `AnalyticsRollupSummary.errors` array, and continue processing remaining batches without interruption.
5. THE Analytics_Rollup SHALL complete processing for up to 50 businesses within 30 seconds total execution time, measured from job start to final batch settlement. IF the number of active businesses exceeds 50, THEN THE Analytics_Rollup SHALL continue processing all businesses across as many batches as needed, without enforcing a total time limit beyond the Inngest function timeout.
6. WHERE a rollup metric can be computed with a single SQL query that aggregates across all businesses in the batch simultaneously (rather than issuing one query per business), THE Analytics_Rollup SHALL use that single-query approach, reducing total query count per batch.

### Requirement 5: Edge Cache Headers for Public Pages

**User Story:** As a potential customer viewing a public inquiry form or quote page, I want the page to load quickly from edge cache on repeat visits, so that the experience feels responsive even under high traffic.

#### Acceptance Criteria

1. WHEN a Public_Page (inquiry form at `/inquire/[slug]` or quote response page at `/quote/[token]`) is requested, THE application SHALL include a `Cache-Control` header with the directives `public, s-maxage=60, stale-while-revalidate=300`.
2. THE Public_Pages SHALL use the Next.js edge runtime (`export const runtime = "edge"`) for route handlers that serve public page data, so that cold start latency does not exceed 200ms at the p95 level.
3. WHILE the `stale-while-revalidate` window is active (up to 300 seconds after `s-maxage` expires), THE application SHALL allow edge nodes to serve the previously cached response while asynchronously fetching a fresh response from the origin, requiring no explicit cache purge when underlying data changes.
4. THE `s-maxage=60` directive SHALL ensure that CDN edge nodes cache the response for 60 seconds, limiting origin requests to at most one per minute per unique page URL.
5. THE `stale-while-revalidate=300` directive SHALL allow edge nodes to serve stale content for up to 300 additional seconds (total staleness window of 360 seconds from initial cache) while asynchronously fetching a fresh response from the origin.
6. IF a user performs a state-changing action on a public page (e.g., accepting or rejecting a quote), THEN THE page SHALL trigger a client-side data refetch within 2 seconds of the action completing to display the updated state without relying on edge cache freshness.
7. WHEN a Public_Page response is served from edge cache, THE response SHALL include a `Vary: Accept-Encoding` header to prevent serving incorrectly encoded cached responses to clients with different encoding capabilities.

### Requirement 6: Client Bundle Size Optimization

**User Story:** As a dashboard user on a slow connection, I want the initial page load to be fast, so that I can start working without waiting for large charting and workflow libraries to download.

#### Acceptance Criteria

1. THE Bundle_Optimizer SHALL lazy-load the Recharts library using `next/dynamic` with `ssr: false` so that chart components are only downloaded when a page containing charts is rendered on the client.
2. THE Bundle_Optimizer SHALL lazy-load the `@xyflow/react` workflow builder library using `next/dynamic` with `ssr: false` so that the canvas component is only downloaded when the automations builder page is rendered.
3. THE Bundle_Optimizer SHALL lazy-load `react-easy-crop`, `html-to-image`, and `pdf-lib` using `next/dynamic` with `ssr: false` so that image cropping and PDF generation code is only downloaded when the user navigates to a view that renders the crop dialog or triggers PDF export.
4. WHEN a lazy-loaded component is loading, THE Bundle_Optimizer SHALL display a placeholder (skeleton or spinner) whose width and height match the target component's container dimensions so that Cumulative Layout Shift (CLS) remains below 0.1 for that page, and the placeholder itself SHALL add no more than 2 KB (uncompressed) of additional JavaScript.
5. THE lazy-loading changes SHALL reduce the initial JavaScript bundle for the dashboard home page by at least 100 KB gzipped as measured by comparing the `next build` output "First Load JS" value for the dashboard home route before and after the optimization is applied.
6. WHILE operating on a simulated 4G connection (1.5 Mbps download throughput, 150 ms RTT), THE lazy-loaded components SHALL render and become responsive to user interaction within 500 milliseconds from the moment the component's container enters the viewport.
7. IF a lazy-loaded chunk fails to download due to a network error, THEN THE Bundle_Optimizer SHALL display an inline error message indicating the component could not be loaded, along with a retry control that re-attempts the chunk download when activated.

### Requirement 7: Database Connection Pool Resilience

**User Story:** As a dashboard user during peak concurrent usage, I want the application to degrade gracefully when the connection pool is exhausted, so that I see stale data instead of error pages.

#### Acceptance Criteria

1. WHEN a database query fails due to connection pool exhaustion (pool timeout, all connections busy), THE Circuit_Breaker SHALL return cached data from the Cache_Layer if a cached response exists for the same query key and the cached entry is no more than 120 seconds old.
2. IF no cached data exists for the failed query, THEN THE Circuit_Breaker SHALL return a structured error indicating temporary unavailability and suggest the caller retry after 5 seconds.
3. WHEN the Circuit_Breaker has detected 3 consecutive pool exhaustion errors within a 10-second window, THE Circuit_Breaker SHALL enter an "open" state where subsequent read queries are served from cache (if available) without attempting a database connection for a cooldown period of 10 seconds.
4. WHILE the Circuit_Breaker is in the "open" state, THE application SHALL queue write operations (mutations, inserts) up to a maximum of 20 pending writes and attempt each queued write once after the cooldown period expires.
5. IF a queued write operation fails after its single retry attempt, THEN THE Circuit_Breaker SHALL discard the write from the queue and return a structured error to the caller indicating the write could not be completed.
6. WHEN the cooldown period expires, THE Circuit_Breaker SHALL enter a "half-open" state allowing one probe query through to the database.
7. IF the probe query in the "half-open" state succeeds, THEN THE Circuit_Breaker SHALL return to the "closed" (normal) state.
8. IF the probe query in the "half-open" state fails, THEN THE Circuit_Breaker SHALL return to the "open" state and restart the 10-second cooldown period.
9. THE Circuit_Breaker SHALL log each state transition (closed → open, open → half-open, half-open → closed, half-open → open) with a structured entry including the timestamp, previous state, new state, and triggering error count.
10. THE Circuit_Breaker SHALL apply only to queries in the dashboard request path (shell queries, business-scoped data fetches) and SHALL NOT apply to authentication, billing webhook processing, or migration operations.

### Requirement 8: Extended Embedding Cache and Batch Generation

**User Story:** As a business owner with knowledge base entries, I want embeddings to be generated efficiently and cached for longer, so that memory retrieval is fast and embedding provider costs stay low.

#### Acceptance Criteria

1. THE embedding cache TTL SHALL be increased from the current 300 seconds (5 minutes) to 86400 seconds (24 hours) for the `generateEmbedding` function, reducing redundant embedding generation for unchanged knowledge base content.
2. WHEN a knowledge base entry is updated or deleted, THE Cache_Layer SHALL delete the cache key corresponding to the previous content hash so that stale embeddings are not served for content that no longer exists or has changed.
3. THE Embedding_Batcher SHALL provide a `generateEmbeddings` function that accepts an array of texts (minimum 1, maximum 20 per call) and returns an array of embedding vectors in the same order, using a single provider API call where the provider supports batch embedding.
4. IF the input array to `generateEmbeddings` is empty, THEN THE Embedding_Batcher SHALL return an empty array without making any provider API calls.
5. WHEN the embedding provider does not support batch requests or the batch call fails entirely, THE Embedding_Batcher SHALL fall back to sequential individual `generateEmbedding` calls for each text in the input array, returning null in the corresponding position for any individual text that fails.
6. THE Embedding_Batcher SHALL cache each individual embedding result from a batch operation with the same key format and TTL as single embeddings, so that subsequent individual lookups benefit from batch-generated cache entries.
7. WHEN a knowledge base entry is created or updated, THE system SHALL generate and cache the embedding using the `generateEmbedding` function with the extended 24-hour TTL, replacing any existing cached embedding for that content.
8. THE embedding cache key SHALL incorporate a SHA-256 content hash so that changed content produces a new cache key, while unchanged content continues to use the long-lived cached embedding without regeneration.
9. IF the input array to `generateEmbeddings` contains more than 20 texts, THEN THE Embedding_Batcher SHALL reject the call and return an error indication without making any provider API calls.

### Requirement 9: Inngest Event Batching and Optimization

**User Story:** As a system operator, I want background event dispatches to be batched and optimized, so that the monthly Inngest event quota (25K events) is consumed efficiently and the system can handle growth without hitting limits.

#### Acceptance Criteria

1. WHEN multiple push notifications need to be sent for the same triggering event (e.g., notifying all team members of a new inquiry), THE Event_Batcher SHALL combine them into a single Inngest event containing an array of up to 100 recipients rather than dispatching one event per recipient.
2. WHEN automation dispatch events are triggered for the same business within a 5-second debounce window (e.g., multiple inquiries arriving simultaneously), THE Event_Batcher SHALL combine them into a single dispatch event containing all pending triggers, up to a maximum of 50 triggers per batched event.
3. THE Event_Batcher SHALL provide a `batchSendEvents` utility function that accepts an array of Inngest event payloads and dispatches them as a single batch send operation using the Inngest client's batch API.
4. WHERE a cron job uses no Inngest step functions, requires no retry logic, and executes in under 30 seconds (e.g., a daily cleanup or expiration check), THE system SHALL evaluate moving that job to Vercel Cron to preserve Inngest event budget for workflows that depend on step orchestration, retries, or throttling.
5. THE batched event dispatch approach SHALL reduce total monthly Inngest event consumption by at least 30% compared to the current per-recipient, per-trigger dispatch pattern, measured by comparing event counts in the Inngest dashboard under a baseline load of 20 businesses with 5 team members each generating average daily activity.
6. IF a batched event payload exceeds Inngest's maximum event size (512KB), THEN THE Event_Batcher SHALL split the payload into the minimum number of events each within the 512KB size limit and dispatch them sequentially in array-index order, preserving the original recipient/trigger ordering.
7. IF a batch send operation fails after partial delivery (some split payloads sent, others not), THEN THE Event_Batcher SHALL retry only the undelivered payloads up to 3 attempts with exponential backoff, and log an error indicating the batch ID, number of delivered payloads, and number of failed payloads.

### Requirement 10: Database Index Optimization

**User Story:** As a dashboard user viewing filtered lists, I want query responses to remain fast as data grows, so that the experience stays responsive even with thousands of inquiries and quotes.

#### Acceptance Criteria

1. THE DB_Index optimization SHALL ensure a composite index exists on `public_action_events(action, key, created_at)` to accelerate the rate limiting SELECT query that filters by action, key, and created_at window.
2. THE DB_Index optimization SHALL ensure composite indexes exist on `ai_usage_events(user_id, created_at)` and `ai_usage_events(business_id, created_at)` to accelerate the monthly usage SUM aggregate queries in the Usage_Counter.
3. THE DB_Index optimization SHALL add a composite index on `inquiries(business_id, status, created_at)` to accelerate the inbox query that filters by business, status, and sorts by creation date.
4. THE DB_Index optimization SHALL add a composite index on `quotes(business_id, status, created_at)` to accelerate the quote list query that filters by business, status, and sorts by creation date.
5. WHEN adding indexes, THE migration SHALL use `CREATE INDEX CONCURRENTLY` (or equivalent non-blocking DDL) to avoid locking tables during index creation in production.
6. IF a required index already exists in the schema with matching columns and column order, THEN THE migration SHALL skip creating that index and no duplicate index SHALL be generated.
7. THE total additional storage consumed by new indexes SHALL not exceed 50MB to remain within the Supabase free-tier 500MB database size limit, verified by querying `pg_total_relation_size` for each new index after creation and confirming the sum of new index sizes is at most 50MB.
8. IF an index would cause the database to exceed 80% of the 500MB storage limit (400MB used), THEN THE index SHALL not be added and the constraint SHALL be documented as a known limitation.
9. WHEN each new index in criteria 3 and 4 is created, THE query planner SHALL use an Index Scan or Index Only Scan (not a Sequential Scan) for the corresponding filtered list query, verified by running EXPLAIN on the inbox query filtered by business_id, status, and ordered by created_at DESC with a LIMIT of 50 rows.
