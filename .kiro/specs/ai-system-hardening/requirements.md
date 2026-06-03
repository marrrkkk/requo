# Requirements Document

## Introduction

This document captures the requirements for hardening, optimizing, and fixing the Requo AI assistant system based on a production audit. The system is a multi-provider AI chat assistant that handles service business inquiries and quotes across dashboard, inquiry, and quote surfaces. The audit identified critical improvements across caching, security, hallucination reduction, bug fixes, token optimization, RAG retrieval, tool calling, context management, cost optimization, scalability, response quality, prompt engineering, and memory systems.

## Glossary

- **Cache_Layer**: The distributed caching infrastructure (Upstash Redis with in-memory fallback) used to persist state across serverless cold starts
- **Input_Sanitizer**: The module (`lib/ai/input-sanitizer.ts`) responsible for detecting and neutralizing prompt injection attempts before input reaches AI providers
- **RAG_Retriever**: The semantic memory retrieval system (`features/memory/rag-retriever.ts`) that finds relevant business memories using embedding similarity
- **Orchestrator**: The pre-stream pipeline coordinator (`features/ai/orchestrator/index.ts`) that classifies intent, retrieves memory, composes prompts, and selects tools
- **Intent_Classifier**: The module (`features/ai/orchestrator/intent-classifier.ts`) that determines user intent and required prompt modules via a cheap-tier model call
- **Capacity_Selector**: The module (`lib/ai/capacity-selector.ts`) that tracks in-memory request counts per model and selects available models based on remaining capacity
- **Surface_Service**: The module (`features/ai/surface-service.ts`) that builds contextual data for the AI based on the active surface (dashboard, inquiry, quote)
- **Token_Logger**: The module (`lib/ai/token-logger.ts`) that records AI invocations for cost monitoring with per-model cost rates
- **Memory_Retriever**: The orchestrator-level memory retrieval module (`features/ai/orchestrator/memory-retriever.ts`) that fetches category-filtered memories with token budgets
- **Prompt_Builder**: The module (`features/ai/orchestrator/prompt-builder.ts`) that composes system prompts from modular segments based on intent classification
- **Usage_Limiter**: The module (`lib/ai/usage-limiter.ts`) that enforces monthly weighted usage limits and per-request cooldowns
- **Canary_Token**: A unique identifiable string embedded in system prompts that, if detected in AI output, indicates the system prompt has been leaked
- **NFKC_Normalization**: Unicode Normalization Form KC that decomposes characters and then recomposes them using compatibility mappings, converting homoglyphs to their canonical ASCII equivalents
- **Similarity_Threshold**: The minimum cosine similarity score required for a retrieved memory to be included in the AI context
- **Cold_Start**: The initialization of a new serverless function instance on Vercel where all in-memory state (Maps, caches) is lost

## Requirements

### Requirement 1: Redis-Backed Distributed Cache

**User Story:** As a system operator, I want AI caches to persist across serverless cold starts, so that cache hit rates are meaningful in production and redundant AI calls are avoided.

#### Acceptance Criteria

1. WHEN the Cache_Layer initializes, THE Cache_Layer SHALL attempt to connect to Upstash Redis using environment variables `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` with a connection timeout of no more than 5 seconds
2. IF Redis connection fails, environment variables are missing, or the connection timeout is exceeded, THEN THE Cache_Layer SHALL fall back to in-memory Map storage without throwing errors and SHALL log a warning indicating the fallback reason
3. WHEN a cache read is performed, THE Cache_Layer SHALL first attempt Redis retrieval with a per-operation timeout of 2 seconds and fall back to in-memory on Redis failure or timeout
4. WHEN a cache write is performed, THE Cache_Layer SHALL write to Redis with the specified TTL and also update the in-memory Map, so that subsequent reads within the same serverless instance do not require a Redis round-trip
5. THE Cache_Layer SHALL wrap all Redis operations in try/catch blocks and log warnings via console.warn on failure without propagating exceptions to callers
6. WHEN Redis is available, THE Cache_Layer SHALL use it for ai-cache.ts output caching, capacity-selector.ts RPM/RPD tracking, usage-limiter.ts cooldown maps, and intent-classifier.ts classification cache
7. THE Cache_Layer SHALL respect the existing TTL semantics defined per cache consumer (60s for intent classification, caller-specified TTLs for AI output cache, 3s for cooldowns, 60s for RPM windows, and 86400s for RPD windows)
8. WHEN a cache read retrieves a value from Redis, THE Cache_Layer SHALL return the value without checking or updating the in-memory Map for that key, ensuring Redis is the authoritative source when available

### Requirement 2: Unicode-Aware Input Sanitization

**User Story:** As a security engineer, I want the input sanitizer to detect injection attempts using Unicode homoglyphs and zero-width characters, so that attackers cannot bypass pattern matching with non-ASCII substitutions.

#### Acceptance Criteria

1. WHEN user input is received, THE Input_Sanitizer SHALL first strip zero-width characters, then apply NFKC normalization, then execute pattern matching against the normalized result
2. WHEN user input is received, THE Input_Sanitizer SHALL strip zero-width characters (U+200B, U+200C, U+200D, U+FEFF, U+00AD) before any further processing
3. WHEN user input contains instruction-override patterns written in French (e.g., "ignorez les instructions précédentes"), Spanish (e.g., "ignora las instrucciones anteriores"), or German (e.g., "ignoriere vorherige Anweisungen"), THE Input_Sanitizer SHALL reject the input with status "rejected" using the same behavior as English injection pattern matches
4. WHEN Cyrillic homoglyphs are used to spell ASCII injection keywords (e.g., "іgnоrе" using Cyrillic і, о, е), THE Input_Sanitizer SHALL reject or sanitize the input identically to the matching ASCII pattern after NFKC normalization maps the homoglyphs to their ASCII equivalents
5. THE Input_Sanitizer SHALL maintain processing time under 5ms per input of up to 10,000 characters after adding normalization and multilingual pattern matching
6. IF NFKC normalization or zero-width stripping changes the input content, THEN THE Input_Sanitizer SHALL perform pattern matching only against the normalized form and not the original input

### Requirement 3: Memory Content Sanitization

**User Story:** As a security engineer, I want memory content to be sanitized before persistence, so that attackers cannot poison the RAG retrieval system with injected instructions stored as business memories.

#### Acceptance Criteria

1. WHEN a business memory is saved or updated, THE Input_Sanitizer SHALL scan both the title and content fields for injection patterns before persistence
2. IF high-confidence injection patterns (rejection-tier) are detected in memory title or content, THEN THE Input_Sanitizer SHALL reject the save operation and return an error indicating the content contains disallowed patterns
3. IF low-confidence injection patterns (sanitization-tier) are detected in memory content, THEN THE Input_Sanitizer SHALL strip the matched patterns from the content, persist the sanitized version, and log a security event with event type "memory_sanitized"
4. THE Input_Sanitizer SHALL apply the same NFKC normalization and zero-width stripping to memory content as it does to chat input

### Requirement 4: Per-Conversation Injection Lockout

**User Story:** As a security engineer, I want repeated injection attempts within a conversation to trigger a lockout, so that persistent attackers are blocked from continued probing.

#### Acceptance Criteria

1. WHEN an injection attempt is detected (status "rejected" or "sanitized"), THE Input_Sanitizer SHALL increment a per-conversation injection counter
2. WHEN the per-conversation injection counter reaches 3, THE Input_Sanitizer SHALL reject all subsequent messages in that conversation with a lockout response
3. THE Input_Sanitizer SHALL store the injection counter in the Cache_Layer (Redis with in-memory fallback) with a 1-hour TTL
4. IF a conversation is locked out, THEN THE Input_Sanitizer SHALL log a security event with event type "conversation_locked"

### Requirement 5: Canary Token Leak Detection

**User Story:** As a security engineer, I want canary tokens embedded in system prompts to be detected in AI output, so that system prompt leakage is identified even when existing output filter patterns miss it.

#### Acceptance Criteria

1. THE Prompt_Builder SHALL embed a unique canary token string in every composed system prompt
2. WHEN AI output contains the canary token string, THE output filter SHALL redact the output and log a security event with event type "canary_leak_detected"
3. THE canary token SHALL be a deterministic string derived from the business ID and a server-side secret, so it is unique per business but reproducible for detection

### Requirement 6: RAG Similarity Threshold Increase

**User Story:** As a product engineer, I want the RAG similarity threshold raised to filter out barely-related memories, so that only genuinely relevant context is injected into AI prompts.

#### Acceptance Criteria

1. THE RAG_Retriever SHALL use a minimum similarity threshold of 0.45 (increased from 0.3) when filtering retrieved memories
2. WHEN memories pass the similarity threshold, THE RAG_Retriever SHALL label each with a confidence tier: HIGH (similarity >= 0.7), MEDIUM (similarity >= 0.55), or LOW (similarity >= 0.45)
3. WHEN no memories pass the 0.45 threshold, THE RAG_Retriever SHALL return the single highest-scoring memory only if its similarity exceeds 0.3 (emergency fallback)
4. IF the emergency fallback is triggered and the highest-scoring memory has a similarity below 0.3, THEN THE RAG_Retriever SHALL return an empty result set with no memories injected
5. THE Memory_Retriever in the orchestrator SHALL include the confidence tier as a bracketed prefix (e.g., "[HIGH]", "[MEDIUM]", "[LOW]") before each memory entry in the formatted context passed to the Prompt_Builder

### Requirement 7: Pricing Hallucination Guardrail

**User Story:** As a business owner, I want the quote drafting AI to never hallucinate prices when no pricing data is available, so that customers are not shown fabricated amounts.

#### Acceptance Criteria

1. WHEN the quote_draft task is invoked and the pricingBlocks context field is null, an empty string, or contains only the sentinel value "- No saved pricing entries.", THE Prompt_Builder SHALL inject a guardrail instruction stating that no pricing data is available, that all line item unitPriceInCents must be set to 0, and that pricing requires manual entry
2. WHEN pricingBlocks is empty as defined in criterion 1, THE Prompt_Builder SHALL include an instruction that the model must not generate unitPriceInCents values greater than 0
3. WHEN pricingBlocks is empty as defined in criterion 1, THE Prompt_Builder SHALL include an instruction that the model must include a clarification note indicating that pricing is pending owner review rather than generating estimated amounts

### Requirement 8: Backfill Embeddings Bug Fix

**User Story:** As a developer, I want the backfillMemoryEmbeddings function to only process memories that lack embeddings, so that existing embeddings are not redundantly regenerated.

#### Acceptance Criteria

1. WHEN backfillMemoryEmbeddings is called, THE RAG_Retriever SHALL query only memories where the embedding column is NULL for the specified businessId
2. IF a memory already has a non-null embedding array stored, THEN THE RAG_Retriever SHALL skip that memory without regenerating its embedding
3. WHEN backfillMemoryEmbeddings completes, THE RAG_Retriever SHALL return a result indicating the count of successfully updated memories and the count of failed embedding generations

### Requirement 9: Dashboard Prompt Deduplication

**User Story:** As a cost-conscious operator, I want redundant anti-hallucination rules removed from dashboard surface instructions, so that token waste is eliminated.

#### Acceptance Criteria

1. THE Surface_Service SHALL contain anti-hallucination rules in a single consolidated block of no more than 5 lines for the dashboard surface
2. THE Surface_Service SHALL not repeat the same semantic instruction (e.g., "never fabricate", "never invent") more than once across the entire dashboard surface prompt

### Requirement 10: Tool Description Compression

**User Story:** As a cost-conscious operator, I want tool descriptions compressed to reduce per-request token overhead, so that the 30+ tools do not consume excessive prompt space.

#### Acceptance Criteria

1. THE dashboard tools SHALL have descriptions of no more than 80 characters each
2. THE dashboard tools SHALL include a brief expected return format hint (e.g., "Returns: {count, breakdown}") appended to each description
3. WHEN all tool descriptions are combined, THE total character count SHALL not exceed 4000 characters (reduced from current ~6000+)

### Requirement 11: Query-Aware Context Pruning

**User Story:** As a cost-conscious operator, I want simple status queries to receive minimal context, so that tokens are not wasted loading full business data for trivial lookups.

#### Acceptance Criteria

1. WHEN message complexity is classified as "simple", THE Surface_Service SHALL load only business identity and knowledge context (omitting full inquiry/quote details, activity timelines, and follow-up lists)
2. WHEN message complexity is classified as "complex", THE Surface_Service SHALL load the full context as it does today
3. THE Surface_Service SHALL use the existing classifyMessageComplexity function to determine the pruning level

### Requirement 12: Duplicate Memory Retrieval Elimination

**User Story:** As a cost-conscious operator, I want memory retrieval to happen only once per request on the dashboard path, so that duplicate embedding generation calls are eliminated.

#### Acceptance Criteria

1. WHEN the dashboard surface is active, THE Orchestrator SHALL perform memory retrieval and pass the results to the Surface_Service
2. THE Surface_Service SHALL accept pre-retrieved memory results as an optional parameter and skip its own retrieval when provided
3. THE system SHALL not call retrieveRelevantMemories more than once per chat request for the same business and query

### Requirement 13: Query Embedding Cache

**User Story:** As a cost-conscious operator, I want query embeddings cached for repeated or similar queries, so that redundant embedding API calls are avoided.

#### Acceptance Criteria

1. WHEN a query embedding is generated, THE embedding module SHALL cache the result keyed by a hash of the input text
2. WHEN the same text is requested for embedding within 5 minutes, THE embedding module SHALL return the cached vector instead of calling the embedding provider
3. THE embedding cache SHALL use the Cache_Layer (Redis with in-memory fallback) with a 300-second TTL

### Requirement 14: Keyword Boost for RAG Retrieval

**User Story:** As a product engineer, I want keyword matches to boost semantic similarity scores, so that memories containing exact query terms rank higher in retrieval.

#### Acceptance Criteria

1. WHEN ranking memories by similarity, THE RAG_Retriever SHALL check for keyword overlap between the query and memory content
2. WHEN a memory contains one or more exact keyword matches from the query, THE RAG_Retriever SHALL boost its similarity score by 0.1 (capped at 1.0)
3. THE keyword matching SHALL be case-insensitive and ignore common stop words

### Requirement 15: Unified RAG Entry Point

**User Story:** As a developer, I want a single RAG retrieval entry point, so that the two separate retrievers (orchestrator memory-retriever and features/memory rag-retriever) are consolidated.

#### Acceptance Criteria

1. THE system SHALL expose a single unified retrieval function that supports both category-filtered retrieval (for the orchestrator) and unfiltered retrieval (for surface services)
2. WHEN category filtering is requested, THE unified retriever SHALL filter memories by the specified categories before ranking
3. THE unified retriever SHALL apply the 0.45 similarity threshold, confidence labeling, keyword boost, and token budget consistently regardless of caller

### Requirement 16: Tool Output Truncation

**User Story:** As a cost-conscious operator, I want tool outputs truncated before being fed back to the model, so that arbitrarily large tool results do not consume excessive context tokens.

#### Acceptance Criteria

1. WHEN a tool execution returns output longer than 4000 characters, THE tool execution layer SHALL truncate the output to the last complete line boundary at or before 4000 characters and append a truncation note: "[truncated — showing first {truncatedLength} chars of {totalLength}]"
2. IF the tool output starts with "{" or "[" (indicating JSON), THEN THE tool execution layer SHALL truncate at the last complete JSON key-value pair or array element boundary at or before 4000 characters, ensuring the result remains valid parseable JSON by closing any open braces or brackets
3. WHEN truncation occurs, THE tool execution layer SHALL count the 4000-character limit against the tool output content only, excluding the appended truncation note from the limit
4. IF the tool execution result has an error flag set to true, THEN THE tool execution layer SHALL skip truncation regardless of output length

### Requirement 17: Token-Based Context Budgets

**User Story:** As a product engineer, I want context budgets measured in tokens rather than characters, so that budget enforcement is accurate relative to actual model consumption.

#### Acceptance Criteria

1. THE Prompt_Builder SHALL use a token estimation function (characters / 4) consistently for all budget calculations
2. THE Context_Builder SHALL express maxContextCharacters in token-equivalent units and use the same estimation function
3. WHEN the Prompt_Builder enforces its 1600-token budget, THE calculation SHALL account for all injected content (modules, memory context, conversation summary) using the token estimation

### Requirement 18: AI-Based Conversation Summarization

**User Story:** As a product engineer, I want long conversations summarized by an AI model, so that temporal ordering and nuance are preserved better than the current heuristic approach.

#### Acceptance Criteria

1. WHEN a conversation exceeds 12 messages, THE history summarizer SHALL use a cheap-tier AI model call to generate a summary instead of the heuristic extraction
2. WHEN the AI summarization call fails or times out (2s), THE history summarizer SHALL fall back to the existing heuristic summarization
3. THE AI-generated summary SHALL preserve temporal ordering of key events and decisions mentioned in the conversation
4. THE AI summarization SHALL use no more than 128 output tokens

### Requirement 19: Heuristic Intent Pre-Classification

**User Story:** As a cost-conscious operator, I want obvious intents classified without a model call, so that the intent classifier does not waste API calls on trivially identifiable queries.

#### Acceptance Criteria

1. WHEN a user message matches a heuristic pattern for obvious intents (e.g., "how many inquiries", "list quotes", "show me Q-"), THE Intent_Classifier SHALL return the classification without making a model call
2. THE heuristic pre-classifier SHALL cover at minimum: data_query patterns (count/list/show/get + entity keywords), and simple greetings (general_question)
3. WHEN the heuristic matches, THE Intent_Classifier SHALL still cache the result with the same 60-second TTL

### Requirement 20: Business-Scoped Cache Keys

**User Story:** As a cost-conscious operator, I want non-personalized AI tasks to use business-scoped cache keys, so that identical outputs are shared across users of the same business.

#### Acceptance Criteria

1. WHEN the task type is inquiry_summary, form_suggestion, or business_memory_summary, THE Cache_Layer SHALL use a cache key that excludes the userId component
2. WHEN the task type is personalized (quote_draft, assistant_message, etc.), THE Cache_Layer SHALL continue to include userId in the cache key
3. THE Cache_Layer SHALL maintain backward compatibility by not invalidating existing cached entries

### Requirement 21: Batched Usage Limit Query

**User Story:** As a performance engineer, I want the usage limit check to execute a single database query instead of two sequential queries, so that latency on every AI request is reduced.

#### Acceptance Criteria

1. WHEN checking usage limits, THE Usage_Limiter SHALL retrieve both user-level and business-level monthly usage in a single database query
2. THE batched query SHALL return the same results as the current two separate queries (user total and business total for the current month)

### Requirement 22: Token Log Retention Policy

**User Story:** As a system operator, I want token logs older than 90 days automatically deleted, so that the ai_token_logs table does not grow unbounded.

#### Acceptance Criteria

1. THE system SHALL implement a scheduled task (via Inngest or cron) that deletes ai_token_logs entries older than 90 days
2. THE retention task SHALL run daily and delete in batches of no more than 1000 rows per execution to avoid long-running transactions
3. THE retention task SHALL log the number of deleted rows on each execution

### Requirement 23: Request Deduplication

**User Story:** As a reliability engineer, I want concurrent duplicate messages to the same conversation deduplicated, so that race conditions from double-clicks or network retries do not produce duplicate AI responses.

#### Acceptance Criteria

1. WHEN a chat request is received, THE system SHALL generate a deduplication key from the conversation ID and message content hash
2. WHEN a deduplication key already exists in the Cache_Layer (within a 10-second window), THE system SHALL return a 409 Conflict response
3. THE deduplication key SHALL expire after 10 seconds to allow legitimate re-sends

### Requirement 24: Intent-Aware Token Allocation

**User Story:** As a product engineer, I want maxOutputTokens adapted to the classified intent, so that simple lookups use fewer tokens and complex drafting tasks get adequate space.

#### Acceptance Criteria

1. WHEN the classified intent is data_query or general_question, THE system SHALL set maxOutputTokens to 800
2. WHEN the classified intent is quote_action or follow_up_action, THE system SHALL set maxOutputTokens to 2200
3. WHEN the classified intent is analytics or workflow_guidance, THE system SHALL set maxOutputTokens to 1400

### Requirement 25: Quality Gate Logging

**User Story:** As a product engineer, I want "I don't know" responses logged when tools were available, so that response quality gaps are identified and addressed.

#### Acceptance Criteria

1. WHEN the AI response contains uncertainty phrases ("I don't know", "I'm not sure", "I cannot find") AND tools were injected in the request, THE system SHALL log a quality gate event
2. THE quality gate log SHALL include: conversation ID, user message, classified intent, tools available, and the AI response snippet
3. THE quality gate check SHALL run in the onFinish callback without blocking the response stream

### Requirement 26: Template-Based Business Identity

**User Story:** As a product engineer, I want the orchestrator base identity prompt to include the business name, so that the AI identifies itself contextually rather than generically.

#### Acceptance Criteria

1. THE Prompt_Builder SHALL inject the business name into the base_identity module template before composition
2. THE base_identity prompt SHALL reference the business by name (e.g., "You are the AI assistant for {businessName}")
3. THE Prompt_Builder SHALL accept the business name as a parameter from the Orchestrator

### Requirement 27: Public Inquiry Prompt Compression

**User Story:** As a cost-conscious operator, I want the public inquiry chat prompt compressed, so that the ~900 token prompt is reduced without losing behavioral fidelity.

#### Acceptance Criteria

1. THE public inquiry chat prompt SHALL not exceed 600 tokens (approximately 2400 characters) after compression
2. THE compressed prompt SHALL preserve all critical behavioral rules: conversation flow steps, field collection requirements, submit_inquiry tool usage, and identity constraints
3. THE compressed prompt SHALL remove redundant phrasing and consolidate repeated rules

### Requirement 28: Memory Recency Boost

**User Story:** As a product engineer, I want newer memories to rank higher in retrieval, so that recently updated business knowledge is prioritized over stale entries.

#### Acceptance Criteria

1. WHEN ranking memories by similarity, THE RAG_Retriever SHALL apply a recency decay factor based on the memory's updatedAt timestamp
2. THE recency decay SHALL reduce the effective similarity score by up to 30% for memories not updated in the past year (linear decay from 0% at 0 days to 30% at 365 days)
3. THE recency boost SHALL be applied after the keyword boost and before the similarity threshold filter

### Requirement 29: Remove Regex Fallback Extractor

**User Story:** As a developer, I want the regex fallback extractor removed from the public inquiry chat service, so that only the reliable tool-based extraction path is used.

#### Acceptance Criteria

1. WHEN tool-based extraction via submit_inquiry does not fire, THE public inquiry chat service SHALL not attempt regex-based field extraction from the response text
2. THE public inquiry chat service SHALL return null for extracted fields when the submit_inquiry tool was not called
3. THE extractFieldsFromMessage function call SHALL be removed from the public inquiry chat service stream logic

