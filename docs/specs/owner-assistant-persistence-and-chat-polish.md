# Spec: Owner Assistant Session Persistence & Dual-Chat Polish

## Problem Statement

The Requo application has two AI chat systems serving different users:
1. **AI Agent** (customer-facing): Public chat for prospective customers to ask questions and create inquiries
2. **Owner Assistant** (business owner-facing): Authenticated chat for business owners to search data, analyze metrics, and execute operations

The Owner Assistant was initially implemented with browser-memory-only sessions (ephemeral), but the intended behavior is database persistence to support:
- Cross-device session access
- Conversation history after refresh
- Multi-session management (recent conversations list)
- Audit trail for operations performed via assistant

Additionally, both chat systems need polish to ensure:
- Consistent terminology and architecture
- Cross-business data isolation (security critical)
- Graceful error handling and degradation
- Clear lifecycle boundaries (when sessions end, how handoffs work, what happens after inquiry creation)

The domain model documentation (`CONTEXT.md`) incorrectly stated sessions were ephemeral, creating a mismatch between docs and intended implementation.

## Solution

Implement database persistence for Owner Assistant sessions, align architecture between both chat systems where appropriate, and polish critical gaps in security, UX, and error handling.

**Core changes**:
1. Database schema for `owner_assistant_sessions` and `owner_assistant_messages`
2. Session service layer for persistence operations
3. Integration of persistence in orchestrator and UI components
4. Cross-business isolation enforcement and testing
5. Customer agent lifecycle improvements (handoff flow, post-inquiry behavior)
6. Owner assistant tool confirmation for high-risk operations
7. Plan-aware system prompts (don't suggest locked features)
8. Usage budget monitoring and warnings

Both chat systems remain architecturally distinct:
- **Customer agent**: Token-based auth, creates inquiries, public-facing, sessions expire 24h
- **Owner assistant**: Better Auth sessions, operates on existing data, authenticated-only, persistent history

Both share AI infrastructure (model router, usage limiter, token logging, cache layers) and draw from the same per-business AI budget.

## User Stories

### Owner Assistant - Session Persistence

1. As a business owner, I want my assistant conversations to persist after page refresh, so that I don't lose context mid-task
2. As a business owner, I want to resume a conversation from another device, so that I can continue work from my phone or tablet
3. As a business owner, I want to see a list of my recent assistant conversations, so that I can return to previous research or tasks
4. As a business owner, I want the assistant to remember entities I mentioned (inquiry IDs, quote IDs, customer names), so that follow-up questions are natural
5. As a business owner, I want conversation history to be business-scoped, so that switching businesses shows the correct conversations
6. As a system administrator, I want owner assistant sessions stored in the database, so that we have an audit trail of operations performed via AI

### Owner Assistant - Tool Safety

7. As a business owner, I want to confirm high-risk operations (sending quotes, marking inquiries won/lost), so that I don't accidentally take irreversible actions
8. As a business owner, I want the assistant to only suggest features available on my plan, so that I'm not frustrated by locked capabilities
9. As a business owner on the Free plan, I want clear upgrade prompts when I request analytics, so that I understand my options
10. As a business owner, I want tool errors to show actionable guidance (retry, manual alternative, contact support), so that I'm not blocked by temporary failures

### Customer Agent - Lifecycle Management

11. As a prospective customer, I want the chat to clearly indicate when my inquiry has been submitted, so that I know the business received my request
12. As a prospective customer, I want to create multiple inquiries in one conversation, so that I can ask about several different projects
13. As a prospective customer, I want the conversation to end gracefully when I request human contact, so that I'm not left wondering what happens next
14. As a prospective customer, I want my inquiry details pre-filled on the form if I switch from chat, so that I don't repeat myself
15. As a business owner, I want inquiries from human handoff flagged with "Needs Attention", so that I know the AI couldn't help

### Security & Isolation

16. As a business owner, I want my assistant sessions isolated from other businesses, so that I can't accidentally see or modify another business's data
17. As a prospective customer, I want my chat session isolated to one business, so that my information isn't leaked cross-tenant
18. As a system administrator, I want every tool to independently verify business scope, so that LLM prompt injection can't bypass authorization
19. As a system administrator, I want session tokens to be cryptographically random and rate-limited, so that enumeration attacks are prevented
20. As a system administrator, I want customer agent sessions to expire after 24 hours, so that abandoned sessions don't accumulate

### Usage & Budget Management

21. As a business owner, I want to see how much AI budget I've used this month, so that I can plan my usage
22. As a business owner, I want a warning when I've used 80% of my AI budget, so that I'm not surprised when it runs out
23. As a prospective customer, I want a clear message if the business's AI budget is exhausted, so that I know to use the form instead
24. As a business owner, I want existing customer chats to finish gracefully even if quota is hit mid-conversation, so that customers aren't abruptly cut off

### Error Handling & Resilience

25. As a business owner, I want database timeouts to show a retry prompt, so that temporary failures don't force me to restart my task
26. As a business owner, I want partial tool failures to preserve what succeeded, so that I don't lose progress
27. As a prospective customer, I want inquiry creation validation errors explained in natural language, so that I know what to fix
28. As a business owner, I want the assistant to suggest alternatives when a service is unavailable, so that I can still make progress

### Content Safety

29. As a business owner, I want tool results sanitized before the assistant sees them, so that malicious database content can't manipulate the AI
30. As a system administrator, I want customer input and owner input sanitized equally, so that authenticated users can't exploit prompt injection
31. As a business owner, I want the assistant to decline abusive requests politely, so that the product maintains professional standards

### UX Polish

32. As a business owner, I want clean assistant URLs without nested `/chat/` paths, so that links are simple and shareable
33. As a prospective customer, I want the chat input disabled after handoff, so that I know the conversation has ended
34. As a business owner, I want streaming responses to cancel gracefully if I send a new message, so that the UI doesn't get stuck
35. As a business owner, I want an empty state with example prompts, so that I know what the assistant can do

## Implementation Decisions

### Database Schema

**New tables** (already created in migration `0018_owner_assistant_sessions.sql`):
- `owner_assistant_sessions`: Session metadata, business/user scoping, state JSONB (lastMentioned entities), timestamps
- `owner_assistant_messages`: Individual messages with role, content, tool metadata, AI model/provider tracking

**Key design choices**:
- Reuse `ai_agent_message_role` enum (values are conceptually identical: user, assistant, tool, system)
- Foreign keys to `businesses` and `user` with CASCADE delete (session lifecycle tied to business/user lifecycle)
- Indexes on `business_id + user_id` (list user's sessions), `last_message_at` (recent sessions query)
- State stored as JSONB for flexibility (lastMentioned entities evolve without schema changes)

**No changes to customer agent schema** (`ai_agent_sessions`, `ai_agent_messages`, `ai_agent_runs` remain unchanged).

### Session Service Layer

**New module**: `features/owner-assistant/session-service.ts`

Interface (exported functions):
- `loadOrCreateSession()`: Given sessionId (optional), load existing or create new session. Returns full session with message history (last 50 messages).
- `addMessage()`: Persist a message, update session's `last_message_at` timestamp.
- `updateSessionState()`: Update state JSONB (e.g., record lastMentioned inquiry after tool execution).
- `listRecentSessions()`: Query recent sessions for a user in a business (for future "conversation history" UI).

**Authorization model**: Session service receives pre-validated `businessId` and `userId` from caller (orchestrator). Session queries filter by both (defense in depth).

**Parallel to customer agent**: Customer agent has `features/ai-agent/session-service.ts` with similar patterns (create, load, update, expire). Owner assistant follows same conventions.

### Orchestrator Integration

**Module**: `features/owner-assistant/orchestrator.ts`

**Current behavior**: Builds ephemeral session context in memory, passes messages from client.

**New behavior**:
1. Call `loadOrCreateSession()` at start (before LLM invocation)
2. Use loaded `session.messages` for conversation context (not raw client messages)
3. After LLM response, call `addMessage()` to persist assistant reply
4. After tool execution, call `updateSessionState()` to record lastMentioned entities

**Idempotency**: Client still sends full message array (for retry resilience). Server deduplicates via session loading (DB is source of truth for history, client message list is hint).

### Component Updates

**Module**: `features/owner-assistant/components/owner-assistant-chat.tsx`

**Current behavior**: Maintains messages in `useState`, loads initial prompt from `sessionStorage`, auto-sends on mount.

**New behavior**:
1. On mount, fetch session from new API route: `GET /api/ai/owner-assistant/session/[sessionId]`
2. Populate `messages` state from API response (DB source of truth)
3. Still send message array to chat API (orchestrator deduplicates, see above)
4. On successful message send, optimistically append to state (server persists in background)

**Session ID management**: Route provides sessionId via URL param or search param. If none provided, create new session ID client-side (nanoid), server creates on first message.

### API Routes

**New route**: `app/api/ai/owner-assistant/session/[sessionId]/route.ts`

- **GET**: Load session metadata + recent messages (last 50)
- **Auth**: Validate user is member of business via `getBusinessActionContext()`
- **Authorization**: Query filters by `businessId + userId` (can't load other user's sessions, even within same business)

**Existing route** (`/api/ai/owner-assistant/chat`): No breaking changes. Still accepts `messages` array, orchestrator now ignores stale messages and uses DB state.

### Route Structure Cleanup

**Current**: `/b/[slug]/assistant/chat/[sessionId]`

**New**: `/b/[slug]/assistant?session=[sessionId]`

**Rationale**:
- Simpler URLs (sessions are internal state, not REST resources)
- Consistent with "navigation to assistant doesn't need session ID upfront" UX
- Default behavior: load latest session or create new (sessionId is optional)

**Migration path**: Move page from `app/(business)/[businessSlug]/(main)/assistant/chat/[sessionId]/page.tsx` to `app/(business)/[businessSlug]/(main)/assistant/page.tsx`. Use `searchParams.session` to resolve session.

### Customer Agent: Human Handoff Flow

**Current state**: `request_human_handoff` tool exists in tool registry but behavior is incomplete.

**Implementation**:
1. Tool creates inquiry with `needsAttention: true` flag (add to schema if missing, or store in `metadata` JSONB)
2. Tool sets `session.status = "human_handoff"` and `completedAt = now()`
3. Assistant responds: "I've created an inquiry for our team. Someone will contact you soon at [email]."
4. Client UI: Disable input field after handoff message, show "Conversation ended" badge

**Triggers** (from CONTEXT.md):
- Customer explicitly requests human ("I want to speak to a person")
- Agent can't answer after 2 knowledge search attempts
- Customer expresses frustration (detected via LLM)
- Pricing question not in knowledge base
- Service request outside business offerings

**Business inbox**: Inquiry appears with "Needs Attention" badge (via `needsAttention` flag or status filter).

### Customer Agent: Post-Inquiry Behavior

**Decision**: Allow multiple inquiries per session.

**Rationale**: Customer may say "I have another project..." after first inquiry created. Session tracks `lastCreatedInquiryId` in state for follow-ups.

**Implementation**: After `create_inquiry` tool succeeds:
1. Update session state: `state.lastCreatedInquiryId = inquiryId`
2. Assistant confirms: "I've created inquiry #[id]. Is there anything else I can help with?"
3. Session remains `active`, no auto-close
4. If customer says "no thanks", assistant can optionally call `completeSession()` (graceful end)

**Alternative considered**: Auto-close after inquiry (status → `completed`). Rejected because it forces customers to start over for multi-project scenarios.

### Owner Assistant: Tool Confirmation

**High-risk tools** (from CONTEXT.md):
- `send_quote`: Triggers email delivery, customer notification
- `update_inquiry_status` (to `won`/`lost`): May trigger downstream automation
- `schedule_follow_up`: Creates commitments, notifications

**Implementation**:
1. Tools metadata includes `requiresConfirmation: boolean` flag
2. On tool invocation, if `requiresConfirmation && !userConfirmed`, return:
   ```typescript
   {
     type: "confirmation_required",
     confirmationId: nanoid(),
     operation: "send_quote",
     parameters: { quoteId: "123", ... },
     confirmationPrompt: "Send Quote #123 to john@example.com?"
   }
   ```
3. UI renders confirmation card: "Cancel" / "Confirm" buttons
4. On confirm, client sends follow-up message with hidden system instruction:
   ```typescript
   { role: "system", content: "USER_CONFIRMED:confirmationId" }
   ```
5. Orchestrator detects confirmation, bypasses tool guard, executes operation

**Confirmation state**: Stored in session state temporarily (cleared after execution or timeout).

### Plan-Aware System Prompts

**Current**: Owner assistant may suggest features unavailable on user's plan (e.g., "Let me pull conversion analytics" to Free user).

**New**: System prompt generation filters tools by plan entitlements.

**Implementation** (in `features/owner-assistant/prompts/system-prompt.ts`):
```typescript
const availableTools = Object.keys(ownerAssistantTools).filter(toolName => {
  const tool = ownerAssistantTools[toolName];
  if (!tool.requiredFeature) return true; // Always available
  return hasFeatureAccess(plan, tool.requiredFeature);
});

const systemPrompt = `
Available tools: ${availableTools.join(", ")}
${plan === "free" ? "Note: This business is on Free plan. Analytics require Pro." : ""}
...
`;
```

**Defense in depth**: Tools still enforce plan checks (don't trust LLM won't hallucinate unavailable tools). Assistant just won't proactively suggest them.

### Cross-Business Isolation

**Enforcement points**:
1. **Session service**: Queries filter by `businessId + userId` (can't load cross-business sessions)
2. **Tools**: Each tool re-validates business scope via `getBusinessActionContext()` (don't trust orchestrator-provided context)
3. **API routes**: Both `/chat` and `/session/[id]` validate business membership before proceeding

**Customer agent**: Session token resolves to `businessId` via DB lookup. All queries scoped to that business.

**RLS policies**: Existing row-level security policies on `ai_agent_sessions` and `ai_agent_messages` already enforce tenant isolation. New tables (`owner_assistant_*`) need RLS policies added (separate migration or included in `0018`).

**Testing**: Integration tests must include "attack scenarios" (attempt to access other business's data with manipulated tokens/params).

### Session Token Security (Customer Agent)

**Requirements** (from checklist):
- Tokens: Cryptographically random (nanoid 32+ chars)
- Creation: Rate-limited by IP (prevent enumeration)
- Expiry: 24h of inactivity (cleanup job marks `abandoned`)
- Opaque: No sensitive data in token (just DB lookup key)

**Current implementation audit needed**:
- Verify token generation in `features/ai-agent/session-service.ts`
- Verify rate limiting in `app/api/ai/agent/chat/route.ts`
- Verify expiry job exists (Inngest cron or similar)

**Cross-device**: Same token works across devices (customer can copy/paste or use query param link). Acceptable for V1.

### Usage Budget Monitoring

**Per-business quota** (shared across customer agent + owner assistant):
- Tracked via `lib/ai/usage-limiter.ts` (existing)
- `checkUsageLimit()` called before LLM invocation in both orchestrators

**New UI components**:
- Owner assistant page header: Show "X% of AI budget used" badge (if >50%)
- Settings page: Full usage breakdown (customer chats vs owner chats, tokens consumed)
- Warning banner: "80% of AI budget used this month" (shown in assistant, dismissible)

**Graceful degradation**:
- Customer agent: If quota exceeded, show "Chat unavailable, please use form" instead of chat interface
- Owner assistant: If quota exceeded mid-conversation, allow current turn to finish, then show "Quota exhausted" error on next message

**Quota check timing**: Check at request start (before expensive LLM call), not after (avoids wasted spend).

### Content Safety & Sanitization

**Existing infrastructure** (reuse):
- `lib/ai/input-sanitizer.ts`: Strips control characters, limits length, detects prompt injection patterns
- `lib/ai/output-filter.ts`: Removes exposed system prompts, redacts sensitive patterns

**Gaps to address**:
1. **Tool result sanitization**: Database content → tool result → LLM. Malicious inquiry details could contain prompt injection. Add sanitization in tool executor before LLM sees result.
2. **Symmetric input handling**: Owner input sanitized equally to customer input (both are untrusted).
3. **Content policy in system prompt**: "If user is abusive or asks harmful things, politely decline and suggest email contact."

**Implementation**: Add sanitization call in orchestrator after tool execution, before LLM processes tool result.

### Error Handling Patterns

**Failure modes** (from checklist):

| Scenario | Behavior |
|----------|----------|
| DB query timeout (owner assistant) | Return error result: `{ type: "error", error: "INTERNAL_ERROR", message: "Service temporarily unavailable, please refresh", retryable: true }` |
| `create_inquiry` validation fails | Agent: "I'm missing required info: [field]. Can you provide that?" (parse validation error, explain naturally) |
| `send_quote` email fails | Agent: "Quote #123 created but email failed. You can send manually from quote page or try again." (partial success acknowledged) |
| Rate limit hit (customer) | 429 response: "This conversation has reached its limit. Please use the form." (graceful exit) |
| Session not found (load by ID) | Create new session (graceful recovery, don't error) |
| AI service unavailable | "AI service temporarily down. Try again in a moment or use traditional form." (show fallback link) |

**Principle**: Errors include actionable next steps (retry, manual alternative, contact support) rather than generic "something went wrong."

### Streaming Interruption Handling

**Client-side** (in both chat components):
- Use `AbortController` to cancel active fetch when new message sent
- On abort, save partial assistant message (optional: show "...[interrupted]" in UI)
- On server crash mid-stream, show "Connection lost" error with retry button

**Server-side**: Streaming endpoints handle abort naturally (connection closes, stream ends). No special handling needed unless you want to mark partial messages in DB.

### Testing Strategy (see Testing Decisions section)

All integration tests follow pattern from `tests/integration/ai-agent-*.test.ts`:
- Use `testDb` (mocked Postgres)
- `WorkflowFixture` for business/user/inquiry/quote setup
- Test service layer functions directly (not HTTP routes)
- Test cross-business isolation explicitly (attack scenarios)

## Testing Decisions

### What Makes a Good Test

**Test external behavior, not implementation details**:
- ✅ "Session persisted with correct business_id and user_id"
- ✅ "Cannot load another business's session"
- ✅ "Tool result sanitized before LLM sees it"
- ❌ "orchestrator.ts calls loadOrCreateSession on line 42"
- ❌ "State stored in JSONB column" (implementation, not behavior)

**Test the seams, not the internals**:
- Service layer functions (`loadOrCreateSession`, `addMessage`, tool executors)
- Authorization boundaries (cross-business queries should fail)
- Data transformations (session state → system prompt, tool result → sanitized output)

### Modules to Test

**New integration tests** (in `tests/integration/`):

1. **`owner-assistant-session-lifecycle.test.ts`**:
   - Create session, add messages, load by ID, update state, list recent
   - Parallel to existing `ai-agent-session-lifecycle.test.ts`
   
2. **`owner-assistant-tenant-isolation.test.ts`**:
   - User from Business A cannot load Business B's session
   - Session query filtered by businessId + userId
   - Parallel to existing `ai-agent-tenant-isolation.test.ts`

3. **`owner-assistant-tool-authorization.test.ts`**:
   - Plan-gated tools return upgrade prompt for insufficient plans
   - Cross-business tool calls rejected (even if orchestrator provides wrong context)
   - High-risk tools require confirmation

4. **`customer-agent-handoff-flow.test.ts`**:
   - `request_human_handoff` tool creates inquiry with `needsAttention: true`
   - Session transitions to `human_handoff` status
   - Inquiry appears in business inbox with flag

5. **`customer-agent-multi-inquiry.test.ts`**:
   - Single session can create multiple inquiries
   - `lastCreatedInquiryId` tracked in session state
   - Session remains `active` after first inquiry

**Existing tests to update**:

6. **`ai-agent-chat-route.test.ts`**:
   - Add test case: quota exceeded → graceful error message

7. **`business-plan-enforcement.test.ts`**:
   - Add owner assistant tool calls for Pro/Business features on Free plan

### Prior Art

**Session lifecycle tests**: `tests/integration/ai-agent-session-lifecycle.test.ts`
- Pattern: Use `createActiveAgentSession()` helper, call service functions, assert DB state
- Reuse `WorkflowFixture` for business/user setup
- Clean up with `cleanupWorkflowFixture()`

**Tenant isolation tests**: `tests/integration/ai-agent-tenant-isolation.test.ts`
- Pattern: Create two businesses, attempt cross-business query, assert rejection
- Use service layer (not HTTP routes) for isolation tests

**Authorization tests**: `tests/integration/plan-based-authorization.test.ts`
- Pattern: Mock business plan, call gated function, assert upgrade prompt or success

**Naming convention**: `{feature}-{aspect}.test.ts` (e.g., `owner-assistant-session-lifecycle.test.ts`)

### E2E Test Updates

**Existing**: `tests/e2e/ai-agent-conversation.spec.ts` (customer agent flow)

**New**: `tests/e2e/owner-assistant-conversation.spec.ts`
- Login as business owner
- Navigate to `/b/demo/assistant`
- Send prompt: "Show me recent inquiries"
- Verify message appears in UI
- Refresh page
- Verify conversation resumed (messages still visible)
- Send follow-up prompt: "Create a quote for inquiry #123"
- Verify quote created (navigate to quote page, check exists)

**Scope**: Smoke test only (full tool coverage in integration tests). E2E verifies end-to-end flow works (auth → API → DB → UI).

## Out of Scope

The following are explicitly out of scope for this spec:

1. **Owner assistant mobile app**: Desktop/web only for V1. Mobile browser works but not optimized.
2. **Conversation branching**: No "fork conversation" or "rewind to message N" features. Linear conversations only.
3. **Multi-user collaboration on same conversation**: Sessions are per-user. No shared/team conversations.
4. **Voice input/output**: Text-only chat interface.
5. **Customer agent voice/video**: No live call escalation. Handoff creates inquiry for async follow-up.
6. **Advanced analytics on AI usage**: Basic quota tracking only. No token breakdown by tool, no cost attribution per inquiry.
7. **Tool marketplace or plugin system**: Fixed tool registry, no dynamic tool loading.
8. **Autonomous agent loops**: Owner assistant requires user confirmation for high-risk actions. No "go do X and tell me when done" autonomous mode.
9. **Customer agent proactive outreach**: Agent only responds to inbound messages, doesn't initiate conversations.
10. **Session sharing via link**: Sessions are private. No "share this conversation" URL generation.
11. **Conversation export**: No "download chat as PDF" feature (V1). Audit logs cover operations, but not full transcript export UI.
12. **Real-time collaboration indicators**: No "user is typing..." or "assistant is thinking..." shown to other team members.
13. **Session archival rules**: Sessions retained indefinitely (V1). No auto-delete after 30/60/90 days.
14. **Customer identity across sessions**: No persistent customer profiles. Each agent session is independent (unless inquiry created, then linked via inquiry ID).
15. **Tool usage quotas**: No per-tool limits (e.g., "50 quote creates per month"). Only global AI token quota.

## Further Notes

### Migration Path

**Database migration** (`0018_owner_assistant_sessions.sql`):
- Safe to run against production (creates new tables, no destructive changes)
- No downtime (doesn't touch existing tables)
- RLS policies should be added in same migration or follow-up

**Code rollout**:
1. Deploy schema migration first (tables exist, unused)
2. Deploy orchestrator + session service (writes start happening)
3. Deploy UI component updates (reads start happening)
4. Monitor logs for errors (especially cross-business isolation violations)

**Rollback plan**: Orchestrator can fall back to ephemeral sessions if DB unavailable (degrade gracefully). Set feature flag `OWNER_ASSISTANT_PERSISTENCE_ENABLED=false` to disable writes.

### Performance Considerations

**Session loading**: Loading last 50 messages per session. For long-running sessions (100+ messages), paginate or summarize older context.

**Indexes**: `last_message_at` index supports "recent conversations" query efficiently. `business_id + user_id` index supports "my sessions" query.

**Token window**: AI models have context limits (8k-128k tokens). Orchestrator may need to truncate old messages for very long sessions. Consider adding "summarize older messages" background job (V2).

### Observability

**Logging**:
- Log session creation, message count, tool executions (existing `ai_agent_runs` pattern)
- Log cross-business access attempts (security events)
- Log quota limit hits (usage monitoring)

**Metrics** (future):
- Owner assistant: Sessions created per day, messages per session, tool execution rate
- Customer agent: Conversion rate (sessions → inquiries), handoff rate, abandonment rate

**Alerts**:
- Cross-business isolation violations (security incident)
- Quota exhaustion patterns (capacity planning)
- High error rate in tool execution (service degradation)

### Terminology Alignment

All documentation now uses:
- **"Session"** (not "conversation") for both customer agent and owner assistant
- **"AI Agent"** internally, **"AI Assistant"** in customer-facing UI (marketing terminology)
- **"Owner Assistant"** internally, **"Business Assistant"** in UI (avoid "owner" in product copy)
- **"Inquiry"** (not "AI inquiry" or "chat inquiry") — inquiries from agent are just inquiries
- **"Tool"** (not "function" or "action") for LLM-invokable capabilities

### Related ADRs

**Existing**:
- `docs/architecture/adr-001-ai-agent.md`: Customer-facing agent architecture
- `docs/architecture/adr-002-ai-assistant-ux-enhancement.md`: Owner assistant UX decisions

**New ADR needed**: "ADR-003: Owner Assistant Session Persistence" documenting the ephemeral → persistent decision and trade-offs.

### Glossary Updates

`CONTEXT.md` already updated with:
- Owner Assistant Session definition (persistent, not ephemeral)
- Database tables: `owner_assistant_sessions`, `owner_assistant_messages`
- Clarified distinction: customer agent creates inquiries, owner assistant operates on existing data

No further glossary changes needed.
