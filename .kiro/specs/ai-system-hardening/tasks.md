# Implementation Plan: AI System Hardening

## Overview

This plan implements a comprehensive hardening pass across the Requo AI assistant system covering caching, security, RAG retrieval, token optimization, and quality/reliability improvements. All changes are additive or surgical modifications to existing modules in `lib/ai/`, `features/ai/`, and `features/memory/`. The implementation is ordered to build foundational infrastructure first (cache layer), then security, then RAG enhancements, then optimization, and finally quality/reliability features.

## Tasks

- [x] 1. Cache Layer Infrastructure
  - [x] 1.1 Create the distributed cache layer module (`lib/ai/cache-layer.ts`)
    - Implement `CacheLayer` interface with `get`, `set`, `delete`, `increment` methods
    - Connect to Upstash Redis using `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` with 5s connection timeout
    - Implement in-memory `Map<string, { value: unknown; expiresAt: number }>` fallback when Redis is unavailable
    - Wrap all Redis operations in try/catch with 2s per-operation timeout, log warnings via `console.warn`
    - On `set`: dual-write to Redis and in-memory Map
    - On `get`: Redis-first, return Redis value without touching in-memory map; fall back to in-memory on Redis failure
    - Export singleton instance for use across modules
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.8_

  - [ ]* 1.2 Write property tests for cache layer
    - **Property 1: Cache layer never propagates exceptions**
    - **Property 2: Cache writes are durable with correct TTL**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.7, 1.8**

  - [x] 1.3 Migrate existing cache consumers to use the cache layer
    - Update `lib/ai/ai-cache.ts` to use `CacheLayer` for output caching with caller-specified TTLs
    - Update `lib/ai/capacity-selector.ts` to use `CacheLayer` for RPM (60s) and RPD (86400s) tracking
    - Update `lib/ai/usage-limiter.ts` to use `CacheLayer` for cooldown maps (3s TTL)
    - Update `features/ai/orchestrator/intent-classifier.ts` to use `CacheLayer` for classification cache (60s TTL)
    - Ensure all consumers respect existing TTL semantics
    - _Requirements: 1.6, 1.7_

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Security Hardening
  - [x] 3.1 Add Unicode normalization and multilingual detection to input sanitizer (`lib/ai/input-sanitizer.ts`)
    - Implement `normalizeInput()`: strip zero-width characters (U+200B, U+200C, U+200D, U+FEFF, U+00AD), then apply NFKC normalization
    - Add multilingual rejection patterns for French ("ignorez les instructions précédentes"), Spanish ("ignora las instrucciones anteriores"), German ("ignoriere vorherige Anweisungen")
    - Ensure pattern matching operates only on the normalized form, not the original input
    - Maintain processing time under 5ms for inputs up to 10,000 characters
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 3.2 Write property tests for input sanitizer normalization
    - **Property 3: Unicode normalization pipeline correctness**
    - **Property 4: Multilingual and homoglyph injection detection**
    - **Property 5: Input sanitizer performance bound**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

  - [x] 3.3 Implement memory content sanitization (`lib/ai/input-sanitizer.ts`)
    - Add `sanitizeMemoryContent(title: string, content: string): SanitizationResult` function
    - Scan both title and content fields for injection patterns before persistence
    - Reject save on high-confidence patterns; strip low-confidence patterns and log "memory_sanitized" event
    - Apply same NFKC normalization and zero-width stripping as chat input
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 3.4 Write property tests for memory content sanitization
    - **Property 6: Memory content sanitization**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [x] 3.5 Implement per-conversation injection lockout (`lib/ai/input-sanitizer.ts`)
    - Add `conversationId` parameter to `sanitizeAiInput()`
    - Increment per-conversation injection counter in Cache Layer on "rejected" or "sanitized" status
    - Reject all subsequent messages with status "locked" when counter reaches 3
    - Store counter with 1-hour TTL; log "conversation_locked" security event
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 3.6 Write property tests for injection lockout
    - **Property 7: Injection lockout threshold**
    - **Validates: Requirements 4.1, 4.2**

  - [x] 3.7 Implement canary token leak detection
    - In `features/ai/orchestrator/prompt-builder.ts`: generate deterministic canary token via HMAC-SHA256 of businessId + server secret, truncated to 16 chars
    - Embed canary token in every composed system prompt
    - In the output filter: detect canary token in AI output, redact response, log "canary_leak_detected" event
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 3.8 Write property tests for canary token
    - **Property 8: Canary token determinism and detection**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. RAG & Memory Enhancements
  - [x] 5.1 Implement RAG similarity threshold increase and confidence tiering (`features/memory/rag-retriever.ts`)
    - Raise minimum similarity threshold from 0.3 to 0.45
    - Implement confidence tier labeling: HIGH (≥ 0.7), MEDIUM (≥ 0.55), LOW (≥ 0.45)
    - Implement emergency fallback: return single highest-scoring memory if > 0.3 when none pass 0.45
    - Return empty result set if emergency fallback memory is below 0.3
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 5.2 Implement keyword boost for RAG retrieval (`features/memory/rag-retriever.ts`)
    - Check for case-insensitive keyword overlap between query and memory content (ignoring stop words)
    - Boost similarity score by 0.1 for memories with one or more exact keyword matches, capped at 1.0
    - _Requirements: 14.1, 14.2, 14.3_

  - [x] 5.3 Implement memory recency decay (`features/memory/rag-retriever.ts`)
    - Apply recency decay factor based on `updatedAt` timestamp
    - Formula: `decayFactor = min(daysSinceUpdate / 365, 1.0) * 0.30`; `effectiveScore = boostedScore * (1 - decayFactor)`
    - Apply after keyword boost and before similarity threshold filter
    - _Requirements: 28.1, 28.2, 28.3_

  - [ ]* 5.4 Write property tests for RAG scoring pipeline
    - **Property 9: RAG retrieval threshold and confidence tiering**
    - **Property 16: Keyword boost scoring**
    - **Property 26: Recency decay formula correctness**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 14.1, 14.2, 14.3, 28.1, 28.2, 28.3**

  - [x] 5.5 Implement query embedding cache
    - In the embedding module: cache generated embeddings keyed by hash of input text
    - Use Cache Layer with 300-second TTL
    - Return cached vector for same text within 5 minutes instead of calling embedding provider
    - _Requirements: 13.1, 13.2, 13.3_

  - [ ]* 5.6 Write property tests for embedding cache
    - **Property 15: Embedding cache round-trip**
    - **Validates: Requirements 13.1, 13.2**

  - [x] 5.7 Create unified RAG entry point (`features/memory/rag-retriever.ts`)
    - Expose single `retrieveMemories(options: RetrievalOptions): Promise<RetrievalResult>` function
    - Support optional category filtering, token budget, and topK parameters
    - Apply full scoring pipeline (embedding cache → similarity → keyword boost → recency decay → threshold → tier labeling → category filter → token budget)
    - Consolidate orchestrator `memory-retriever.ts` to delegate to this unified function
    - _Requirements: 15.1, 15.2, 15.3_

  - [ ]* 5.8 Write property tests for unified retriever
    - **Property 17: Unified retriever consistency**
    - **Validates: Requirements 15.2, 15.3**

  - [x] 5.9 Update orchestrator memory retriever to include confidence tier prefixes
    - Format memory entries with bracketed prefix (e.g., "[HIGH]", "[MEDIUM]", "[LOW]") before passing to Prompt Builder
    - _Requirements: 6.5_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Token & Cost Optimization
  - [x] 7.1 Implement tool output truncation (`lib/ai/tool-truncator.ts`)
    - Create `truncateToolOutput(output: string, isError: boolean): TruncationResult`
    - Text mode: truncate at last complete line boundary at or before 4000 characters
    - JSON mode (starts with `{` or `[`): truncate at last complete key-value/element boundary, close open brackets
    - Skip truncation for error-flagged outputs
    - Append `[truncated — showing first {n} chars of {total}]` (excluded from 4000 char limit)
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [ ]* 7.2 Write property tests for tool output truncation
    - **Property 18: Tool output truncation preserves validity**
    - **Validates: Requirements 16.1, 16.2, 16.3, 16.4**

  - [x] 7.3 Implement query-aware context pruning (`features/ai/surface-service.ts`)
    - When `classifyMessageComplexity` returns "simple": load only business identity and knowledge context
    - When "complex": load full context as today
    - Use existing `classifyMessageComplexity` function
    - _Requirements: 11.1, 11.2, 11.3_

  - [ ]* 7.4 Write property tests for context pruning
    - **Property 13: Context pruning by message complexity**
    - **Validates: Requirements 11.1, 11.2**

  - [x] 7.5 Implement duplicate memory retrieval elimination
    - In Orchestrator: perform memory retrieval once and pass results to Surface Service
    - In Surface Service: accept pre-retrieved memory results as optional parameter, skip own retrieval when provided
    - Ensure `retrieveRelevantMemories` is called at most once per dashboard chat request
    - _Requirements: 12.1, 12.2, 12.3_

  - [ ]* 7.6 Write property tests for single retrieval guarantee
    - **Property 14: Single memory retrieval per request**
    - **Validates: Requirements 12.2, 12.3**

  - [x] 7.7 Implement heuristic intent pre-classification (`features/ai/orchestrator/intent-classifier.ts`)
    - Add `HEURISTIC_PATTERNS` array covering: `data_query` (count/list/show/get + entity keywords), `general_question` (greetings)
    - Return classification without model call when heuristic matches
    - Cache heuristic results with same 60-second TTL
    - _Requirements: 19.1, 19.2, 19.3_

  - [ ]* 7.8 Write property tests for heuristic classification
    - **Property 19: Heuristic intent classification avoids model calls**
    - **Validates: Requirements 19.1, 19.2**

  - [x] 7.9 Implement intent-aware token allocation
    - Set `maxOutputTokens` based on classified intent: 800 for data_query/general_question, 2200 for quote_action/follow_up_action, 1400 for analytics/workflow_guidance/memory_recall
    - Wire into the orchestrator stream configuration
    - _Requirements: 24.1, 24.2, 24.3_

  - [ ]* 7.10 Write property tests for intent-to-token mapping
    - **Property 23: Intent-to-token allocation mapping**
    - **Validates: Requirements 24.1, 24.2, 24.3**

  - [x] 7.11 Implement business-scoped cache keys (`lib/ai/ai-cache.ts`)
    - For non-personalized tasks (inquiry_summary, form_suggestion, business_memory_summary): exclude userId from cache key
    - For personalized tasks: continue including userId
    - Maintain backward compatibility (don't invalidate existing entries)
    - _Requirements: 20.1, 20.2, 20.3_

  - [ ]* 7.12 Write property tests for business-scoped cache keys
    - **Property 20: Business-scoped cache key exclusion**
    - **Validates: Requirements 20.1, 20.2**

  - [x] 7.13 Implement batched usage limit query (`lib/ai/usage-limiter.ts`)
    - Replace two sequential queries with a single query returning both user-level and business-level monthly usage
    - Ensure results match the current two-query behavior
    - _Requirements: 21.1, 21.2_

  - [ ]* 7.14 Write property tests for batched usage query
    - **Property 21: Batched usage query equivalence**
    - **Validates: Requirements 21.1, 21.2**

  - [x] 7.15 Implement token-based context budgets (`features/ai/orchestrator/prompt-builder.ts`)
    - Use `Math.ceil(text.length / 4)` consistently for all budget calculations
    - Express maxContextCharacters in token-equivalent units
    - Enforce 1600-token budget accounting for all injected content (modules, memory, summary)
    - _Requirements: 17.1, 17.2, 17.3_

  - [x] 7.16 Compress dashboard tool descriptions
    - Reduce each tool description to ≤ 80 characters
    - Add "Returns: {format}" hint to each description
    - Ensure total combined character count ≤ 4000 characters
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ]* 7.17 Write property tests for tool description constraints
    - **Property 12: Tool description constraints**
    - **Validates: Requirements 10.1, 10.2**

  - [x] 7.18 Compress public inquiry chat prompt
    - Reduce prompt to ≤ 600 tokens (~2400 characters)
    - Preserve critical behavioral rules: conversation flow steps, field collection, submit_inquiry tool usage, identity constraints
    - Remove redundant phrasing and consolidate repeated rules
    - _Requirements: 27.1, 27.2, 27.3_

  - [x] 7.19 Deduplicate dashboard surface prompt (`features/ai/surface-service.ts`)
    - Consolidate anti-hallucination rules into single block of ≤ 5 lines
    - Remove repeated semantic instructions (e.g., "never fabricate", "never invent")
    - _Requirements: 9.1, 9.2_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Quality & Reliability
  - [x] 9.1 Fix backfill embeddings bug (`features/memory/rag-retriever.ts`)
    - Modify `backfillMemoryEmbeddings` to query only memories where embedding column is NULL
    - Skip memories with non-null embeddings
    - Return result with count of successfully updated and failed embedding generations
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 9.2 Write property tests for backfill fix
    - **Property 11: Backfill processes only null embeddings**
    - **Validates: Requirements 8.1, 8.2, 8.3**

  - [x] 9.3 Remove regex fallback extractor from public inquiry chat service
    - Remove `extractFieldsFromMessage` function call from stream logic
    - Return null for extracted fields when `submit_inquiry` tool was not called
    - _Requirements: 29.1, 29.2, 29.3_

  - [x] 9.4 Implement request deduplication (`lib/ai/request-dedup.ts`)
    - Generate dedup key from SHA-256 hash of `${conversationId}:${messageContent}`
    - Check Cache Layer for existing key within 10-second window
    - Return 409 Conflict if duplicate; set key with 10s TTL on new requests
    - _Requirements: 23.1, 23.2, 23.3_

  - [ ]* 9.5 Write property tests for request deduplication
    - **Property 22: Request deduplication determinism**
    - **Validates: Requirements 23.1, 23.2**

  - [x] 9.6 Implement quality gate logging (`lib/ai/quality-gate.ts`)
    - Create `checkQualityGate()` function detecting uncertainty phrases ("I don't know", "I'm not sure", "I cannot find")
    - Log quality gate event with: conversationId, userMessage, classifiedIntent, toolsAvailable, responseSnippet
    - Run in `onFinish` callback without blocking response stream
    - Only log when tools were injected in the request
    - _Requirements: 25.1, 25.2, 25.3_

  - [ ]* 9.7 Write property tests for quality gate detection
    - **Property 24: Quality gate detection**
    - **Validates: Requirements 25.1, 25.2**

  - [x] 9.8 Implement AI-based conversation summarization (`lib/ai/history-summarizer.ts`)
    - When conversation exceeds 12 messages: use cheap-tier AI model call for summary
    - 2s timeout with fallback to existing heuristic `summarizeDroppedMessages()`
    - Preserve temporal ordering of key events and decisions
    - Limit to 128 output tokens
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [x] 9.9 Implement token log retention policy (`features/ai/inngest/token-log-cleanup.ts`)
    - Create Inngest scheduled function running daily
    - Delete `ai_token_logs` entries older than 90 days
    - Batch size: 1000 rows per execution
    - Log number of deleted rows
    - _Requirements: 22.1, 22.2, 22.3_

  - [x] 9.10 Implement pricing hallucination guardrail (`features/ai/orchestrator/prompt-builder.ts`)
    - When `pricingBlocks` is null, empty string, or sentinel "- No saved pricing entries.": inject guardrail instruction
    - Instruct model that unitPriceInCents must be 0 and pricing requires manual entry
    - Include clarification note that pricing is pending owner review
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 9.11 Write property tests for pricing hallucination guardrail
    - **Property 10: Pricing hallucination guardrail**
    - **Validates: Requirements 7.1, 7.2, 7.3**

  - [x] 9.12 Implement template-based business identity (`features/ai/orchestrator/prompt-builder.ts`)
    - Accept `businessName` parameter from Orchestrator
    - Inject business name into `base_identity` module template (e.g., "You are the AI assistant for {businessName}")
    - _Requirements: 26.1, 26.2, 26.3_

  - [ ]* 9.13 Write property tests for business name in prompt
    - **Property 25: Business name in composed prompt**
    - **Validates: Requirements 26.1, 26.2**

- [x] 10. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation after each domain
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The cache layer (task 1.1) is foundational — security lockout, embedding cache, dedup, and usage limiter all depend on it
- All new modules follow the existing pattern: TypeScript, exported from barrel files, non-throwing error handling
- No new database tables are required; only a scheduled cleanup task for existing `ai_token_logs`
- The unified RAG retriever consolidates two existing code paths without changing the external API contract

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.5"] },
    { "id": 4, "tasks": ["3.4", "3.6", "3.7"] },
    { "id": 5, "tasks": ["3.8", "5.1", "5.2", "5.3"] },
    { "id": 6, "tasks": ["5.4", "5.5", "5.7"] },
    { "id": 7, "tasks": ["5.6", "5.8", "5.9"] },
    { "id": 8, "tasks": ["7.1", "7.3", "7.7", "7.11", "7.13", "7.15", "7.16", "7.18", "7.19"] },
    { "id": 9, "tasks": ["7.2", "7.4", "7.5", "7.8", "7.9", "7.12", "7.14", "7.17"] },
    { "id": 10, "tasks": ["7.6", "7.10", "9.1", "9.3", "9.4", "9.6", "9.8", "9.9", "9.10", "9.12"] },
    { "id": 11, "tasks": ["9.2", "9.5", "9.7", "9.11", "9.13"] }
  ]
}
```
