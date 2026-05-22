# Implementation Plan: AI Cost Optimization

## Overview

This plan implements the AI Cost and Token Optimization system for Requo. The implementation follows a bottom-up approach: database schemas first, then shared infrastructure modules (`lib/ai/`), then feature-level orchestration (`features/ai/`), and finally wiring into existing server actions and API routes. Each step builds on the previous, ensuring no orphaned code.

## Tasks

- [x] 1. Database schema and migrations
  - [x] 1.1 Create AI schema tables (ai_usage_events, ai_token_logs, ai_drafts)
    - Add `aiUsageEvents`, `aiTokenLogs`, and `aiDrafts` table definitions to `lib/db/schema/ai.ts`
    - Include all columns, indexes, and foreign key constraints as specified in the design
    - Export the new tables from the schema barrel file
    - Generate and run the Drizzle migration
    - _Requirements: 5.1, 6.1, 6.4, 8.1, 8.4_

- [x] 2. AI Task Registry
  - [x] 2.1 Implement the task registry module (`features/ai/task-registry.ts`)
    - Define `aiTaskTypes` const array and `AiTaskType` type
    - Define `taskConfigSchema` with Zod validation for all fields (qualityTier, maxOutputTokens, temperature, requiredContextFields, cacheTTL, priorityWeight, streamingPermitted, maxContextCharacters)
    - Define `AI_TASK_REGISTRY` constant with entries for all 6 task types matching the design spec
    - Implement `getTaskConfig(taskType)` that returns config or throws with valid types listed
    - Implement `validateInvocationPayload(taskType, payload)` that throws if required fields are missing/empty
    - Export types and functions
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 2.2 Write property tests for task registry
    - **Property 1: Task registry returns valid, complete configurations**
    - **Property 2: Invalid task types are rejected with descriptive errors**
    - **Property 3: Missing required context fields are rejected**
    - **Property 27: Registry tier and token limit consistency**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.5, 9.1, 10.2, 10.3**

- [x] 3. AI Context Builder
  - [x] 3.1 Implement the context builder module (`features/ai/context-builder.ts`)
    - Define `ContextBuilderInput` and `ContextBuilderOutput` types
    - Implement `buildTaskContext(input)` with the truncation algorithm: assemble required fields, enforce character budget, omit fields in reverse priority order, truncate lowest-priority field if partial inclusion fits
    - Skip unavailable (null/empty) fields without error
    - Never include fields not in `requiredContextFields`
    - _Requirements: 2.1, 2.2, 2.5, 2.6_

  - [ ]* 3.2 Write property tests for context builder
    - **Property 4: Context assembly includes only required fields**
    - **Property 5: Context assembly respects character budget**
    - **Property 6: Unavailable context fields do not cause failures**
    - **Validates: Requirements 2.1, 2.2, 2.5, 2.6**

- [x] 4. Prompt templates
  - [x] 4.1 Create prompt template files (`features/ai/prompts/`)
    - Create `inquiry-summary.ts` — JSON-only output, system prompt ≤800 tokens
    - Create `quote-draft.ts` — structured output, system prompt ≤1600 tokens
    - Create `followup-message.ts` — system prompt ≤800 tokens
    - Create `quote-improvement.ts` — structured output, system prompt ≤1600 tokens
    - Create `form-suggestion.ts` — JSON-only output, system prompt ≤800 tokens
    - Create `business-memory-summary.ts` — JSON-only output, system prompt ≤1600 tokens
    - No filler phrases, no conversational greetings, no role-play framing
    - Each file exports a function that accepts context and returns the system prompt string
    - _Requirements: 9.2, 9.3, 9.4, 11.4_

  - [ ]* 4.2 Write property tests for prompt templates
    - **Property 28: System prompts exclude filler phrases**
    - **Property 29: System prompt respects token budget**
    - **Validates: Requirements 9.3, 9.4**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Pricing Retriever
  - [x] 6.1 Implement the pricing retriever module (`features/ai/pricing-retriever.ts`)
    - Define `PricingRetrieverInput` and `PricingRetrieverOutput` types
    - Implement `retrieveRelevantPricing(input)` with text similarity scoring (normalized token overlap on lowercased, stemmed tokens)
    - Load pricing library filtered by currency
    - If fewer than 3 entries in target currency, return all entries (bypass filtering)
    - Filter entries scoring ≥0.3, return top entries up to maxResults (default 7), minimum 1 when results exist
    - If no entries pass threshold, return empty set with `needsOwnerReview: true`
    - Never fabricate, interpolate, or modify pricing data
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 6.2 Write property tests for pricing retriever
    - **Property 7: Pricing retriever returns valid bounded results**
    - **Property 8: Small pricing libraries bypass filtering**
    - **Property 9: Below-threshold pricing returns empty with review flag**
    - **Property 10: Pricing retriever returns only verbatim library entries**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

- [x] 7. AI Cache
  - [x] 7.1 Implement the AI cache module (`lib/ai/ai-cache.ts`)
    - Define `CacheKeyComponents` and `CachedAiOutput` types
    - Implement deterministic cache key generation (SHA-256 of JSON-serialized sorted components)
    - Implement in-memory Map storage with TTL enforcement on read
    - Implement `getCachedOutput(key)` — returns cached output or null, handles read failures gracefully (log warning, return null)
    - Implement `setCachedOutput(key, output, ttl)` — stores output, handles write failures gracefully (log warning)
    - Use stable null sentinel `"__null__"` for absent optional components
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 7.2 Write property tests for AI cache
    - **Property 11: Cache key determinism and uniqueness**
    - **Property 12: Cache round-trip within TTL**
    - **Property 13: Cache entries expire after TTL**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [x] 8. Usage Limiter
  - [x] 8.1 Implement the usage limiter module (`lib/ai/usage-limiter.ts`)
    - Define plan limits (Free=10, Pro=300, Business=2000) and task weights
    - Implement `checkUsageLimit(input)` — queries monthly weighted usage for user-level and business-level, rejects if either meets/exceeds limit
    - Implement `recordUsage(userId, businessId, taskType, weight)` — inserts into ai_usage_events
    - Implement cooldown tracking (in-memory Map keyed by `userId:taskType` → last accepted timestamp)
    - Cooldown: 3-second minimum between consecutive requests, rejection includes remaining seconds
    - Cooldown rejections do not deduct usage
    - Cache hits do not start cooldown or deduct usage
    - Monthly usage queried with `WHERE createdAt >= startOfCurrentMonthUTC`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4_

  - [ ]* 8.2 Write property tests for usage limiter
    - **Property 18: Usage limit enforcement**
    - **Property 19: Task weight accumulation**
    - **Property 20: Dual-scope usage tracking**
    - **Property 21: Cache hits have no usage or cooldown side effects**
    - **Property 22: Cooldown enforcement**
    - **Property 23: Cooldown rejections do not consume quota**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.6, 7.1, 7.3, 7.4**

- [x] 9. Token Logger
  - [x] 9.1 Implement the token logger module (`lib/ai/token-logger.ts`)
    - Define `TOKEN_COST_TABLE` with per-model input/output rates
    - Implement `logAiInvocation(params)` — inserts into ai_token_logs with all required fields
    - Compute estimated cost: `(inputTokens × inputRate / 1_000_000) + (outputTokens × outputRate / 1_000_000)` converted to cents
    - If model/provider not in cost table, record null cost and `unpriced: true`
    - Cache hits logged with `inputTokens: 0`, `outputTokens: 0`, `cacheHit: true`
    - Write structured JSON `console.info` line for server log aggregation
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 4.7_

  - [ ]* 9.2 Write property tests for token logger
    - **Property 14: Cache hits logged with zero tokens**
    - **Property 24: Token log completeness**
    - **Property 25: Cost estimation correctness**
    - **Property 26: Unpriced model handling**
    - **Validates: Requirements 4.7, 8.1, 8.2, 8.3**

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. AI Draft Store
  - [x] 11.1 Implement the draft store module (`features/ai/draft-store.ts`)
    - Implement `getDraft(entityId, taskType)` — retrieves draft, updates `lastAccessedAt`, checks staleness against source entity `updatedAt`
    - Implement `saveDraft(params)` — upserts draft (one per entityId + taskType)
    - Implement `markDraftStale(entityId, taskType)` — sets `isStale: true`
    - Implement `deleteDraftsForEntity(entityId)` — removes all drafts for an entity
    - Implement `cleanupExpiredDrafts(olderThanDays)` — deletes drafts with `lastAccessedAt` > 90 days ago
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 5.7, 5.8_

  - [ ]* 11.2 Write property tests for draft store
    - **Property 15: Draft store round-trip**
    - **Property 16: Draft staleness detection**
    - **Property 17: Only one draft per entity and task type**
    - **Validates: Requirements 5.1, 5.5, 5.6**

- [x] 12. Orchestration layer integration
  - [x] 12.1 Wire modules into the AI orchestration flow (`features/ai/actions.ts`)
    - Refactor existing AI server actions to use the new pipeline: validate input → check usage limit → get task config → build context → check cache → invoke model router → cache output → save draft → log tokens
    - Pass `qualityTier` from task registry to the existing model router
    - On cache hit: return cached output, log with zero tokens, skip usage deduction and cooldown
    - On cache miss: invoke AI, cache result, record usage, start cooldown, log tokens
    - Handle all error scenarios per the design error handling table
    - Ensure streaming tasks (quote_draft, quote_improvement) work with the new pipeline
    - _Requirements: 10.1, 10.4, 10.5, 10.6, 11.1, 11.2, 11.5_

  - [x] 12.2 Update quote generation to use new modules
    - Refactor `features/ai/quote-generator.ts` to use task registry, context builder, pricing retriever, and draft store
    - Include inquiry text, customer name, email, pricing blocks (from retriever), tone preference, and business memory summary in context
    - For quote_improvement, include existing quote draft
    - Enforce context character budget via context builder
    - _Requirements: 2.3, 2.4, 3.1_

  - [ ]* 12.3 Write integration tests for the full AI cost flow
    - Test full request flow: action → limiter → registry → context → cache → router → logger
    - Test monthly reset boundary
    - Test draft cascade delete on entity deletion
    - Test draft cleanup job
    - _Requirements: 6.5, 5.7, 5.8_

- [x] 13. Plan change and subscription integration
  - [x] 13.1 Handle mid-month plan changes in usage limiter
    - When a user's subscription plan changes, apply the new plan's limit to subsequent requests without resetting accumulated usage
    - Integrate with existing `getEffectivePlan()` from `lib/billing/subscription-service.ts` to resolve current plan
    - _Requirements: 6.7_

- [x] 14. Model routing integration verification
  - [x] 14.1 Verify task-aware model routing works with existing router
    - Confirm `lib/ai/router.ts` accepts `qualityTier` on requests and selects models accordingly
    - Ensure "cheap" tier tasks (inquiry_summary, followup_message, form_suggestion) route to cheaper models
    - Ensure "balanced" tier tasks (quote_draft, quote_improvement, business_memory_summary) route to balanced models
    - Ensure fallback chain exhausts all providers without escalating to higher-cost tier
    - Add defensive fallback to "balanced" if no tier specified
    - _Requirements: 10.1, 10.2, 10.3, 10.5, 10.6_

  - [ ]* 14.2 Write property test for model routing integration
    - **Property 30: Model router uses registry tier for fallback chain selection**
    - **Validates: Requirements 10.1, 10.6**

- [x] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout — all implementation uses TypeScript
- The existing `lib/ai/router.ts` already supports quality tiers; no changes needed there
- Database migrations should be generated via `npx drizzle-kit generate` and applied with `npx drizzle-kit migrate`
- fast-check is used for property-based testing with Vitest

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "9.1"] },
    { "id": 2, "tasks": ["2.2", "3.1", "7.1", "8.1"] },
    { "id": 3, "tasks": ["3.2", "4.1", "6.1", "7.2", "8.2", "9.2"] },
    { "id": 4, "tasks": ["4.2", "6.2", "11.1"] },
    { "id": 5, "tasks": ["11.2", "12.1"] },
    { "id": 6, "tasks": ["12.2", "13.1", "14.1"] },
    { "id": 7, "tasks": ["12.3", "14.2"] }
  ]
}
```
