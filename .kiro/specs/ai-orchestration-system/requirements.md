# Requirements Document

## Introduction

Conversational AI Orchestration Layer for Requo's dashboard assistant. This system sits on top of the existing per-task AI cost optimization infrastructure (AI_Task_Registry, AI_Context_Builder, Model_Router, AI_Cache, Usage_Limiter, Token_Logger) and adds intelligent conversational capabilities: intent classification, dynamic prompt composition, conversation compression, semantic memory retrieval, dynamic tool injection, prompt segment caching, and observability. The goal is a token-efficient, streaming-compatible orchestration layer that makes the assistant contextually aware without sending excessive data to the model on every turn.

## Glossary

- **Orchestrator**: The top-level server-side module in `features/ai/` that coordinates the full conversational AI request lifecycle — classifying intent, assembling prompts, retrieving memory, selecting tools, and invoking the Model_Router.
- **Intent_Classifier**: A lightweight preprocessing step that uses a cheap-tier model to classify user intent and determine which prompt modules, tools, and memory categories are relevant for the request.
- **Prompt_Module**: A discrete, reusable segment of system prompt content (e.g., base identity, coding instructions, sales guidance, formatting rules, tool usage instructions, safety constraints) that can be composed dynamically based on classified intent.
- **Prompt_Builder**: A utility that composes a final system prompt by selecting and concatenating relevant Prompt_Modules in a defined priority order, respecting a total token budget.
- **Conversation_Compressor**: A module that maintains rolling conversation context by keeping recent messages in full and replacing older messages with compressed summaries stored in the database.
- **Semantic_Memory**: A pgvector-backed store in Supabase that holds embedded business knowledge, user preferences, project context, and extracted long-term memories, retrievable via similarity search.
- **Tool_Registry**: A registry-based system that defines all available assistant tools with metadata (name, description, category, intent triggers) so that only tools relevant to the current intent are injected into the AI call.
- **Prompt_Segment_Cache**: An in-memory or short-TTL cache for stable, reusable prompt segments (e.g., base identity, safety constraints) to avoid rebuilding identical text on every request.
- **Orchestration_Logger**: An observability module that tracks per-request metrics: assembled prompt size, memory retrieval count, tools injected, intent classification result, and end-to-end orchestration latency.
- **Intent_Result**: The structured output of intent classification containing: intent category, required tool categories, required memory categories, and required prompt module identifiers.
- **Conversation_Summary**: A compressed text representation of older conversation turns, stored in the database and injected into context as a single message.
- **Memory_Entry**: A single record in the Semantic_Memory store with text content, embedding vector, category, businessId, and metadata.

## Requirements

### Requirement 1: Intent Classification

**User Story:** As a business owner using the dashboard assistant, I want my request to be classified before the main model responds, so that only relevant tools, memories, and prompt instructions are included — reducing token usage and improving response quality.

#### Acceptance Criteria

1. WHEN a user message is received by the Orchestrator, THE Intent_Classifier SHALL classify the message using the "cheap" quality tier from the existing Model_Router before the main model invocation begins.
2. THE Intent_Classifier SHALL return an Intent_Result containing: an intent category (one of: data_query, quote_action, follow_up_action, analytics, general_question, memory_recall, workflow_guidance), a list of required tool categories (subset of: query_tools, action_tools), a list of required memory categories (subset of: business_rules, pricing_knowledge, customer_context, workflow_preferences), and a list of required Prompt_Module identifiers (each identifier being a non-empty string of at most 64 characters, with at most 10 identifiers per result).
3. THE Intent_Classifier SHALL complete classification within 2 seconds measured from the moment the classification request is dispatched to the moment the Intent_Result is available to the Orchestrator.
4. IF the Intent_Classifier fails due to a provider error or a timeout exceeding 2 seconds, THEN THE Orchestrator SHALL fall back to a default Intent_Result that includes all tool categories, no memory retrieval, and the base prompt modules only, and SHALL proceed with the main model invocation without surfacing the failure to the user.
5. THE Intent_Classifier SHALL use a system prompt of no more than 400 tokens and a structured JSON output format to minimize classification cost, with the total input (system prompt plus user message context) not exceeding 800 tokens.
6. WHEN the same user message has been classified within the last 60 seconds for the same conversation (matched by exact message text and conversation identifier), THE Intent_Classifier SHALL return the cached classification result without invoking the model.
7. IF the user message exceeds 600 characters, THEN THE Intent_Classifier SHALL truncate the message to the first 600 characters before classification to stay within the token budget.

### Requirement 2: Dynamic Prompt Composition

**User Story:** As a developer, I want system prompts composed from modular segments based on classified intent, so that the assistant receives only relevant instructions and stays within token budgets.

#### Acceptance Criteria

1. THE Prompt_Builder SHALL support the following Prompt_Modules: base_identity, formatting_rules, tool_usage_instructions, sales_support, quoting_guidance, follow_up_guidance, safety_constraints, and analytics_guidance.
2. WHEN composing a system prompt, THE Prompt_Builder SHALL include only the Prompt_Modules specified in the Intent_Result plus the base_identity and safety_constraints modules which are always included.
3. THE Prompt_Builder SHALL concatenate selected Prompt_Modules in a fixed priority order: base_identity first, safety_constraints second, then remaining modules ordered by their defined priority rank.
4. THE Prompt_Builder SHALL enforce a total system prompt budget of 1600 tokens measured by the tokenizer used for the target model, and WHEN selected modules would exceed the budget, THE Prompt_Builder SHALL omit optional modules starting from the lowest-priority module and continuing upward until the total token count is at or below 1600.
5. WHEN a Prompt_Module is omitted due to budget constraints, THE Prompt_Builder SHALL log an entry containing the module name and the reason for omission.
6. IF the base_identity and safety_constraints modules alone exceed the 1600-token budget, THEN THE Prompt_Builder SHALL return an error indicating that mandatory modules exceed the token budget.
7. THE Prompt_Builder SHALL define each Prompt_Module as a standalone TypeScript constant in a single dedicated file within `features/ai/prompts/modules/`, ensuring no prompt text is duplicated across files.
8. WHEN an Intent_Result references a Prompt_Module name that is not in the supported set defined in criterion 1, THE Prompt_Builder SHALL ignore the unrecognized module name and log a warning indicating the invalid module reference.

### Requirement 3: Conversation Compression

**User Story:** As a business owner, I want long conversations to remain contextually coherent without sending the full message history to the model, so that token costs stay predictable and responses remain fast.

#### Acceptance Criteria

1. WHEN a conversation exceeds a configurable message threshold (default: 10 messages, minimum: 6, maximum: 50), THE Conversation_Compressor SHALL summarize all messages older than the recent window (default: last 6 messages, minimum: 2, maximum equal to message threshold minus 1) into a single Conversation_Summary of no more than 200 words.
2. THE Conversation_Compressor SHALL store the Conversation_Summary in the database linked to the conversationId, replacing any previous summary for that conversation, within 10 seconds of summary generation completing.
3. WHEN assembling conversation context for a model call, THE Orchestrator SHALL include: the Conversation_Summary (if one exists) as a system message, followed by the recent messages window in chronological order.
4. IF no Conversation_Summary exists for the conversation, THEN THE Orchestrator SHALL include only the recent messages window without a summary system message.
5. THE Conversation_Compressor SHALL generate summaries using the cheap quality tier from the Model_Router, with a max output of 256 tokens and a temperature no higher than 0.3.
6. IF the Conversation_Compressor fails to generate a summary (model timeout after 15 seconds, provider error, or empty response), THEN THE Orchestrator SHALL use the existing heuristic history summarizer from `lib/ai/history-summarizer.ts` as a fallback, and the conversation SHALL continue without blocking the user response.
7. THE Conversation_Compressor SHALL trigger summarization asynchronously after the response stream has started, so that the user does not experience additional latency from the summarization step.
8. WHEN a conversation is deleted, THE Conversation_Compressor SHALL delete the associated Conversation_Summary within the same database transaction.
9. WHEN the message threshold or recent window size is updated for a conversation, THE Conversation_Compressor SHALL apply the new configuration on the next message that exceeds the updated threshold, without retroactively re-summarizing existing messages.

### Requirement 4: Semantic Memory Retrieval

**User Story:** As a business owner, I want the assistant to recall relevant business knowledge and past context without me repeating it, so that responses are personalized and accurate.

#### Acceptance Criteria

1. THE Semantic_Memory SHALL store Memory_Entries in Supabase with the following fields: id, businessId, category (one of: business_rules, pricing_knowledge, customer_context, workflow_preferences), text content (maximum 2000 characters), embedding vector (768 dimensions using the existing Gemini embedding model), createdAt, and updatedAt.
2. WHEN the Intent_Result specifies required memory categories, THE Orchestrator SHALL retrieve the top 5 most similar Memory_Entries from those categories using cosine similarity against the user message embedding, returning results within 500 milliseconds.
3. THE Semantic_Memory SHALL use Supabase pgvector for similarity search with an index on the embedding column, scoped to the businessId and filtered by the requested categories.
4. THE Orchestrator SHALL inject retrieved Memory_Entries into the system prompt as a dedicated context section, with a combined budget of no more than 800 tokens, ordered by descending similarity score.
5. IF no Memory_Entries score above a similarity threshold of 0.4, THEN THE Orchestrator SHALL inject no memory context and proceed without memory augmentation.
6. WHEN a business knowledge entry is created or updated in the existing `businessMemories` table, THE Semantic_Memory SHALL generate and store an embedding for that entry within 5 seconds of the triggering event.
7. IF the embedding generation fails, THEN THE Semantic_Memory SHALL store the Memory_Entry without an embedding, exclude it from similarity search results, and log the failure for later retry.
8. IF the retrieved Memory_Entries exceed the 800-token combined budget, THEN THE Orchestrator SHALL include entries in descending similarity score order until the next entry would exceed the budget, and discard the remainder.
9. IF the Intent_Result specifies required memory categories but the business has no Memory_Entries in those categories, THEN THE Orchestrator SHALL proceed without memory augmentation.

### Requirement 5: Dynamic Tool Injection

**User Story:** As a business owner, I want only the tools relevant to my current question included in the AI call, so that the model is not confused by irrelevant options and token usage is minimized.

#### Acceptance Criteria

1. THE Tool_Registry SHALL define each available tool with: name, description, input schema, category (one of: data_query, quote_management, follow_up_management, analytics, knowledge, customer_lookup), and a list of one or more intent categories that trigger inclusion.
2. WHEN the Orchestrator prepares a model call, THE Tool_Registry SHALL return only the tools whose category matches at least one of the required tool categories specified in the Intent_Result, and SHALL return the filtered subset within 50 milliseconds.
3. IF the Intent_Result specifies zero required tool categories, THEN THE Orchestrator SHALL invoke the model with no tools attached and SHALL not call the Tool_Registry for filtering.
4. THE Tool_Registry SHALL integrate with the existing `createDashboardTools` function in `features/ai/tools/vercel-tools.ts`, filtering the full tool set (maximum 30 tools) down to the relevant subset before passing to `streamText`.
5. THE Tool_Registry SHALL define tool metadata in a single configuration file within `features/ai/tools/` separate from the tool execution logic, containing at minimum: tool name, category assignment, and intent-category trigger list for each registered tool.
6. WHEN a tool category is injected, THE Orchestration_Logger SHALL record which tool categories and individual tool names were included in the call, logging a maximum of 30 tool names per entry.
7. IF a required tool category from the Intent_Result does not match any registered tool in the Tool_Registry, THEN THE Tool_Registry SHALL proceed with the remaining matched tools and SHALL log a warning indicating the unmatched category.

### Requirement 6: Prompt Segment Caching

**User Story:** As a developer, I want stable prompt segments cached in memory so that identical prompt text is not rebuilt and re-tokenized on every request.

#### Acceptance Criteria

1. THE Prompt_Segment_Cache SHALL cache the rendered text of each Prompt_Module after first use, keyed by a composite key consisting of the module identifier and a SHA-256 content version hash of the module's source content.
2. WHEN a Prompt_Module is requested and a cache entry exists whose content version hash matches the current source content hash, THE Prompt_Segment_Cache SHALL return the cached rendered text without re-reading or re-rendering the module file.
3. WHEN a new application process starts, THE Prompt_Segment_Cache SHALL initialize with an empty cache store, ensuring no entries persist across process restarts.
4. THE Prompt_Segment_Cache SHALL include serialized parameter values in the cache key so that a module rendered with different parameter combinations produces separate cache entries and a module rendered with identical parameters returns the same cached entry.
5. THE Prompt_Segment_Cache SHALL use a Map-based in-memory store with no external dependencies, limited to a maximum of 50 cached entries, evicting the least-recently-used entry when a new entry would exceed the 50-entry limit.
6. WHEN a Prompt_Module's source content hash differs from the hash stored in the existing cache entry for that module, THE Prompt_Segment_Cache SHALL invalidate the stale cache entry and store the newly rendered text with the updated hash.
7. IF a cache lookup encounters an error during hash computation or rendering, THEN THE Prompt_Segment_Cache SHALL bypass the cache and return freshly rendered text without disrupting the calling request.

### Requirement 7: Streaming Orchestration Compatibility

**User Story:** As a business owner, I want the orchestrated assistant to stream responses in real-time, so that I see partial results immediately without waiting for the full orchestration pipeline to complete.

#### Acceptance Criteria

1. THE Orchestrator SHALL support streaming responses using the existing `streamWithFallback` function from the Model_Router, preserving the current AI SDK streaming behavior.
2. WHEN a streaming request is initiated, THE Orchestrator SHALL complete all pre-stream steps (intent classification, memory retrieval, prompt composition, tool selection) within 2000 milliseconds before opening the stream to the client.
3. THE Orchestrator SHALL pass the dynamically composed system prompt, selected tools, and assembled conversation context to `streamText` in a single call compatible with the Vercel AI SDK.
4. WHEN post-stream operations are needed (conversation compression, usage logging), THE Orchestrator SHALL execute them asynchronously after the stream completes without blocking the response delivery to the client.
5. IF an error occurs during pre-stream orchestration steps, THEN THE Orchestrator SHALL return a non-streaming error response with a message indicating which step failed (intent classification, memory retrieval, prompt composition, or tool selection) before any stream is opened.
6. IF the `streamWithFallback` call throws after pre-stream steps succeed, THEN THE Orchestrator SHALL return an error response indicating model unavailability, preserving any state collected during pre-stream steps for retry.
7. WHEN post-stream operations fail, THE Orchestrator SHALL log the failure without surfacing an error to the client and without affecting the already-delivered streamed response.

### Requirement 8: Orchestration Observability

**User Story:** As a developer, I want detailed observability into each orchestrated AI request, so that I can diagnose performance issues, optimize token usage, and track costs accurately.

#### Acceptance Criteria

1. WHEN an orchestrated request completes, THE Orchestration_Logger SHALL record a structured entry containing: conversationId, userId, businessId, classified intent category, list of prompt modules included, list of prompt modules omitted, total assembled prompt token count, number of tools injected (0 if none), number of memory entries retrieved (0 if none), memory retrieval latency in milliseconds, intent classification latency in milliseconds, total orchestration overhead latency in milliseconds (measured from request received to stream opened), model identifier, provider identifier, and ISO-8601 UTC timestamp.
2. WHILE the application is running in the development environment, THE Orchestration_Logger SHALL write structured JSON log entries to the server console via `console.info`. WHILE the application is running in production, THE Orchestration_Logger SHALL write structured JSON log entries to the existing logging infrastructure used by the Token_Logger in `lib/ai/token-logger.ts`.
3. THE Orchestration_Logger SHALL integrate with the existing Token_Logger from `lib/ai/token-logger.ts` by calling `logAiInvocation` for intent classification calls, recording them with a taskType of `intent_classification` so that token usage from classification is persisted to the `ai_token_logs` table and included in structured console output.
4. WHEN intent classification consumes tokens, THE Usage_Limiter SHALL record the classification usage event with a weight of 0.5 against the user's monthly quota by calling `recordUsage` with that weight value.
5. THE Orchestration_Logger SHALL expose an internal timing utility that measures elapsed wall-clock milliseconds for each orchestration phase (classification, memory retrieval, prompt composition, tool selection, stream setup) and includes these per-phase durations in the log entry as integer millisecond values.
6. IF an orchestration phase fails or times out before the log entry can be fully populated, THEN THE Orchestration_Logger SHALL still emit a partial log entry containing all fields collected up to the point of failure, with failed phase durations recorded as -1 and a status field set to indicate which phase failed.
7. WHEN an orchestrated request completes, THE Orchestration_Logger SHALL record a total orchestration overhead latency that does not exceed 200 milliseconds at the 95th percentile under normal operating conditions, excluding external network calls to the AI provider.
