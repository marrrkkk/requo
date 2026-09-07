# ADR 001: AI Agent Architecture

**Status**: Proposed  
**Date**: 2026-09-01  
**Deciders**: Implementation team  
**Context**: Requo AI Agent V1 MVP

---

## Context

Requo currently captures customer inquiries through traditional web forms. We want to add a conversational AI agent as an alternative interface. The agent should collect the same information through natural chat, then create inquiries using the existing business logic.

**Core requirement**: The agent must integrate with existing infrastructure rather than creating a parallel inquiry system.

---

## Decision 1: Session-First vs. Inquiry-First Model

### Options Considered

**A. Inquiry-first**: Every conversation IS an inquiry from the first message. Status transitions: `qualifying` → `new` → `quoted`.

**B. Session-first**: Conversations exist in separate `ai_agent_sessions` table. Inquiries created only when qualified.

**C. Hybrid**: Sessions promote to inquiries at qualification, then continue as inquiry-attached conversations.

### Decision

**Session-first (Option B)**

### Rationale

1. **Cleaner semantics**: A session is ephemeral qualification work; an inquiry is an actionable business record. These are different concerns.

2. **Existing schema**: The `inquiry_messages` table appears designed for human notes/responses, not multi-turn AI chat transcripts. Creating a separate `ai_agent_messages` table avoids confusion.

3. **Abandonment handling**: Many chat sessions will be abandoned mid-conversation. We don't want partial inquiries polluting the business inbox. Sessions can be marked `abandoned` without creating an inquiry.

4. **Reversibility**: Sessions are easier to delete or archive without affecting inquiry history.

### Consequences

- **Positive**: Clear separation of concerns; abandoned chats don't create noise
- **Negative**: More tables; need to link session ↔ inquiry on completion
- **Risk**: Duplication if we're not careful (mitigated by reusing `createInquirySubmission()`)

---

## Decision 2: No Customer Entity in V1

### Options Considered

**A. Inquiry-scoped**: Customer data lives as fields on inquiries; no cross-inquiry identity.

**B. Email-based identity**: Detect duplicate emails, link inquiries, but no `customers` table.

**C. Formal customer entity**: Create `customers` table now; link all inquiries to customer records.

### Decision

**Inquiry-scoped (Option A)**

### Rationale

1. **MVP scope**: Creating a customer entity is a large refactor that benefits the entire product, not just the AI agent. It should be a separate project.

2. **Existing architecture**: Requo currently denormalizes customer info on inquiries and quotes. Changing this for the agent alone would create inconsistency.

3. **Tool naming**: The spec mentioned `create_customer` and `update_customer` tools, but there's no customer entity to create. These should be `set_inquiry_customer_fields` or similar.

4. **Deduplication**: V2 can add deduplication logic (detect same email, flag potential duplicates) without a full customer entity.

### Consequences

- **Positive**: Smaller scope; consistent with existing architecture
- **Negative**: No cross-inquiry customer history (acceptable for V1)
- **Future work**: Customer entity remains a valuable future enhancement

---

## Decision 3: Tool-Based Agent Architecture

### Options Considered

**A. Prompt-only**: Agent has no tools; all business context in system prompt.

**B. Retrieval-only**: Agent has one RAG tool; everything else in prompt.

**C. Tool-based**: Agent has 5 tools (search, business info, services, create inquiry, handoff).

### Decision

**Tool-based (Option C)**

### Rationale

1. **Accuracy**: Tools ensure the agent uses authoritative data (RAG, form config, actual inquiry creation) rather than hallucinating.

2. **Auditability**: Tool calls are logged, showing exactly what the agent did (searched knowledge, created inquiry, etc.).

3. **Security**: Business logic (inquiry validation, tenant isolation) lives in tools, not the LLM prompt. The LLM decides WHEN to call tools; tools enforce HOW they're called.

4. **Extensibility**: Adding new capabilities (quote generation, follow-ups) means adding tools, not rewriting prompts.

5. **Vercel AI SDK pattern**: SDK 6.0 has first-class tool support with `streamText` + `tools` parameter.

### Consequences

- **Positive**: Accurate, auditable, secure, extensible
- **Negative**: More complex than prompt-only (but unavoidable for production quality)
- **Risk**: Runaway tool loops (mitigated by `maxSteps: 5`)

---

## Decision 4: Reuse Existing Services, Not Duplicate

### Options Considered

**A. Agent-specific logic**: Build new inquiry creation, RAG, model selection just for the agent.

**B. Reuse existing services**: Agent calls `createInquirySubmission()`, `searchBusinessMemories()`, etc.

### Decision

**Reuse existing services (Option B)**

### Rationale

1. **Single source of truth**: Inquiry validation, notification, activity logging, qualification logic all live in `createInquirySubmission()`. Duplicating this would create divergent behavior.

2. **Maintenance burden**: Two inquiry creation paths means every change must be applied twice.

3. **Consistency**: Inquiries from forms and agent should be identical in the database and dashboard. Reusing the same service guarantees this.

4. **Existing infrastructure**: Requo already has robust AI routing, RAG, token logging, usage limiting. The agent should leverage these, not rebuild them.

### Consequences

- **Positive**: Consistency, maintainability, leverage existing quality
- **Negative**: Agent is coupled to existing service APIs (acceptable; shared domain logic should be shared)
- **Risk**: Breaking changes to shared services affect agent (mitigated by integration tests)

---

## Decision 5: Session Token Authentication (Not URL-Based)

### Options Considered

**A. URL-based**: `/api/ai/agent/chat/[businessSlug]` — business from URL.

**B. Session token**: Client sends session token in request body; server resolves business from session.

**C. JWT**: Issue signed JWTs with embedded business context.

### Decision

**Session token in request body (Option B)**

### Rationale

1. **Security**: URL params are logged, cached, shared. Session tokens in the body are less likely to leak.

2. **Separation of concerns**: The session is the security boundary. Business context is resolved server-side from the session, never from the URL or client input.

3. **Tenant isolation**: Tools receive pre-validated `businessId` from session resolution. They never trust LLM-provided or client-provided IDs.

4. **Simplicity**: No need for JWT signing/verification infrastructure. A cryptographically random token stored in the DB is sufficient.

### Consequences

- **Positive**: Secure, simple, clear tenant isolation
- **Negative**: Client must manage token in localStorage (acceptable for modern web apps)
- **Risk**: Token leakage (mitigated by HTTPS, short expiry, no sensitive data in token itself)

---

## Decision 6: Fully Autonomous in V1 (No Approval Workflows)

### Options Considered

**A. Fully autonomous**: Agent creates inquiries automatically; no human approval.

**B. Inquiry approval**: Agent drafts inquiry; human approves before submission.

**C. Configurable per business**: Business owner chooses autonomy level.

### Decision

**Fully autonomous (Option A)**

### Rationale

1. **Value proposition**: The agent's value is reducing manual work. Requiring approval defeats this.

2. **Low risk**: Creating an inquiry is low-risk. It's not sending quotes, applying discounts, or charging cards. It's the same action as submitting a form.

3. **Simplicity**: Approval workflows require UI for pending inquiries, notification of business owner, approve/reject actions, and state management. This is substantial complexity for marginal safety gain.

4. **Trust**: If a business doesn't trust the agent to create inquiries, they can disable it entirely. There's no middle ground where the agent is useful but requires constant supervision.

5. **Iteration path**: V2 can add approval for higher-risk actions (quote generation, email sending). V1 should prove the core workflow first.

### Consequences

- **Positive**: Simple, high value, clear UX
- **Negative**: Business might receive low-quality inquiries (mitigated by required fields, structured state, human handoff)
- **Future**: Add approval for quote generation, pricing, discounts in V2

---

## Decision 7: Vercel AI SDK `streamText` with Tools (Not Custom Loop)

### Options Considered

**A. Custom loop**: `while(true) { llm() → tool() → llm() }`

**B. Vercel AI SDK `streamText` with tools**: Use SDK's built-in tool execution.

**C. LangChain or other framework**: Use existing agent framework.

### Decision

**Vercel AI SDK `streamText` with tools (Option B)**

### Rationale

1. **Already integrated**: Requo uses Vercel AI SDK 6.0 for all LLM calls. No reason to introduce another framework.

2. **SDK has tool support**: SDK 6.0 supports `tools` parameter with `streamText`. It handles tool execution loop internally via `maxSteps`.

3. **Callbacks for logging**: `onStepFinish` and `onFinish` callbacks allow logging tool calls and final responses without custom orchestration.

4. **Multi-provider**: SDK works with the existing multi-provider registry (`groq:model`, `google:model`, etc.).

5. **No `ToolLoopAgent`**: That was AI SDK v3 API. Modern pattern is `streamText` with tools.

### Consequences

- **Positive**: Consistent with existing architecture; mature SDK handles edge cases
- **Negative**: Less control over loop internals (acceptable; SDK is well-tested)
- **Risk**: SDK bugs (mitigated by using stable version, fallback to manual loop if needed)

---

## Decision 8: Hardcoded System Prompt in V1 (Configuration UI in V2)

### Options Considered

**A. Hardcoded**: System prompt built in `orchestrator.ts`, uses business name and tone preference.

**B. Full configuration UI**: Business owner can edit system prompt, instructions, tools, autonomy.

**C. Minimal config**: Business owner can toggle enable/disable and set tone only.

### Decision

**Hardcoded with minimal config (mix of A and C)**

### Rationale

1. **MVP scope**: A configuration UI is a separate feature that requires design, validation, testing, and support. It's not blocking for V1.

2. **Opinionated product**: Requo's positioning is opinionated defaults. The agent prompt should be crafted for service businesses, not exposed as a blank canvas.

3. **Prompt engineering risk**: Allowing arbitrary system prompts invites poorly-written prompts, security issues (prompt injection via config), and support burden.

4. **Tone preference**: A simple tone dropdown (`friendly`, `professional`, `casual`) provides useful customization without complexity.

5. **Enable/disable**: Businesses need an on/off switch. Beyond that, V1 can ship with a single well-crafted prompt.

### Consequences

- **Positive**: Fast to ship; consistent quality; fewer support issues
- **Negative**: Less flexibility (acceptable for MVP; V2 can add advanced config)
- **Future**: V2 adds custom instructions field, tool toggles, autonomy levels

---

## Decision 9: 24-Hour Session Expiry (Not Indefinite)

### Options Considered

**A. Indefinite**: Sessions never expire unless explicitly completed.

**B. 1-hour expiry**: Sessions expire after 1 hour of inactivity.

**C. 24-hour expiry**: Sessions expire after 24 hours regardless of activity.

### Decision

**24-hour expiry (Option C)**

### Rationale

1. **Conversation context decay**: A conversation from yesterday is unlikely to be resumed meaningfully. Forcing a new session is more natural.

2. **Database growth**: Indefinite sessions accumulate forever. A 24-hour expiry keeps the active set bounded.

3. **Resume window**: Within the same day, customers can resume. Beyond that, starting fresh avoids stale context.

4. **Background cleanup**: A simple cron job can mark expired sessions as `abandoned` and optionally archive messages.

### Consequences

- **Positive**: Bounded storage; natural conversation boundaries
- **Negative**: Customer loses state if they wait >24 hours (acceptable; they can start a new conversation)
- **Implementation**: Background job runs hourly, marks sessions where `created_at < now() - 24 hours` as `abandoned`

---

## Decision 10: Separate `ai_agent_messages` Table (Not Reuse `inquiry_messages`)

### Options Considered

**A. Reuse `inquiry_messages`**: Store agent messages in the existing table.

**B. Separate `ai_agent_messages`**: New table for agent conversations.

### Decision

**Separate table (Option B)**

### Rationale

1. **Schema mismatch**: `inquiry_messages` has fields like `status` (completed/generating/failed) that don't apply to user messages. It also lacks `tool_name` and `tool_call_id` needed for agent tool execution.

2. **Semantics**: `inquiry_messages` appears designed for human-written notes and responses on inquiries, not AI chat transcripts. The role enum (`user | assistant | system`) is ambiguous — is "user" the customer or the business owner?

3. **Volume**: Agent conversations can be 20-50 messages. Mixing these with human notes makes the inquiry notes UI noisy.

4. **Lifecycle**: Agent messages belong to sessions, which may or may not produce an inquiry. They shouldn't require an inquiry to exist.

5. **Future**: If we add multi-channel (email, WhatsApp), those messages might also need separate tables. Better to establish a pattern now.

### Consequences

- **Positive**: Clear separation; schema fits use case; no confusion
- **Negative**: One more table (acceptable; they serve different purposes)
- **Future**: May want to unify all messages into a polymorphic `messages` table with `message_type` and `parent_type`/`parent_id` (V3+)

---

## Summary of Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Data model | Session-first | Sessions are ephemeral; inquiries are actionable records |
| Customer entity | None in V1 | Defer to later; not blocking for agent |
| Agent architecture | Tool-based | Accuracy, auditability, security |
| Code reuse | Use existing services | Single source of truth; consistency |
| Authentication | Session token in body | Secure tenant isolation |
| Autonomy | Fully autonomous | High value; low risk for inquiry creation |
| Agent loop | Vercel AI SDK `streamText` | Already integrated; mature tooling |
| Configuration | Hardcoded prompt + minimal config | Fast to ship; opinionated quality |
| Session expiry | 24 hours | Natural boundaries; bounded storage |
| Message storage | Separate `ai_agent_messages` | Schema fit; clear semantics |

---

## Risks and Open Questions

### Risks

1. **Token costs**: Mitigated by `maxSteps`, usage tracking, model fallback
2. **Inquiry quality**: Mitigated by required fields, structured state, human handoff
3. **Prompt injection**: Mitigated by input sanitization, output filtering, tool-level authorization
4. **Infinite loops**: Mitigated by `maxSteps: 5`, 30s timeout

### Open Questions (Resolve Before Implementation)

1. Should `/b/[slug]` show both form and agent options, or have separate routes?
2. Should agent branding ("Powered by Requo AI") be visible? Plan-gated?
3. On handoff, always create partial inquiry, or only if name+contact provided?
4. Session resumption: auto-resume silently or show "Resume" button?
5. Mobile-first or desktop-first for UI polish priority?
6. How much technical detail in user-facing error messages?
7. Should we seed a demo agent config for testing?
8. Agent enable/disable: settings page toggle or admin-controlled feature flag?

---

## References

- [Vercel AI SDK 6.0 Documentation](https://sdk.vercel.ai/docs)
- [Requo Architecture](./requo-architecture.md)
- [CONTEXT.md](../CONTEXT.md) — Domain model
- [AI Agent Implementation Plan](./ai-agent-implementation-plan.md) — Full technical spec

---

## Revision History

- **2026-09-01**: Initial version (all decisions proposed)
