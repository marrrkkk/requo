# Implementation Plan: AI Orchestration System

## Overview

Implement a conversational AI orchestration layer that sits between the dashboard assistant API route and the Model Router. The system classifies intent, composes prompts dynamically, compresses conversations, retrieves semantic memories, injects relevant tools, caches prompt segments, and logs orchestration metrics. All components are built in TypeScript and integrate with existing infrastructure (Model Router, Token Logger, Usage Limiter, AI Cache, Vercel AI SDK).

## Tasks

- [x] 1. Set up database schema and project structure
  - [x] 1.1 Create the `conversation_summaries` table schema in Drizzle
    - Add `conversationSummaries` table definition to `lib/db/schema/ai.ts`
    - Fields: id, conversationId (unique FK to aiConversations with cascade delete), summary, messageCount, createdAt, updatedAt
    - Add index on conversationId
    - _Requirements: 3.2, 3.8_

  - [x] 1.2 Add `category` column to `business_memories` table
    - Add category column with CHECK constraint (business_rules, pricing_knowledge, customer_context, workflow_preferences)
    - Default to 'business_rules'
    - Add composite index on (business_id, category)
    - _Requirements: 4.1, 4.3_

  - [x] 1.3 Create database migration for new schema changes
    - Generate and verify migration for conversation_summaries table and business_memories category column
    - _Requirements: 3.2, 4.1_

  - [x] 1.4 Create orchestrator directory structure and core types
    - Create `features/ai/orchestrator/` directory
    - Create `features/ai/orchestrator/types.ts` with all shared types: OrchestrateInput, OrchestrateResult, IntentCategory, IntentResult, ToolCategory, MemoryCategory, PromptModuleName, PromptBuildResult, RetrievedMemory, OrchestrationLogEntry, CompressionConfig
    - _Requirements: 1.2, 2.1, 3.1, 4.1, 5.1, 8.1_

  - [x] 1.5 Register `intent_classification` task type in task registry
    - Add "intent_classification" to `aiTaskTypes` in `features/ai/task-registry.ts`
    - Configure: qualityTier "cheap", maxOutputTokens 128, temperature 0.1, cacheTTL 60, priorityWeight 1, streamingPermitted false, maxContextCharacters 800
    - _Requirements: 1.1, 1.5, 8.3_

- [x] 2. Implement prompt modules and prompt segment cache
  - [x] 2.1 Create prompt module files
    - Create `features/ai/prompts/modules/` directory
    - Create individual module files: `base-identity.ts`, `safety-constraints.ts`, `formatting-rules.ts`, `tool-usage-instructions.ts`, `sales-support.ts`, `quoting-guidance.ts`, `follow-up-guidance.ts`, `analytics-guidance.ts`
    - Each exports a const with the prompt text content
    - _Requirements: 2.1, 2.7_

  - [x] 2.2 Implement the Prompt Segment Cache
    - Create `features/ai/orchestrator/prompt-cache.ts`
    - Implement Map-based LRU cache with max 50 entries
    - Cache key: moduleId + contentHash + JSON.stringify(sortedParams)
    - Implement `getCachedSegment` and `setCachedSegment` functions
    - Handle hash computation errors by bypassing cache
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 2.3 Implement the Prompt Builder
    - Create `features/ai/orchestrator/prompt-builder.ts`
    - Implement `buildPrompt` function that composes system prompt from modules
    - Always include base_identity (priority 1) and safety_constraints (priority 2)
    - Order remaining modules by fixed priority rank
    - Enforce 1600-token budget (chars / 4 approximation)
    - Omit lowest-priority modules first when over budget, log omissions
    - Return error if mandatory modules exceed budget
    - Ignore unrecognized module names with warning log
    - Integrate with prompt cache for rendered segments
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8_

  - [ ]* 2.4 Write unit tests for Prompt Builder and Prompt Cache
    - Test module priority ordering
    - Test token budget enforcement and module omission
    - Test mandatory module budget overflow error
    - Test unrecognized module name handling
    - Test LRU eviction at 50 entries
    - Test cache invalidation on hash mismatch
    - Test cache bypass on error
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.8, 6.5, 6.6, 6.7_

- [x] 3. Implement Intent Classifier
  - [x] 3.1 Implement the Intent Classifier
    - Create `features/ai/orchestrator/intent-classifier.ts`
    - Implement `classifyIntent(message, conversationId)` function
    - Use `generateWithFallback` with qualityTier "cheap", max 128 tokens, temperature 0.1
    - System prompt ≤ 400 tokens with JSON output format
    - Truncate message to 600 characters before classification
    - Implement 60-second in-memory cache keyed by message + conversationId
    - On failure/timeout (2s), return default IntentResult: all tool categories, no memory, base modules only
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ]* 3.2 Write unit tests for Intent Classifier
    - Test message truncation at 600 characters
    - Test cache hit within 60 seconds
    - Test fallback on timeout/error
    - Test structured output parsing
    - _Requirements: 1.3, 1.4, 1.6, 1.7_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Semantic Memory Retriever
  - [x] 5.1 Implement the Memory Retriever
    - Create `features/ai/orchestrator/memory-retriever.ts`
    - Implement `retrieveMemories(message, businessId, categories)` function
    - Generate embedding for user message using existing `generateEmbedding`
    - Query `business_memories` filtered by businessId and category
    - Use cosine similarity ranking, return top 5 entries with similarity > 0.4
    - Apply 800-token budget (entries in descending similarity order)
    - Return empty array if no categories or no entries found
    - Target < 500ms including embedding generation
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.8, 4.9_

  - [ ]* 5.2 Write unit tests for Memory Retriever
    - Test similarity threshold filtering (< 0.4 excluded)
    - Test 800-token budget enforcement
    - Test empty categories returns empty array
    - Test ordering by descending similarity
    - _Requirements: 4.2, 4.5, 4.8, 4.9_

- [x] 6. Implement Tool Selector
  - [x] 6.1 Create tool metadata configuration
    - Create `features/ai/tools/tool-metadata.ts`
    - Define ToolMetadata for each tool from `createDashboardTools` and `createActionTools`
    - Map each tool name to category and intent triggers
    - _Requirements: 5.1, 5.5_

  - [x] 6.2 Implement the Tool Selector
    - Create `features/ai/orchestrator/tool-selector.ts`
    - Implement `selectTools(intentResult, ctx)` function
    - Call `createDashboardTools(ctx)` and `createActionTools(ctx)`, filter by matching metadata
    - Return `undefined` if no tool categories specified
    - Log warning for unmatched tool categories
    - Target < 50ms
    - _Requirements: 5.2, 5.3, 5.4, 5.7_

  - [ ]* 6.3 Write unit tests for Tool Selector
    - Test filtering by intent category
    - Test undefined return when no tool categories
    - Test unmatched category warning
    - _Requirements: 5.2, 5.3, 5.7_

- [x] 7. Implement Conversation Compressor
  - [x] 7.1 Implement the Conversation Compressor
    - Create `features/ai/orchestrator/conversation-compressor.ts`
    - Implement `compressConversation(conversationId, messages, config)` function
    - Trigger when message count > threshold (default 10)
    - Summarize older messages (before recent window of 6) into ≤ 200 words
    - Use cheap-tier model, max 256 tokens, temperature 0.3
    - Store/replace summary in `conversation_summaries` table
    - Fall back to `summarizeDroppedMessages` from `lib/ai/history-summarizer.ts` on failure
    - Implement `getConversationContext(conversationId, recentMessages)` function
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.9_

  - [ ]* 7.2 Write unit tests for Conversation Compressor
    - Test threshold triggering
    - Test recent window preservation
    - Test summary storage and replacement
    - Test fallback to heuristic summarizer
    - Test getConversationContext with and without existing summary
    - _Requirements: 3.1, 3.3, 3.4, 3.6, 3.9_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement Orchestration Logger
  - [x] 9.1 Implement the Orchestration Logger
    - Create `features/ai/orchestrator/orchestration-logger.ts`
    - Implement `logOrchestration(entry)` function
    - Write structured JSON via `console.info` (matching Token Logger pattern)
    - Call `logAiInvocation` for intent classification tokens with taskType "intent_classification"
    - Call `recordUsage` with weight 0.5 for classification usage
    - Record failed phase durations as -1
    - Implement `createTimer()` utility for wall-clock ms per phase
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 9.2 Write unit tests for Orchestration Logger
    - Test structured log entry format
    - Test timer utility accuracy
    - Test partial log entry on phase failure
    - Test integration calls to logAiInvocation and recordUsage
    - _Requirements: 8.1, 8.5, 8.6_

- [x] 10. Implement the Orchestrator and wire everything together
  - [x] 10.1 Implement the main Orchestrator function
    - Create `features/ai/orchestrator/index.ts`
    - Implement `orchestrate(input)` function that coordinates all modules
    - Pre-stream phase: classify intent, then parallel (memory retrieval + prompt build + tool selection)
    - Return composed systemPrompt, tools, messages, and onStreamComplete callback
    - onStreamComplete triggers async compression and logging
    - Handle errors per-phase with structured error result
    - Enforce 2000ms pre-stream budget
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 10.2 Integrate Orchestrator into the API route handler
    - Modify `features/ai/api-route-handlers.ts` to call `orchestrate()` instead of inline logic
    - Pass OrchestrateResult to `streamWithFallback`
    - Wire onStreamComplete callback to post-stream async operations
    - Preserve existing auth, rate limiting, and error handling
    - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ]* 10.3 Write integration tests for the Orchestrator
    - Test full orchestration flow with mocked model calls
    - Test fallback behavior when intent classification fails
    - Test pre-stream timeout enforcement
    - Test post-stream operations fire asynchronously
    - Test error result when a phase fails
    - _Requirements: 1.4, 7.2, 7.4, 7.5, 7.7_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end orchestration flows
- The design has no Correctness Properties section, so property-based tests are not included
- All code uses TypeScript as specified in the design document

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.4", "1.5"] },
    { "id": 1, "tasks": ["1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1", "6.1"] },
    { "id": 3, "tasks": ["2.3", "3.2", "6.2"] },
    { "id": 4, "tasks": ["2.4", "5.1", "6.3"] },
    { "id": 5, "tasks": ["5.2", "7.1", "9.1"] },
    { "id": 6, "tasks": ["7.2", "9.2"] },
    { "id": 7, "tasks": ["10.1"] },
    { "id": 8, "tasks": ["10.2"] },
    { "id": 9, "tasks": ["10.3"] }
  ]
}
```
