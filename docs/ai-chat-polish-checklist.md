# Dual Chat Implementation Polish Checklist

## ✅ Completed

### Domain Model
- Updated `CONTEXT.md` to reflect database persistence for owner assistant sessions
- Created `owner_assistant_sessions` and `owner_assistant_messages` schema
- Aligned terminology: both systems use "session" (not mixing "conversation" and "session")
- Clear distinction: customer agent creates inquiries, owner assistant operates on existing data

### Database Schema
- Created `lib/db/schema/owner-assistant.ts` with proper relations
- Reused `ai_agent_message_role` enum (conceptually identical roles)
- Foreign keys to `businesses` and `user` with cascade deletes
- Indexes for efficient queries: business_id, user_id, last_message_at
- Migration `0018_owner_assistant_sessions.sql` ready to apply

### Service Layer
- Created `features/owner-assistant/session-service.ts` with:
  - `loadOrCreateSession()` - loads existing or creates new
  - `addMessage()` - persists message + updates session timestamp
  - `updateSessionState()` - updates lastMentioned entities
  - `listRecentSessions()` - retrieves conversation history

---

## 🔨 TODO: Critical Polish Items

### 1. Integrate Session Persistence in Orchestrator

**Current state**: `features/owner-assistant/orchestrator.ts` builds ephemeral session context in memory.

**Required changes**:
```typescript
// In runOwnerAssistant():
// 1. Load or create session via session-service
const session = await loadOrCreateSession({
  businessId,
  userId,
  userRole,
  plan,
  sessionId: conversationId, // comes from API request
});

// 2. Use session.messages instead of the raw messages param
const systemPrompt = generateSystemPrompt(toolContext);

// 3. After LLM responds, persist assistant message
await addMessage({
  sessionId: session.sessionId,
  role: "assistant",
  content: generatedText,
  provider: modelId.split("/")[0],
  model: modelId.split("/")[1],
});
```

**Files to modify**:
- `features/owner-assistant/orchestrator.ts`
- `features/owner-assistant/actions.ts` (if you have an action wrapper)

---

### 2. Update Component to Load Session from API

**Current state**: `OwnerAssistantChat` component maintains messages in `useState`.

**Required changes**:
```typescript
// On mount, fetch session messages from API
useEffect(() => {
  async function loadSession() {
    const response = await fetch(`/api/ai/owner-assistant/session/${sessionId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    setMessages(data.messages || []);
  }
  loadSession();
}, [sessionId]);
```

**New API route needed**:
- `app/api/ai/owner-assistant/session/[sessionId]/route.ts`
- GET: Returns session + messages
- Auth: Validate user is member of business

---

### 3. Fix Route Structure

**Current issue**: URL is `/b/[slug]/assistant/chat/[sessionId]` which is confusing (nested `/chat` in path).

**Recommended change**:
```
Before: /b/demo/assistant/chat/oas_abc123
After:  /b/demo/assistant?session=oas_abc123
```

**Implementation**:
- Move page to `app/(business)/[businessSlug]/(main)/assistant/page.tsx`
- Delete `/chat/[sessionId]/` directory
- Use `searchParams.session` to resolve session ID
- Default to "latest session" or "new session" if no query param

**Benefits**:
- Cleaner URLs
- Consistent with "sessions are internal state" principle
- Easier to link ("open assistant" doesn't need to know session ID upfront)

---

### 4. Customer Agent: Implement Human Handoff Flow

**Current state**: `request_human_handoff` tool exists but behavior is undefined.

**Required**:
```typescript
// In create_inquiry tool (or separate handoff tool):
if (session.status === "human_handoff") {
  // Create inquiry with needsAttention flag
  const inquiry = await createInquirySubmission({
    ...inquiryData,
    needsAttention: true, // Add to schema if missing
    aiHandoffReason: "customer_requested" | "agent_unable_to_help",
  });
  
  // Transition session to completed
  await updateSessionMetadata(sessionId, { 
    status: "human_handoff",
    completedAt: new Date()
  });
  
  return {
    message: `I've created an inquiry for our team (#${inquiry.id}). Someone will contact you soon at ${customerEmail}.`,
    sessionEnded: true,
  };
}
```

**UI behavior**:
- After handoff message, disable input field
- Show "Conversation ended" badge
- Optionally: show "Start new conversation" button

---

### 5. Customer Agent: Post-Inquiry-Creation Behavior

**Current state**: After `create_inquiry` tool succeeds, session continues.

**Decision needed**:
- **Option A**: Session auto-closes after 1 turn (agent says "Inquiry created, is there anything else?" → user says "No" → session `completed`)
- **Option B**: Session stays active, allows multiple inquiries (user can say "I have another project...")
- **Option C**: Session closes immediately after inquiry created

**Recommended**: Option B (allow multiple inquiries per session). Update `create_inquiry` tool to track `lastCreatedInquiryId` in session state.

---

### 6. Owner Assistant: Implement Tool Confirmation

**Current state**: Tools execute immediately, no confirmation for high-risk operations.

**Required**:
```typescript
// In tools/index.ts, mark high-risk tools:
const sendQuoteTool = {
  name: "send_quote",
  requiresConfirmation: true,
  // ...
};

// In orchestrator or tool executor:
if (tool.requiresConfirmation && !userConfirmed) {
  return {
    type: "confirmation_required",
    confirmationId: nanoid(),
    operation: "send_quote",
    parameters: toolParams,
    confirmationPrompt: "Send Quote #123 to john@example.com?",
  };
}
```

**UI changes** (in `OwnerAssistantChat`):
- Render confirmation card when `type === "confirmation_required"`
- Show "Cancel" / "Confirm" buttons
- On confirm, send follow-up message with hidden system instruction

---

### 7. Session Token Security (Customer Agent)

**Current implementation**: Needs audit.

**Verify**:
- [ ] Tokens are cryptographically random (nanoid 32+ chars)
- [ ] Token creation is rate-limited by IP
- [ ] Sessions expire after 24h of inactivity
- [ ] No sensitive data in token (opaque reference only)
- [ ] Session resolution query includes business ownership check

**Test**:
- Attempt token enumeration (brute force)
- Attempt cross-business access (Business A token → Business B session)

---

### 8. Cross-Business Isolation Tests

**Required integration tests**:

```typescript
describe("Owner Assistant - Cross-Business Isolation", () => {
  it("cannot access another business's session", async () => {
    const businessA = await createTestBusiness();
    const businessB = await createTestBusiness();
    const userA = await createTestUser();
    
    const sessionA = await createOwnerAssistantSession({ 
      businessId: businessA.id, 
      userId: userA.id 
    });
    
    // Attempt to access sessionA from businessB context
    const result = await loadOrCreateSession({
      businessId: businessB.id,
      userId: userA.id,
      sessionId: sessionA.id,
    });
    
    // Should create NEW session, not return sessionA
    expect(result.sessionId).not.toBe(sessionA.id);
  });
});
```

**Similarly for customer agent**:
- Token from Business A cannot access Business B's sessions
- Tools independently verify business scope (don't trust orchestrator alone)

---

### 9. Message Streaming Interruption Handling

**Current state**: Needs graceful handling of connection loss.

**Client-side** (`ChatInterface`, `OwnerAssistantChat`):
```typescript
const abortController = useRef(new AbortController());

// In handleSend():
const response = await fetch("/api/ai/owner-assistant/chat", {
  method: "POST",
  body: JSON.stringify({ ... }),
  signal: abortController.current.signal,
});

// On user sending new message mid-stream:
if (isStreaming) {
  abortController.current.abort();
  abortController.current = new AbortController();
  // Save partial message (if you want to keep it)
}
```

**Server-side**: Streaming responses handle abort naturally (connection closes, stream ends). No special handling needed unless you want to mark partial messages in DB.

---

### 10. Plan-Aware System Prompt (Owner Assistant)

**Current state**: Owner assistant may suggest unavailable features.

**Required**: Inject plan entitlements into system prompt.

```typescript
// In generateSystemPrompt():
const availableTools = Object.keys(ownerAssistantTools).filter(toolName => {
  const tool = ownerAssistantTools[toolName];
  if (!tool.requiredFeature) return true;
  return hasFeatureAccess(plan, tool.requiredFeature);
});

const systemPrompt = `
You are the business assistant for ${businessName}.

Your available tools: ${availableTools.join(", ")}

${plan === "free" ? "Note: This business is on the Free plan. Conversion analytics and workflow analytics require an upgrade." : ""}
...
`;
```

**Benefits**:
- Assistant won't suggest "Let me pull conversion analytics..." to free users
- Tools still enforce (defense in depth)
- Better UX (no false promises)

---

### 11. AI Usage Budget Monitoring

**Current state**: Both chats draw from same business budget (correct).

**Polish items**:
- [ ] Add usage warning UI: "80% of AI budget used this month"
- [ ] Graceful degradation: new customer sessions show "Chat unavailable" banner if quota exceeded
- [ ] Owner sessions show quota status in UI (settings or assistant page header)

**Implementation**:
```typescript
// In orchestrator before running LLM:
const quotaResult = await checkUsageLimit({ businessId, taskType, plan });

if (!quotaResult.allowed) {
  if (isCustomerAgent) {
    return "I'm sorry, this business has reached its AI usage limit. Please use the inquiry form.";
  } else {
    throw new Error(`QUOTA_EXCEEDED: ${quotaResult.message}`);
  }
}
```

---

### 12. Content Safety & Sanitization

**Current state**: `input-sanitizer` and `output-filter` exist.

**Verify**:
- [ ] Both customer and owner input sanitized equally
- [ ] Tool results sanitized before LLM sees them (malicious DB data → tool → LLM)
- [ ] Content policy in system prompt (handle abusive users gracefully)

**Add to system prompt**:
```
If the user is abusive, profane, or asks you to do something harmful, politely decline and suggest contacting support via email.
```

---

### 13. Database Migration

**Before deploying**:
```bash
# Local
npm run db:migrate

# Verify tables created
npm run db:studio

# Check for owner_assistant_sessions and owner_assistant_messages
```

**Seed demo data** (optional, for testing):
```typescript
// In scripts/seed.ts:
await db.insert(ownerAssistantSessions).values({
  id: "oas_demo_session",
  businessId: demoBusiness.id,
  userId: demoOwner.id,
  state: { lastMentioned: {} },
  // ...
});
```

---

### 14. Error Handling & User Feedback

**Scenarios to cover**:

| Scenario | Current Behavior | Required Behavior |
|----------|------------------|-------------------|
| DB query timeout (owner assistant) | 500 error | "Service temporarily unavailable, please refresh" |
| create_inquiry fails validation | Unknown | Agent: "I'm missing some required info: [field]. Can you provide that?" |
| send_quote email fails | Unknown | Agent: "Quote created but email failed. You can send it manually from the quote page." |
| Rate limit hit (customer) | 429 | "This conversation has reached its limit. Please use the form or contact us." |
| Session not found | Unknown | Create new session (graceful recovery) |

---

### 15. AGENTS.md & README.md Updates

**Already done**:
- ✅ Updated `CONTEXT.md` with persistence model
- ✅ Created schema and migration
- ✅ Updated AGENTS.md to list owner-assistant schema module

**Still needed**:
- [ ] Update `docs/architecture/adr-002-ai-assistant-ux-enhancement.md` (or create new ADR if this wasn't recorded)
- [ ] Update `README.md` if it mentions assistant features
- [ ] Update `features/owner-assistant/README.md` (if it exists) with session persistence

---

## 📋 Verification Plan

### Pre-deployment checklist

**Database**:
- [ ] Run migration on local DB
- [ ] Verify tables created with correct indexes
- [ ] Test foreign key cascades (delete business → sessions deleted)

**Unit tests**:
- [ ] Session service: load, create, add message, update state
- [ ] Tool authorization: verify plan-gating and permission checks

**Integration tests**:
- [ ] Customer agent: session creation, message persistence, inquiry creation
- [ ] Owner assistant: session resume, cross-business isolation, tool execution
- [ ] Auth: unauthorized access rejected, removed member cannot access session

**E2E tests**:
- [ ] Customer: start chat, send messages, create inquiry, verify DB persistence
- [ ] Owner: open assistant, send prompt, verify session created, close and resume

**Manual testing**:
- [ ] Customer chat: full inquiry creation flow
- [ ] Owner chat: search inquiries, create quote, handle plan-gated tool
- [ ] Refresh mid-conversation: verify session resumes correctly
- [ ] Multiple tabs: verify independent or shared state (document the behavior)

---

## 🎯 Priority Order

### Must-have before production:
1. ✅ Database schema created
2. ⚠️ Session persistence integrated in orchestrator (#1)
3. ⚠️ Component loads session from DB (#2)
4. ⚠️ Cross-business isolation tests (#8)
5. ⚠️ Session token security audit (#7)
6. ⚠️ Error handling (#14)

### Should-have for good UX:
7. Route structure cleanup (#3)
8. Human handoff flow (#4)
9. Tool confirmation UI (#6)
10. Plan-aware prompts (#10)
11. Usage budget monitoring (#11)

### Nice-to-have polish:
12. Content safety verification (#12)
13. Post-inquiry behavior decision (#5)
14. Streaming interruption handling (#9)
15. Documentation updates (#15)

---

## 🚀 Next Steps

Run this to get started:
```bash
# 1. Apply migration
npm run db:migrate

# 2. Verify schema
npm run db:studio

# 3. Update orchestrator to use session-service
# Edit: features/owner-assistant/orchestrator.ts

# 4. Create session load API route
# Create: app/api/ai/owner-assistant/session/[sessionId]/route.ts

# 5. Update component to load from DB
# Edit: features/owner-assistant/components/owner-assistant-chat.tsx

# 6. Run checks
npm run check
npm run test
npm run test:integration

# 7. Test manually
npm run dev:app
```

---

## 📖 Related Files Modified

- ✅ `CONTEXT.md` - Updated domain model
- ✅ `AGENTS.md` - Added owner-assistant schema module
- ✅ `lib/db/schema/owner-assistant.ts` - Created
- ✅ `lib/db/schema/index.ts` - Added export
- ✅ `features/owner-assistant/types.ts` - Updated session interface
- ✅ `features/owner-assistant/session-service.ts` - Created
- ✅ `drizzle/0018_owner_assistant_sessions.sql` - Created

**Files to modify** (based on checklist above):
- `features/owner-assistant/orchestrator.ts`
- `features/owner-assistant/components/owner-assistant-chat.tsx`
- `app/(business)/[businessSlug]/(main)/assistant/chat/[sessionId]/page.tsx` (move to `/assistant/page.tsx`)
- `app/api/ai/owner-assistant/session/[sessionId]/route.ts` (create)
- `features/ai-agent/orchestrator.ts` (handoff flow)
- `features/ai-agent/components/chat-interface.tsx` (handoff UI)
- `features/owner-assistant/tools/index.ts` (confirmation metadata)
