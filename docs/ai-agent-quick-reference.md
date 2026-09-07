# AI Agent Implementation — Quick Reference

## What We're Building

A conversational AI that collects inquiry information through natural chat, then creates a standard Requo inquiry using the existing `createInquirySubmission()` service.

**Customer flow**: Visit `/b/[slug]/chat` → Chat with agent → Agent collects info → Inquiry created → Appears in dashboard

**NOT building**: Quote generation, follow-ups, email automation, approval workflows (those are V2+)

---

## Architecture at a Glance

```
Customer message
  ↓
API /api/ai/agent/chat (session token auth)
  ↓
runAgent() orchestrator
  ↓
streamText() with tools (Vercel AI SDK 6.0)
  ↓ ↓ ↓
Tools: search_knowledge, get_business_info, create_inquiry, request_human_handoff
  ↓
Existing services: searchBusinessMemories(), createInquirySubmission()
  ↓
Database: ai_agent_sessions, ai_agent_messages, inquiries
```

---

## New Database Tables

| Table | Purpose |
|-------|---------|
| `ai_agent_sessions` | Conversation containers; link to business, track status, store qualification state |
| `ai_agent_messages` | Chat transcripts (user, assistant, tool messages) |
| `ai_agent_runs` | Telemetry per agent execution (tokens, cost, latency) |

**Business table addition**: `ai_agent_enabled BOOLEAN`, `ai_agent_config JSONB`

---

## Key Design Decisions

### 1. Session-First Model
Conversations live in sessions until qualified, then create an inquiry. The existing `inquiry_messages` table stays for human notes.

### 2. No Customer Entity
Customer info is denormalized on inquiries (no separate customers table in V1).

### 3. Tool-Based Architecture
Agent uses tools to:
- Search knowledge (reuses existing RAG)
- Get business info (public only)
- Create inquiry (reuses existing service)
- Request human handoff

### 4. Tenant Isolation
Session token → session record → businessId. All queries scoped by business. Tools NEVER trust LLM-provided IDs.

### 5. Autonomous V1
No approval workflows in MVP. Agent creates inquiries automatically.

---

## Critical Integration Points

**DO use existing services:**
- ✅ `createInquirySubmission()` for inquiry creation
- ✅ `searchBusinessMemories()` for RAG
- ✅ `selectModels()` for model routing
- ✅ `checkPublicActionRateLimit()` for rate limiting
- ✅ `logAiInvocation()` / `computeEstimatedCostCents()` for telemetry

**DO NOT duplicate:**
- ❌ Inquiry creation logic
- ❌ RAG implementation
- ❌ Model selection logic
- ❌ Token cost calculation

---

## Security Boundaries

```typescript
// ✅ CORRECT: Server resolves tenant from session
const { session, business } = await getSessionByToken(publicToken);
const toolContext = { sessionId: session.id, businessId: business.id, business };

// ❌ WRONG: Never trust client or LLM for tenant context
const businessId = params.businessId;  // NO!
const businessId = llmResponse.businessId;  // NO!
```

**Rate limits:**
- Per-IP: 100 messages/hour
- Per-session: 50 messages total
- Per-business: (V2) monthly AI budget

---

## Vercel AI SDK 6.0 Pattern

```typescript
const result = await streamText({
  model: registry.languageModel(modelId),
  system: systemPrompt,
  messages: conversationHistory,
  tools: agentTools,
  toolChoice: 'auto',
  maxSteps: 5,  // Prevent infinite loops
  experimental_context: toolContext,  // Server-side only
  onStepFinish: async (step) => {
    // Log tool calls
  },
  onFinish: async (completion) => {
    // Persist final response + telemetry
  },
});

return result.textStream;
```

**Key points:**
- No `ToolLoopAgent` (that was SDK v3)
- Use `streamText` with `tools` parameter
- `maxSteps` prevents runaway loops
- `experimental_context` passes server-side data (not in prompt)

---

## Implementation Order

1. **Database**: Migration + schema
2. **Session service**: Create, load, update, complete sessions
3. **Message service**: Persist messages
4. **Tools**: 5 tools + registry
5. **Orchestrator**: Agent loop with streaming
6. **API route**: Streaming endpoint with rate limiting
7. **UI**: Chat interface components
8. **Tests**: Unit + integration + e2e

**Estimated effort**: 72 hours (~2 weeks)

---

## Testing Strategy

**Unit**: Qualification state logic, token generation, tool parameter validation

**Integration**: 
- Session lifecycle (create → messages → complete)
- Tenant isolation (business A can't access business B)
- Inquiry creation via agent

**E2E**:
- Full conversation flow
- Agent creates inquiry
- Inquiry appears in dashboard

---

## Success Criteria

V1 is done when:
1. Customer can chat at `/b/[slug]/chat`
2. Agent searches knowledge to answer questions
3. Agent collects inquiry fields naturally
4. Agent creates inquiry via existing service
5. Inquiry appears in dashboard
6. Security tests pass (tenant isolation)
7. Traditional forms still work

---

## What's NOT in V1

- Agent configuration UI (uses hardcoded defaults)
- Quote generation
- Follow-up automation
- Email channel
- Analytics dashboard
- Approval workflows
- Multi-language

---

## Risks to Watch

| Risk | Mitigation |
|------|------------|
| Token costs | Max steps, usage tracking, model fallback |
| Prompt injection | Input sanitization, output filtering, server-side auth |
| Infinite loops | Max steps = 5, 30s timeout |
| Poor inquiry quality | Structured state, required fields, human handoff |

---

## Quick Commands

```bash
# Generate migration
npm run db:generate -- --name add_ai_agent_tables

# Apply migration
npm run db:migrate

# Run checks
npm run check
npm run test
npm run test:integration
npm run build

# Enable agent for a business
psql> UPDATE businesses SET ai_agent_enabled = true WHERE slug = 'demo';
```

---

## Files to Create

```
lib/db/schema/ai-agent.ts
features/ai-agent/
  ├── types.ts
  ├── schemas.ts
  ├── session-service.ts
  ├── message-service.ts
  ├── telemetry.ts
  ├── orchestrator.ts
  ├── actions.ts
  ├── tools/
  │   ├── index.ts
  │   ├── search-knowledge.ts
  │   ├── get-business-info.ts
  │   ├── get-services.ts
  │   ├── create-inquiry.ts
  │   └── request-human-handoff.ts
  ├── components/
  │   ├── ChatInterface.tsx
  │   ├── ChatMessage.tsx
  │   └── ChatInput.tsx
  └── jobs/
      └── expire-sessions.ts
app/api/ai/agent/chat/route.ts
app/(public)/b/[slug]/chat/page.tsx
tests/unit/ai-agent/
tests/integration/ai-agent/
tests/e2e/ai-agent/
```

---

## Contact Points

**Existing services** (reuse these):
- `features/inquiries/mutations.ts` → `createInquirySubmission()`
- `features/memory/retrieval.ts` → `searchBusinessMemories()`
- `lib/ai/router.ts` → `streamWithFallback()`
- `lib/ai/capacity-selector.ts` → `selectModels()`
- `lib/rate-limit/` → rate limiting infrastructure

**New entry points** (create these):
- `/api/ai/agent/chat` → POST streaming endpoint
- `/b/[slug]/chat` → public chat UI
- `features/ai-agent/orchestrator.ts` → agent loop

---

## Next Steps

1. Review `CONTEXT.md` and `docs/ai-agent-implementation-plan.md`
2. Confirm business requirements (see "Questions Before Implementation")
3. Create feature branch: `git checkout -b feature/ai-agent-mvp`
4. Start with Step 1: Database migration
5. Implement incrementally; test each layer before moving forward
6. Document domain terms in `CONTEXT.md` as they crystallize

---

**Golden Rule**: When in doubt, reuse existing services. The agent is a conversational interface to the existing inquiry workflow, not a parallel system.
