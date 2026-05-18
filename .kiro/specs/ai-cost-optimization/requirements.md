# Requirements Document

## Introduction

AI Cost and Token Optimization system for Requo. The system reduces token usage, avoids unnecessary AI calls, enforces per-user and per-business usage limits tied to subscription plans, caches repeated outputs, routes tasks to appropriate models by complexity, and logs all AI usage for cost visibility. The core principle is that AI receives only the smallest useful context for each task, never the full business/inquiry/quote/pricing data by default.

## Glossary

- **AI_Task_Registry**: A configuration module that defines each AI task type with its allowed model tier, max output tokens, temperature, required context fields, usage cost weight, cache TTL, and streaming permission.
- **AI_Context_Builder**: A server-side module that assembles the minimum relevant context for a given AI task, enforcing a hard token budget before calling the model.
- **Pricing_Retriever**: A module that matches inquiry text against pricing library entries and returns only the top relevant pricing blocks.
- **AI_Cache**: A server-side caching layer that stores and retrieves AI outputs keyed by a stable composite of business, user, task, prompt version, model, and source data versions.
- **AI_Draft_Store**: A database-backed persistence layer for generated AI drafts (quote drafts, follow-up messages) that survives page navigation and session changes.
- **Usage_Limiter**: A module that enforces per-user and per-business monthly AI usage limits based on subscription plan, with task-type weighting.
- **Token_Logger**: A module that records token usage, model, cost estimate, task type, latency, cache hit status, and success/failure for every AI invocation.
- **Model_Router**: The existing AI provider/model fallback router extended with task-type-aware tier selection (cheap tier for simple tasks, balanced/best tier for complex tasks).
- **Task_Type**: One of: inquiry_summary, quote_draft, followup_message, quote_improvement, form_suggestion, business_memory_summary.
- **Usage_Weight**: A numeric multiplier assigned to each task type reflecting its relative cost (e.g., inquiry_summary=1, quote_draft=3).
- **Cache_Key**: A deterministic composite key derived from businessId, userId, taskType, promptVersion, model tier, and content hashes of source data.
- **Subscription_Plan**: One of Free, Pro, or Business as managed by Polar billing.

## Requirements

### Requirement 1: AI Task Registry Definition

**User Story:** As a developer, I want a centralized registry of AI task configurations, so that each AI feature uses consistent, optimized parameters without duplicating prompt logic.

#### Acceptance Criteria

1. THE AI_Task_Registry SHALL define a configuration entry for each of the following Task_Types: inquiry_summary, quote_draft, followup_message, quote_improvement, form_suggestion, and business_memory_summary. Each entry SHALL contain: allowed quality tier (one of "balanced", "cheap", "best", or "coding"), max output tokens (integer between 256 and 16384), temperature (decimal between 0.0 and 2.0 inclusive), required context fields (a list of named string identifiers specifying which context data the task needs), cache TTL in seconds (integer between 0 and 86400, where 0 means no caching), priority weight (integer between 1 and 10 indicating relative resource allocation preference for rate-limit budgeting), and whether streaming is permitted (boolean).
2. WHEN a new AI invocation is initiated with a known Task_Type, THE AI_Task_Registry SHALL return the complete configuration entry for that Task_Type to the AI_Context_Builder and Model_Router within the same synchronous lookup.
3. IF a Task_Type is requested that does not match any entry in the registry, THEN THE AI_Task_Registry SHALL reject the request with an error indicating the unrecognized Task_Type value and listing the valid Task_Types, before any AI provider call is made.
4. THE AI_Task_Registry SHALL be defined as a TypeScript constant with Zod schema validation so that missing fields, out-of-range values, or invalid quality tier references are caught at build time.
5. WHEN a configuration entry is retrieved, THE AI_Task_Registry SHALL enforce that the required context fields listed in the entry are all present and non-empty in the invocation payload before forwarding to the Model_Router. IF any required context field is missing or empty, THEN THE AI_Task_Registry SHALL reject the invocation with an error indicating which fields are missing.

### Requirement 2: Minimal Context Assembly

**User Story:** As a business owner, I want AI features to use only the relevant data for each task, so that responses are faster, cheaper, and more focused.

#### Acceptance Criteria

1. WHEN the AI_Context_Builder assembles context for a Task_Type, THE AI_Context_Builder SHALL include only the fields listed in the AI_Task_Registry required context fields for that Task_Type.
2. THE AI_Context_Builder SHALL enforce a hard character budget per task (configurable in the AI_Task_Registry, default 4000 characters) and, when the assembled context exceeds the budget, SHALL omit fields in reverse priority order (last field in the required context fields list omitted first) until the total is within budget, truncating the lowest-priority remaining field if partial inclusion brings the total within budget.
3. WHEN assembling context for quote_draft or quote_improvement tasks, THE AI_Context_Builder SHALL include the current inquiry text, customer name and contact email, up to 5 relevant pricing blocks from the Pricing_Retriever, the business tone preference setting, and a business memory summary of no more than 500 characters.
4. WHEN assembling context for quote_improvement tasks, THE AI_Context_Builder SHALL include the existing quote draft in addition to the standard quote context defined in criterion 3.
5. THE AI_Context_Builder SHALL exclude full business data, full inquiry history, and full pricing library from every AI call.
6. IF a required context field for the Task_Type is unavailable (empty, null, or returns no results), THEN THE AI_Context_Builder SHALL omit that field from the assembled context and proceed with the remaining available fields without failing the AI call.

### Requirement 3: Relevant Pricing Retrieval

**User Story:** As a business owner, I want AI to reference only the pricing entries that match the current inquiry, so that quotes are accurate and the AI does not hallucinate prices.

#### Acceptance Criteria

1. WHEN the Pricing_Retriever is invoked for a task, THE Pricing_Retriever SHALL match inquiry text against pricing entry names, pricing entry descriptions, and pricing entry item descriptions using text similarity scoring.
2. THE Pricing_Retriever SHALL return the top-scoring pricing entries up to a maximum of 7, with a minimum of 1 entry required to produce a non-empty result set.
3. IF the pricing library for the business contains fewer than 3 entries in the task currency, THEN THE Pricing_Retriever SHALL return all available entries without applying similarity filtering.
4. IF no pricing entries score above a minimum similarity score of 0.3 on a 0-to-1 normalized scale, THEN THE Pricing_Retriever SHALL return an empty set and mark the context with a "needs_owner_review" flag.
5. THE Pricing_Retriever SHALL never fabricate pricing entries, interpolate prices between existing entries, or return pricing data that does not exist verbatim in the pricing library.

### Requirement 4: AI Output Caching

**User Story:** As a business owner, I want repeated AI requests with unchanged inputs to return cached results instantly, so that I do not waste usage quota or wait for redundant generation.

#### Acceptance Criteria

1. THE AI_Cache SHALL compute a Cache_Key from: businessId, userId, taskType, promptVersion, model tier, and the content version identifiers of each source data component listed in the AI_Task_Registry required context fields for that Task_Type (inquiry updatedAt timestamp, quote updatedAt timestamp, pricing library content hash, or business memory content hash), omitting components not required by the Task_Type and using a stable null sentinel for absent optional components.
2. WHEN a valid cached output exists for a computed Cache_Key and the entry has not exceeded its TTL, THE AI_Cache SHALL return the cached output without invoking the AI model.
3. WHEN any source data component included in the Cache_Key changes (inquiry updated, quote updated, pricing library modified, or business memory modified), THE AI_Cache SHALL treat the previous cache entry as invalid for subsequent requests by producing a different Cache_Key that will not match the prior entry.
4. THE AI_Cache SHALL respect the cache TTL defined in the AI_Task_Registry for each Task_Type, expiring entries that exceed the TTL regardless of source data changes.
5. IF the AI_Cache encounters a read failure during cache lookup, THEN THE AI_Cache SHALL proceed with the AI model invocation as if no cache entry exists and log the failure for monitoring.
6. IF the AI_Cache encounters a write failure when storing a new AI output, THEN THE AI_Cache SHALL return the AI output to the caller without interruption and log the write failure for monitoring.
7. THE Token_Logger SHALL record cache hits with zero input and output token counts, the original taskType, model name, businessId, userId, and the timestamp of the original cached generation.

### Requirement 5: Saved AI Drafts

**User Story:** As a business owner, I want generated quote drafts and follow-up messages to be saved and shown when I reopen the page, so that I do not lose AI work or regenerate unnecessarily.

#### Acceptance Criteria

1. WHEN the AI generates a quote draft or follow-up message, THE AI_Draft_Store SHALL persist the output in the database linked to the businessId, userId, entityId (inquiryId or quoteId), Task_Type, the source data updatedAt timestamp at time of generation, and the generated content as structured JSON matching the task output schema.
2. WHEN a user reopens a page with a previously generated draft that is not marked stale, THE AI_Draft_Store SHALL return the saved draft within 500 milliseconds without triggering a new AI call.
3. WHEN the user explicitly requests regeneration, THE AI_Draft_Store SHALL invoke a new AI call and replace the saved draft with the new output upon successful generation.
4. IF regeneration fails due to an AI provider error or usage limit, THEN THE AI_Draft_Store SHALL retain the existing saved draft unchanged and display an error message indicating the regeneration failed and the previous draft is still available.
5. WHEN the source data (inquiry or quote) updatedAt timestamp is more recent than the draft's stored source data timestamp, THE AI_Draft_Store SHALL mark the saved draft as stale and display a persistent inline notification on the draft indicating that the source data has changed since generation.
6. THE AI_Draft_Store SHALL retain only the most recent draft per entity and Task_Type combination, deleting any previous draft for that combination upon saving a new one.
7. WHEN the parent entity (inquiry or quote) is deleted, THE AI_Draft_Store SHALL delete all associated drafts for that entity.
8. THE AI_Draft_Store SHALL automatically delete drafts that have not been accessed or regenerated within 90 days.

### Requirement 6: Usage Limits by Subscription Plan

**User Story:** As a platform operator, I want to enforce monthly AI usage limits per subscription plan, so that costs are predictable and plan tiers provide clear value differentiation.

#### Acceptance Criteria

1. THE Usage_Limiter SHALL enforce the following monthly weighted usage limits: Free plan 10 units, Pro plan 300 units, Business plan 2000 units.
2. THE Usage_Limiter SHALL apply task-type weights when counting usage: inquiry_summary weight 1, followup_message weight 1, quote_improvement weight 2, quote_draft weight 3, form_suggestion weight 1, business_memory_summary weight 1.
3. WHEN a user or business attempts an AI request that would cause weighted usage to meet or exceed the monthly limit, THE Usage_Limiter SHALL reject the request before invoking the AI model and return an error message indicating the limit has been reached, the current plan name, and the next available plan tier for upgrade.
4. THE Usage_Limiter SHALL track usage at the user level aggregated across all businesses owned by that user, and independently at each business level, rejecting a request if either the user-level total or the business-level total meets or exceeds the plan limit.
5. THE Usage_Limiter SHALL reset usage counters at the start of each calendar month based on UTC midnight (00:00:00 UTC on the 1st).
6. WHEN a cached response is served, THE Usage_Limiter SHALL not deduct usage units from the user or business quota.
7. WHEN a user's subscription plan changes mid-month, THE Usage_Limiter SHALL apply the new plan's limit to subsequent requests without resetting the accumulated usage count for the current month.

### Requirement 7: Short Cooldown Between Requests

**User Story:** As a platform operator, I want a short cooldown between consecutive AI requests from the same user, so that accidental rapid-fire requests do not waste quota.

#### Acceptance Criteria

1. THE Usage_Limiter SHALL enforce a minimum cooldown of 3 seconds between consecutive AI requests from the same user for the same Task_Type, starting from the timestamp when the previous request was accepted for processing.
2. IF a request arrives within the cooldown window, THEN THE Usage_Limiter SHALL reject the request with a message indicating the remaining cooldown time rounded up to the nearest whole second.
3. IF a request is rejected due to cooldown, THEN THE Usage_Limiter SHALL NOT deduct the request from the user's usage quota.
4. IF the response for a request is served entirely from an application-level cache without invoking the AI provider, THEN THE Usage_Limiter SHALL NOT start a new cooldown window for that request.

### Requirement 8: Token and Cost Logging

**User Story:** As a platform operator, I want detailed logs of every AI invocation including tokens, cost, and outcome, so that I can monitor spending, debug failures, and optimize model selection.

#### Acceptance Criteria

1. WHEN an AI invocation completes (success or failure), THE Token_Logger SHALL record: userId, businessId, taskType, model name, provider name, input token count, output token count, total token count, cache hit boolean, latency in milliseconds, success or error status, error message (truncated to 1024 characters) if applicable, and timestamp.
2. WHEN an AI invocation completes, THE Token_Logger SHALL compute an estimated cost by applying separate configurable per-token rates for input tokens and output tokens based on the model and provider combination.
3. IF the cost-per-token table has no entry for the model and provider used, THEN THE Token_Logger SHALL record the log entry with a null cost estimate and flag the entry as "unpriced" for admin review.
4. THE Token_Logger SHALL persist log entries to the database and retain them for a minimum of 90 days, queryable by admin views with filtering by userId, businessId, taskType, provider, date range, and success/error status.
5. WHEN an AI invocation completes, THE Token_Logger SHALL write a structured JSON server log line containing: timestamp, userId, businessId, taskType, model, provider, input token count, output token count, total token count, estimated cost, latency in milliseconds, cache hit boolean, and status.

### Requirement 9: Compact Prompt Design

**User Story:** As a developer, I want AI prompts to be short, structured, and output-constrained, so that token usage is minimized and responses are predictable.

#### Acceptance Criteria

1. THE AI_Task_Registry SHALL define a max output token limit for each Task_Type that the Model_Router enforces on every AI call, with limits not exceeding 256 tokens for simple tasks (inquiry_summary, followup_message, form_suggestion) and not exceeding 1024 tokens for complex tasks (quote_draft, quote_improvement, business_memory_summary).
2. WHEN a task of type inquiry_summary, form_suggestion, or business_memory_summary requires output, THE AI_Context_Builder SHALL instruct the model to respond in JSON format without self-explanation or preamble.
3. THE AI_Context_Builder SHALL not include conversational greetings, role-play framing, repeated task descriptions, or filler phrases (such as "You are a helpful assistant", "Please note that", or "Here is your response") in system prompts.
4. WHEN the AI_Context_Builder constructs a prompt, THE AI_Context_Builder SHALL keep the total system prompt under 800 tokens for simple tasks (inquiry_summary, followup_message, form_suggestion) and under 1600 tokens for complex tasks (quote_draft, quote_improvement, business_memory_summary).
5. IF the assembled system prompt exceeds the token budget for the given Task_Type, THEN THE AI_Context_Builder SHALL truncate lower-priority context fields until the prompt fits within budget, and SHALL not invoke the AI model if the prompt still exceeds the budget after truncation.

### Requirement 10: Task-Aware Model Routing

**User Story:** As a platform operator, I want simpler AI tasks routed to cheaper/faster models and complex tasks routed to stronger models, so that cost is optimized without sacrificing quality where it matters.

#### Acceptance Criteria

1. WHEN an AI invocation is initiated for a Task_Type, THE Model_Router SHALL read the quality tier from the AI_Task_Registry entry for that Task_Type and use it to select the provider-specific model fallback chain.
2. THE AI_Task_Registry SHALL assign the "cheap" quality tier to inquiry_summary, followup_message, and form_suggestion tasks.
3. THE AI_Task_Registry SHALL assign the "balanced" quality tier to quote_draft, quote_improvement, and business_memory_summary tasks.
4. WHEN a task-specific quality tier override is configured in the AI_Task_Registry, THE Model_Router SHALL use the override value instead of the default tier mapping defined in criteria 2 and 3.
5. IF the AI_Task_Registry entry for a Task_Type does not specify a quality tier and no default mapping exists, THEN THE Model_Router SHALL fall back to the "balanced" quality tier.
6. IF all models in the selected tier's fallback chain fail with retryable errors, THEN THE Model_Router SHALL exhaust the full provider fallback chain (Groq → Cerebras → Gemini → OpenRouter) for that tier before raising an error, without escalating to a higher-cost tier.

### Requirement 11: Clean Module Structure

**User Story:** As a developer, I want AI optimization logic organized in dedicated modules with TypeScript types and Zod schemas, so that the codebase remains maintainable and testable.

#### Acceptance Criteria

1. THE system SHALL place AI task orchestration logic (prompt construction, context assembly, response parsing, and task-specific workflows) in `features/ai/` and shared AI infrastructure (provider abstractions, router, model configuration, and streaming utilities) in `lib/ai/`.
2. THE system SHALL place per-user request rate limiting in `lib/public-action-rate-limit.ts` (or a dedicated rate-limit module within `lib/`) and plan-based usage quota tracking (monthly AI generation counts per business) in a module importable from both `lib/` and `features/ai/`.
3. THE system SHALL define TypeScript types and Zod validation schemas for all AI task configurations, context shapes, cache keys, usage records, and log entries, co-located with the module that owns each concept (task-level types in `features/ai/types.ts` and `features/ai/schemas.ts`, provider-level types in `lib/ai/types.ts`).
4. THE system SHALL define each AI task prompt template in exactly one file within `features/ai/`; no prompt string or template literal used for AI model instructions SHALL appear in more than one source file.
5. THE system SHALL expose AI optimization features through server actions in `features/ai/actions.ts` or API route handlers in `app/api/ai/`, following the existing pattern where server actions validate input with Zod, check business access via `getBusinessActionContext`, verify plan-based feature access, and enforce rate limits before executing AI logic.
6. WHEN a new AI task type is added, THE system SHALL require that its TypeScript types, Zod input/output schemas, and prompt template each exist before the task can be invoked at runtime (enforced through TypeScript compilation — a task missing any of these artifacts SHALL produce a type error).
