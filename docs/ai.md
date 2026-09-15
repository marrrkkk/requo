# Requo AI Architecture

How Requo's AI system works. Codebase is the source of truth.

Deep dive on the two chat surfaces: `docs/architecture/assistant-and-agent.md`. ADRs: `adr-001-ai-agent`, `adr-003-agent-assistant-naming`, `adr-004-agent-transcript-privacy`, `adr-005-proposed-inquiry-approval`, `adr-006-ai-token-budgets-and-stream-recovery`.

Terminology (ADR 003): **Agent** = customer-facing anonymous chat; **Assistant** = owner-facing authenticated chat. Never swap them.

## Overview

Three AI product areas, one shared infra:

| Area | Code | What it does |
|---|---|---|
| Drafting | `features/ai/` | AI-assisted quote drafts + improvements over an inquiry (no chat orchestrator, never mutates quotes) |
| Customer Agent | `features/ai-agent/` | Anonymous public chat that qualifies a visitor and stages a Proposed Inquiry |
| Owner Assistant | `features/owner-assistant/` | Authenticated chat over business data with read tools + confirmation-gated writes |
| Infra | `lib/ai/` | Registry, catalog, router, capacity, budgets, embeddings, guards, observability |
| Grounding | `features/memory/` | Manual memories + uploaded files → chunks → embeddings → tenant-filtered retrieval |

SDK: Vercel AI SDK 6 (`ai@6`, `@ai-sdk/*`, `@openrouter/ai-sdk-provider`). Patterns: `generateText`/`streamText` with `tools`, `stopWhen: stepCountIs(5)`, `toUIMessageStreamResponse()`, `embed`/`embedMany`, `createProviderRegistry`/`customProvider`, `LanguageModelV3` middleware.

## AI entry points

| Entry | Route / action | Auth |
|---|---|---|
| Agent chat stream | `POST app/api/ai/agent/chat/route.ts` | `publicToken` possession only |
| Agent session fetch | `GET app/api/ai/agent/session/route.ts?token=` | Token format-validated (`/^[a-f0-9]{64}$/`) |
| Assistant chat stream | `POST app/api/ai/owner-assistant/chat/route.ts` | Better Auth + `getBusinessActionContext` (→ 401/403) |
| Assistant session | `app/api/ai/owner-assistant/session/[sessionId]/route.ts` | Same membership check |
| Quote draft/improve | `generateQuoteDraftAction` (`features/ai/actions.ts`, FormData) | `getBusinessActionContext` (staff+) + `hasFeatureAccess(aiQuoteDrafting)` + usage limit |
| Background draft | Inngest `inquiry-qualified-ai-draft` (`lib/inngest/functions/events.ts`, event `requo/inquiry.qualified`) | System (checks `autoDraftQuoteOnQualify` + usage limit) |
| Knowledge ingest | Inngest `processKnowledgeFileUpload` (`lib/inngest/functions/knowledge.ts`, event `requo/knowledge.file-uploaded`) | System |

Public chat UI: `app/(public)/b/[slug]/chat/page.tsx` (+ `features/ai-agent/components/chat-interface.tsx`, `proposed-inquiry-card.tsx`); 404 when `aiAgentEnabled` off. Assistant UI: `app/(business)/[businessSlug]/(main)/assistant/` + `chat/[sessionId]/` (`owner-assistant-chat.tsx`, `confirmation-dialog.tsx`, `assistant-history-panel.tsx`, `tool-result-cards.tsx`).

## AI request lifecycle (chat surfaces)

1. Boundary: Zod validation → rate limits (Agent: per-IP 100/h + per-session 50/h; Assistant: daily message bucket) → entitlements (Agent Pro+ at boundary **and** in-orchestrator so downgrades apply in-flight) → conversation limits.
2. Orchestrator: load session → `sanitizeAiInput` → persist user turn → advance state (Agent: qualification extraction; Assistant: title derivation) → build prompt from history **after** persist.
3. `streamText` with tools over the UI message stream (`temperature 0.2`; Agent `maxOutputTokens 600`, Assistant `2000`; Google `thinkingBudget: 1`).
4. During stream: `truncateToolOutput` (4000 chars), `filterAiOutput` (canary + leakage patterns), `correctTokenUsage`.
5. After: `recordUsage` (shared monthly credit pool, plan-scoped, token-weighted, hard ceiling) + `logAiInvocation` (`ai_token_logs`) + Agent run telemetry (`ai_agent_runs`). Failures return typed `error` results or `AGENT_UNAVAILABLE_COPY` — never plausible empty data.

Drafting lifecycle (`features/ai/quote-generator.ts`): sanitize → inquiry context (`queries.ts`) → `retrievePricingCandidates` + `retrieveBusinessKnowledge` → `generateWithFallback` (`quote_draft`/`quote_improvement`, 4000 tokens, temp 0.3, JSON-only prompt) → extract/repair JSON → hydrate prices server-side → verify/repair grounding → readiness + missing-info normalize → cache → usage/token logging → output filter.

## Model and provider architecture

Providers (`lib/ai/registry.ts`, only constructed when configured in `lib/env.ts`): Groq (`createGroq`), Cerebras (`createCerebras`), Gemini via Google (`createGoogleGenerativeAI`), Mistral (`createMistral`), Cloudflare Workers AI + NVIDIA NIM (both `createOpenAICompatible`), OpenRouter (`createOpenRouter`). `isAiConfigured()` gates all AI work. Fallback order: Groq → Cerebras → Gemini → Mistral → Cloudflare → NVIDIA NIM → OpenRouter (`.env.example:91`).

Model catalog (`lib/ai/catalog.ts`, `BASE_CATALOG`) is the single truth: `modelId`, quality, context window, max output, tool/structured-output capability, RPM/RPD/TPM/TPD + neuron limits, cost. Examples: `groq:openai/gpt-oss-120b/20b`, `cerebras:gpt-oss-120b/qwen-3-32b`, `google:gemini-2.5-flash/2.5-pro/3.5-flash-lite`, `mistral:*-latest`, `cloudflare:@cf/…`, `nvidia:openai/gpt-oss-20b`, `openrouter:…:free`. Env overrides `AI_{RPM,RPD,TPM,TPD}_{PROVIDER}`, `AI_NEURONS_CLOUDFLARE_DAILY`. `getModelsForProvider()` re-derives from the catalog (`lib/ai/model-options.ts`).

Routing profiles (`lib/ai/routing-profiles.ts`) — no single global fallback; each task has an order + exclusions:

| Profile | Order (head) | Excludes |
|---|---|---|
| `assistant_chat` | `google:gemini-3.5-flash-lite`, `cerebras:gpt-oss-120b`, … | cloudflare, nvidia |
| `agent_chat` | `groq:openai/gpt-oss-20b`, `groq:120b`, `google:3.5-lite`, … | cloudflare, nvidia |
| `quote_draft` / `quote_improvement` | `mistral-medium`, cerebras…, `gemini-2.5-flash`, openrouter nemotron…, `gemini-2.5-pro` | groq, cloudflare, nvidia |
| `short_text` | `groq:20b`, cloudflare, cerebras, nvidia… | — |
| `extraction` | `google:gemini-2.5-flash`, `google:3.5-lite` | — |

## Fallback, capacity, budgets

- `router.ts`: `generateWithFallback` / `streamWithFallback` (pinned provider+model vs profile chain). Per-provider timeouts (Groq 15s … OpenRouter 30s); 404 → `markModelDead`; oversized → reorder by context window; 429 `retryAfter` capped 5s.
- `fallback-model.ts`: `createFallbackLanguageModel` preserves streaming across candidates (pre-content `peekHead` retry; mid-stream piped); wraps each in `stripReasoningMiddleware` (drops `reasoning` parts that 400 on some providers / empty assistant messages).
- `capacity-selector.ts`: RPM/RPD/TPM/TPD + provider-shared + Cloudflare neuron pool via `cacheLayer` (`cap:*`, dead-list 6h). `selectModels({ profile, estimatedTokens })` keeps profile order, filters (tools/quality/configured/dead), prefers <80% utilization, reserves `reserve` models last. `CHAT_MAX_ATTEMPTS = 5`, non-chat 4.
- `token-budget.ts`: `estimateTokens = len/4`; turn budgets — Agent `{ input 3000, output 600, overhead 1200 }`, Assistant `{ 6000, 2000, 2800 }`; `compactMessages` (head + extractive summary + tail) + TPM headroom (uses 80% of configured `AI_TPM_*`, keeps 20%).
- `usage-limiter.ts`: monthly token-weighted `ai_usage_events` per business and plan (`PLAN_LIMITS free 30 / pro 150 / business 500`; weight = `max(1, ceil((inputTokens + 4 × outputTokens) / 5000))`, falling back to fixed task weights only when a provider reports no usage) + 3s per-user cooldown. Usage rows carry the plan in effect, so a mid-month plan change starts a fresh allowance instead of carrying the previous plan's total (pre-attribution rows have `plan IS NULL` and count toward whatever plan is current). `conversation-limits.ts`: Assistant daily messages (25/250/1000), Agent monthly sessions (0/100/500, daily ceiling, 50 msgs/session).

## Prompt and conversation architecture

- Drafting prompts: `features/ai/prompts/quote-draft.ts`, `quote-improvement.ts` — JSON-only, `unitPriceInCents: 0` always, exact/suggested/none candidate rules, knowledge/past-quotes never price sources.
- Agent system prompt: `features/ai-agent/orchestrator.ts` (`buildSystemPrompt`) — qualification flow, live-Service grounding, `propose_inquiry` before any commit.
- Assistant system prompt: `features/owner-assistant/prompts/system-prompt.ts` — business name/plan/role/timezone, Business Instructions (`lib/ai/business-instructions.ts`), plan features/limits, confirmation + boundary rules.
- History: Agent last 30 non-empty user/assistant turns (`message-service.ts`); Assistant last 50 with tool results as `[data from tool]` text. Sessions minted on first send (no row for visitors who never type); Agent token in `sessionStorage`, Assistant id via `X-Session-Id` URL rewrite.
- Assistant `prepareStep`: search-only steps 0–1, then all tools; `toolChoice: none` at step ≥ 4 to force synthesis.

## Memory, embeddings, RAG

Pipeline (`features/memory/`): `extraction.ts` (TXT/CSV/MD decode; PDF via `unpdf` with `[Page N]` markers; char cap) → `chunking.ts` (deterministic paragraph→line→char windows + overlap, SHA256 `contentHash`) → `generateEmbeddings` (`lib/ai/embeddings.ts`: `gemini-embedding-001`, 768 dims, 20k char cap, SHA256 cache 24h keyed on content, null on failure → lexical fallback) → transactional replace of `business_knowledge_chunks`. Manual memories embed `title + content` best-effort nullable (`mutations.ts`; the text is shared via `embedding-text.ts` so the backfill reproduces it byte-for-byte). Files live in the private Supabase `knowledge-files` bucket (`processing.ts`).

Transient provider failures are retried with backoff, classified by `isTransientProviderError` (`lib/ai/errors.ts`) — it requires *positive* evidence of a transient condition, unlike `isRetryableError`'s deliberate fail-safe default, which would retry an unclassifiable error blindly. The budget is asymmetric by design: ingestion uses `EMBEDDING_MAX_ATTEMPTS_WRITE = 3`, because a persisted `null` is only repairable by the backfill; retrieval uses `EMBEDDING_MAX_ATTEMPTS_READ = 1`, because it sits on the quote-generation critical path and a transient failure is better served by immediate lexical fallback. An exhausted slice still stores `null` (the nullable contract three callers rely on) but emits a structured `embedding_batch_failed` log so the loss is visible. `cron-embedding-backfill` (hourly, Inngest, `concurrency: limit 1`) re-embeds `embedding IS NULL` rows — ≤100 per table per run, ready files only, expiring the knowledge cache per touched business. The 24h embedding cache is only shared when `isRedisConfigured`; without Redis it is per-instance and effectively never hits on serverless (`docs/setup/redis.md`).

Retrieval (`retrieval.ts:retrieveBusinessKnowledge({ businessId, queryText, topK ≤ 10 default 6, tokenBudget default 1800, categories? })`): parallel loads of `business_memories` + ready-file chunks, both filtered by `eq(businessId)` and capped by recency (`KNOWLEDGE_CANDIDATE_LIMIT_MEMORIES = 200`, `KNOWLEDGE_CANDIDATE_LIMIT_CHUNKS = 500`) so in-process scoring stays bounded; hybrid `0.65·cosine + 0.35·lexical`; thresholds `combined ≥ 0.26`, `cosine ≥ 0.16`, lexical-only needs ≥ 2 terms; top-K within token budget. Returns `KnowledgeEvidence[]` (`manual_memory` | `uploaded_file` + score/confidence) via `formatKnowledgeEvidence`. Context-only — never price authority.

Lexical term selection and matching are shared with pricing via `lib/ai/text-terms.ts`: query terms are ≥4 chars with function-word stopwords removed (`COMMON_STOPWORDS`), and matching is **whole-token** (`matchedTerms`), so "cat" no longer matches "category" or "concatenate". Thresholds are deliberately unchanged — measured against the previous implementation, genuine whole-word matches score identically, function-word-padded queries score *higher* (the stopwords were depressing the denominator), and substring-only false positives drop to zero (`tests/unit/memory-retrieval-terms.test.ts`). Pricing passes its own stopword set as a *replacement* rather than an extension and keeps its substring matching, so its term selection and `exact`/`suggested` classification are byte-identical (`features/ai/pricing-retrieval.ts`: currency-exact, max 12 candidates).

## Tools

Agent tools (`features/ai-agent/tools/`, context `AgentToolContext`, 4 tools): `search_knowledge` (RAG topK 5, budget 1500, read-only) · `get_business_info` (name/description/contact from context, no DB) · `get_services` (live non-archived public Services + `/inquire/{biz}/{form}` URLs) · `propose_inquiry` (stages `pending` proposal in session state, commits nothing). No commit authority: Inquiry rows are created only by `approveAgentProposalAction` (exactly-once consume → `createAgentInquirySubmission`, `source ai_assistant`) or the handoff helper (`createAgentHandoffSubmission`, `escalated`) — note the handoff helper is not currently wired as a model tool, so model-initiated handoff is unreachable until wired.

Assistant tools (`features/owner-assistant/tools/`, 12): reads `search_inquiries`, `get_inquiry_stats`, `search_quotes`, `get_quote_stats`, `search_customers`, `get_conversion_analytics` (plan-gated), `search_knowledge`, `get_follow_up_stats` (all `businessId`-scoped selects, archived/deleted excluded); writes `create_inquiry` (`createAssistantInquirySubmission`), `create_quote` (draft only via `createQuoteForBusiness`), `update_inquiry_status` (`changeInquiryStatusForBusiness`), `send_quote` (`sendQuoteEmail` + `markQuoteSentForBusiness`). Every write writes an audit record as the acting member. Role gate (`permissions.ts:requireToolRole`): drafting open to all members, `send_quote` manager+. Confirmation: `send_quote` + `update_inquiry_status` return `confirmation_required` (staged in session state); `confirmAssistantToolAction({ businessSlug, sessionId, confirmationId, decision: "approved" | "rejected" })` (`features/owner-assistant/actions.ts`) consumes exactly once (`FOR UPDATE`) then executes. Testing seam: `MockLanguageModelV3` at the provider boundary through real route handlers + real DB (`tests/support/mock-model.ts`).

## Security boundaries

1. Tenant context resolved server-side from session/token — tools never trust LLM-provided IDs.
2. Agent transcripts reach the business only via an Inquiry snapshot (`getAgentTranscriptForInquiry`, read-only on the inquiry page); no browse/search surface (ADR 004).
3. Input: `sanitizeAiInput` (zero-width/NFKC strip, override/role-switch/extraction patterns in EN/FR/ES/DE, lock ≥ 3/h) + `sanitizeMemoryContent`; per-session dedup (10s SHA256).
4. Output: `filterAiOutput` (canary token → whole-response replace, `*_API_KEY`/`DATABASE_URL`/instruction-disclosure patterns → `[REDACTED]`, fail-open) + `quality-gate` logging + `security-events` log (`ai_security_events`).
5. Raw NL queries are never audit-logged; only tool executions are.
6. Stream recovery (ADR 006): transcript + partial reply stay visible; retry reuses the turn after compaction and must not repeat side-effecting tools unless idempotent/unexecuted.

## Error handling, observability, cost

Errors: typed tool `error` results; route-mapped `QUOTA`/`SESSION_LIMIT`/`INPUT_REJECTED`; `onError: AGENT_UNAVAILABLE_COPY` for streams; multi-step Assistant failures never roll back (report what succeeded + manual next step). Observability: `ai_token_logs` per invocation (model/provider/tokens/cache/latency/status, cost via `getDerivedCostTable`), `ai_agent_runs` per turn, `console.info` JSON. Cost: shared monthly credit pool (hard ceiling) + per-surface logs; Cloudflare neurons and TPM headroom prevent avoidable overages — provider dashboards stay authoritative.

## Adding a provider / model / capability

- **Provider:** add SDK + `is*Configured` in `lib/env.ts` → construct in `registry.ts` → catalog entries with limits/cost in `catalog.ts` → timeout in `router.ts` → capacity keys in `capacity-selector.ts` → include in profile orders → document env vars in `docs/setup/ai-provider-limits.md` + `docs/integrations.md`. Never call the SDK from feature code.
- **Model:** add `ModelEntry` in `catalog.ts` (verify context window, tool/structured-output flags, limits) → profile placement in `routing-profiles.ts` → `npm run check:models` (+ `--probe`).
- **Capability:** drafting → `features/ai/` (reuse `generateWithFallback`, pricing + knowledge retrieval, server-side price hydration); chat tool → add to the surface's `tools/` with Zod schema, `businessId`-scoped implementation, role/plan gates, audit record; wire confirmation if it sends customer-facing content or mutates pipeline state.

## Rules for modifying AI code

1. Route all provider calls through `lib/ai/router.ts` + `selectModels`; never import a provider SDK in `features/`.
2. Keep price hydration server-side; models never emit money.
3. Scope every tool query by `businessId`; re-verify tenant context inside the tool.
4. Gate plan-limited tools with `PLAN_LIMIT` errors, not empty results.
5. Require confirmation for customer-visible or pipeline-mutating writes.
6. Filter output before persistence; never log raw prompts/transcripts.
7. Cover changes with the mock-model route-handler tests; run `npm run check` + `npm run test`.
