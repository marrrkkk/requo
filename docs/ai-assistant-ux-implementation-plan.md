# AI Assistant UX Enhancement — Implementation Plan

**Status**: Ready for implementation  
**Date**: 2026-09-01  
**Context**: Enhancement of existing AI Agent V1 into first-class "AI Assistant" product experience

---

## Executive Summary

This plan enhances Requo's existing functional AI Agent into a customer-facing "AI Assistant" with:

1. **Terminology rebrand**: "AI Agent" → "AI Assistant" in customer UI (schema unchanged)
2. **First-class navigation**: AI Assistant becomes main sidebar destination
3. **Universal inquiry hub**: Single entry point offering AI chat or form submission
4. **Owner dashboard**: Conversations list, activity feed, analytics
5. **Bidirectional form integration**: AI ↔ form state sharing via localStorage
6. **Security hardening**: RLS policies, dual rate limiting, usage quota enforcement

**Key principle**: This is an *enhancement* of working functionality, not a greenfield build. The AI Agent exists; we're improving UX, navigation, and integration.

---

## Critical Decisions (30 Total)

See [ADR 002](./architecture/adr-002-ai-assistant-ux-enhancement.md) for full decision log.

**Highlights**:
- Keep schema/code as `ai_agent_*`, only rebrand UI labels
- No customer entity (deferred to separate project)
- Add `inquiries.ai_assisted` flag for attribution (separate from `source`)
- Universal inquiry hub at `/b/{slug}/inquire` (keep existing routes for backward compat)
- Beta opt-in flag for gradual rollout
- RLS policies for defense-in-depth
- Dual rate limiting (IP + session)
- Hard usage quota enforcement

---

## Implementation Phases

### Phase 1: Audit & Security Fixes ⚠️
**Goal**: Harden existing AI Agent before expanding surface area.

**Tasks**:
- [ ] Create migration 0017 (see below)
- [ ] Enable RLS on `ai_agent_sessions`, `ai_agent_messages`, `ai_agent_runs`
- [ ] Add RLS policies for tenant isolation (business_members join)
- [ ] Audit `session-service.ts` token generation (verify crypto.randomBytes or UUID v4)
- [ ] Add per-session rate limiting (50 messages/hour) in `/api/ai/agent/chat/route.ts`
- [ ] Implement hard usage quota check in orchestrator (check before `runAgent()`)
- [ ] Add `maxSteps: 5` to `streamText()` call in `orchestrator.ts`
- [ ] Add `onStepFinish` callback for tool usage logging
- [ ] Write integration tests for rate limiting, quota enforcement, RLS

**Acceptance**: 
- ✅ All security checks pass
- ✅ Rate limiting blocks excessive requests (IP + session)
- ✅ Usage quota blocks businesses exceeding plan limits
- ✅ RLS policies prevent cross-tenant queries
- ✅ Agent loop stops at 5 steps

**Estimated effort**: 2-3 days

---

### Phase 2: Terminology & Navigation Rebrand 🎨
**Goal**: Customer-facing "AI Assistant" branding and first-class nav placement.

**Tasks**:
- [ ] Update `CONTEXT.md` with AI Agent/Assistant terminology mapping ✅ (done)
- [ ] Add "AI Assistant" item to `components/shell/dashboard-navigation.tsx`
  - Position: After Inquiries, before Forms
  - Icon: `Bot` or `MessageSquare`
  - Route: `/{businessSlug}/assistant/overview`
- [ ] Add "AI Assistant" to `components/shell/mobile-bottom-nav.tsx`
- [ ] Add AI Assistant shortcuts to command menu
- [ ] Create route structure: `app/(business)/[businessSlug]/(main)/assistant/`
  - `overview/page.tsx`
  - `conversations/page.tsx`
  - `conversations/[sessionId]/page.tsx`
  - `activity/page.tsx`
  - `settings/page.tsx`
- [ ] Move settings from `app/(business)/[businessSlug]/(main)/settings/ai-agent` to `assistant/settings`
- [ ] Add 301 redirect: `/settings/ai-agent` → `/assistant/settings`
- [ ] Find/replace customer-facing "AI Agent" → "AI Assistant" in:
  - Settings form labels
  - Public chat UI
  - Empty states
  - Help text
  - Toasts/notifications
- [ ] Keep internal code unchanged (`ai_agent_*`)

**Acceptance**:
- ✅ Dashboard nav shows "AI Assistant" between Inquiries and Forms
- ✅ Mobile nav includes AI Assistant
- ✅ Command menu has AI Assistant shortcuts
- ✅ Settings moved to `/assistant/settings`
- ✅ No customer-facing "Agent" references (except technical docs)
- ✅ Internal code unchanged

**Estimated effort**: 2 days

---

### Phase 3: Universal Inquiry Hub 🚪
**Goal**: Single entry point for AI + forms.

**Tasks**:
- [ ] Create `app/(public)/b/[slug]/inquire/page.tsx`
- [ ] Design inquiry hub UI:
  ```
  [Business Logo]
  Business Name
  How can we help?
  
  [ Chat with our AI Assistant ] ← Primary CTA
  Tell us what you need and we'll help you get started.
  
  [ Submit an inquiry ] ← Secondary (opens form selector or default form)
  Prefer to fill out a form?
  ```
- [ ] Add business context query (logo, name, description)
- [ ] Add AI enabled check (show chat option only if `ai_agent_enabled = true`)
- [ ] Add form selector logic:
  - If 1 form: direct link to that form
  - If multiple: show form picker modal/page
  - If 0 forms: show manual inquiry contact info
- [ ] Primary CTA links to `/b/{slug}/chat` (existing AI chat page)
- [ ] Add public nav link to inquiry hub
- [ ] Keep existing routes working:
  - `/b/{slug}/chat` (legacy, works forever)
  - `/inquire/{slug}` (legacy, works forever)
  - `/inquire/{slug}/{formSlug}` (direct form links)
- [ ] Mobile responsive design
- [ ] Write e2e test: `tests/e2e/inquiry-hub.spec.ts`

**Acceptance**:
- ✅ `/b/{slug}/inquire` renders correctly
- ✅ Shows "Chat with AI Assistant" if enabled
- ✅ Shows "Submit an inquiry" with appropriate form logic
- ✅ Existing routes still work
- ✅ Mobile responsive
- ✅ E2E test passes

**Estimated effort**: 2-3 days

---

### Phase 4: Owner Dashboard 📊
**Goal**: Visibility into AI Assistant activity.

**Tasks**:
- [ ] **Overview page** (`/assistant/overview`):
  - Status badge (Active/Disabled)
  - Description
  - Primary metrics: conversations count, inquiries created, handoffs
  - Quick links: View conversations, Settings
  - Empty state if disabled: "Enable AI Assistant to start helping customers"
- [ ] **Conversations list** (`/assistant/conversations`):
  - Table/list: customer name/email, status, latest message, created time
  - Filters: All, Active, Completed, Handoff, Abandoned
  - Search by customer name/email
  - Click row → conversation detail
  - Empty state: "No conversations yet. Share your inquiry link to get started."
- [ ] **Conversation detail** (`/assistant/conversations/[sessionId]`):
  - Customer info (if collected)
  - Full message transcript (user/assistant messages, not tool calls)
  - AI actions timeline (inquiry created, handoff requested, form recommended)
  - Session metadata (status, created, completed, expires)
  - Takeover actions (if status = human_handoff):
    - Show "Handed off: [reason]"
    - Link to associated inquiry
    - "Contact customer" CTA
- [ ] **Activity feed** (`/assistant/activity`):
  - Recent AI actions across all sessions:
    - "AI Assistant created inquiry #1234"
    - "AI Assistant handed conversation to [owner name]"
    - "AI Assistant recommended Website Project form"
    - "AI Assistant searched knowledge: [query]"
  - Pagination
  - Filter by action type
  - No internal reasoning/prompts exposed
- [ ] **Settings page** (`/assistant/settings`):
  - Move existing `BusinessAiAgentSettingsForm` component
  - Same functionality, new location
- [ ] Queries:
  - `getAgentConversations(businessId, filters)`
  - `getAgentConversationDetail(sessionId, businessId)`
  - `getAgentActivityFeed(businessId, limit, offset)`
- [ ] Update business tags for cache invalidation
- [ ] Write integration tests for queries
- [ ] Write e2e test for navigation flow

**Acceptance**:
- ✅ All 5 pages render correctly
- ✅ Owner can see conversations list
- ✅ Owner can read conversation transcript
- ✅ Activity feed shows AI actions
- ✅ Settings moved successfully
- ✅ Queries are tenant-scoped (RLS enforced)

**Estimated effort**: 4-5 days

---

### Phase 5: Form Integration 🔗
**Goal**: Bidirectional state sharing between AI chat and forms.

**Tasks**:
- [ ] **AI → Form prefill**:
  - When AI recommends a form, generate URL with session token: `/inquire/{slug}/{formSlug}?session={token}`
  - Form page reads `session` param
  - If present, fetch session state from localStorage: `requo-agent-session:{slug}`
  - Parse `state.values` object
  - Prefill form fields that match (name, email, service, budget, etc.)
  - Show banner: "We've filled in details from your chat. Feel free to adjust."
  - Do not expose conversation history in form (only collected field values)
- [ ] **Form → AI transition**:
  - Add "Need help?" button to inquiry forms (optional, non-blocking)
  - Opens AI chat in new tab: `/b/{slug}/chat?formProgress={base64}`
  - Chat reads `formProgress` param from URL
  - Parse into session state
  - AI understands already-filled fields (don't re-ask)
  - Show banner: "I see you started a form. I can help from here."
- [ ] **Attribution tracking**:
  - Add `ai_assisted` column to `inquiries` (migration 0017)
  - When inquiry created via `create_inquiry` tool: set `ai_assisted = true`
  - When inquiry created via form submission after AI chat: set `ai_assisted = true`
  - When inquiry created via form only: `ai_assisted = false`
  - Backfill existing data: `UPDATE inquiries SET ai_assisted = true WHERE source IN ('ai_agent', 'ai_agent_handoff', 'ai')`
- [ ] Update form submission actions to check for session context
- [ ] Update inquiry analytics to include `ai_assisted` dimension
- [ ] Write e2e tests for both directions:
  - `tests/e2e/ai-to-form-handoff.spec.ts`
  - `tests/e2e/form-to-ai-handoff.spec.ts`

**Acceptance**:
- ✅ AI → form prefills collected values
- ✅ Form → AI preserves form progress
- ✅ `ai_assisted` flag tracked correctly
- ✅ Analytics show AI involvement
- ✅ E2E tests pass both directions
- ✅ Same-device limitation documented (localStorage, not server-side)

**Estimated effort**: 3-4 days

---

### Phase 6: Hardening & Rollout 🚀
**Goal**: Production-ready quality and controlled rollout.

**Tasks**:
- [ ] **Complete test matrix** (expand to all 57 scenarios):
  - Tenant isolation (integration) ✅ exists
  - Knowledge isolation (integration) ✅ exists
  - Session token security (integration) 
  - Session token entropy (unit)
  - IP rate limiting (integration)
  - Session rate limiting (integration)
  - Usage quota (free/pro/business) (integration)
  - Max steps enforcement (unit)
  - Tool loop detection (integration) ✅ exists
  - Inquiry creation (integration) ✅ exists
  - Duplicate customer detection (integration)
  - Missing fields qualification (unit)
  - Existing fields no re-ask (unit)
  - Form recommendation (integration)
  - AI → form prefill (e2e)
  - Form → AI state (e2e)
  - Tool failure handling (integration)
  - Prompt injection defense (unit + integration)
  - Human handoff (integration) ✅ exists
  - Human takeover freeze (integration)
  - RLS enforcement (integration)
  - Model fallback (integration) ✅ exists
  - Attribution tracking (integration)
  - Public inquiry hub (e2e)
  - Legacy routes work (e2e) ✅ exists
  - Navigation AI Assistant (e2e)
  - Settings moved (e2e)
  - Beta flag behavior (integration)
  - *(Continue for remaining 29 scenarios...)*
- [ ] Write all missing tests
- [ ] Run full test suite: `npm run test:all`
- [ ] **Security review**:
  - Prompt injection attacks
  - Session token enumeration
  - Cross-tenant data leaks
  - RLS bypass attempts
  - Rate limit circumvention
  - Usage quota bypass
  - XSS in conversation display
  - CSRF in settings updates
- [ ] **Beta flag rollout**:
  - Add `ai_assistant_beta_enabled` column to `businesses` (migration 0017) ✅
  - Add beta opt-in UI in settings: "Try the new AI Assistant experience"
  - When enabled: show new nav, routes, terminology
  - When disabled: show old experience (current state)
  - Track adoption rate
  - Collect feedback
  - Fix issues
  - Gradually enable for all businesses
  - Remove flag after 100% adoption
- [ ] **Documentation**:
  - Owner help docs: "Using the AI Assistant"
  - Onboarding guide updates
  - API documentation (if public)
  - Internal architecture docs
- [ ] **Performance review**:
  - Chat latency (should be <2s p95)
  - Dashboard load times
  - Rate limit effectiveness
  - Database query performance (add indexes if needed)

**Acceptance**:
- ✅ All 57 test scenarios pass
- ✅ Security review complete with no critical issues
- ✅ Beta rollout successful (no major bugs)
- ✅ Documentation complete
- ✅ Performance acceptable
- ✅ 100% adoption achieved
- ✅ Beta flag removed

**Estimated effort**: 5-7 days

---

## Database Migration 0017

```sql
-- Migration 0017: AI Assistant UX Enhancement
-- Adds RLS, ai_assisted flag, beta rollout flag

-- ============================================================================
-- Part 1: RLS Policies for Tenant Isolation
-- ============================================================================

-- Enable RLS on AI agent tables
ALTER TABLE ai_agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_runs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access sessions from their businesses
CREATE POLICY "Users access own business agent sessions"
  ON ai_agent_sessions FOR ALL
  USING (business_id IN (
    SELECT business_id 
    FROM business_members 
    WHERE user_id = auth.uid()
  ));

-- Policy: Users can only access messages from their business sessions
CREATE POLICY "Users access own business agent messages"
  ON ai_agent_messages FOR ALL
  USING (session_id IN (
    SELECT id 
    FROM ai_agent_sessions 
    WHERE business_id IN (
      SELECT business_id 
      FROM business_members 
      WHERE user_id = auth.uid()
    )
  ));

-- Policy: Users can only access runs from their businesses
CREATE POLICY "Users access own business agent runs"
  ON ai_agent_runs FOR ALL
  USING (business_id IN (
    SELECT business_id 
    FROM business_members 
    WHERE user_id = auth.uid()
  ));

-- ============================================================================
-- Part 2: Inquiry Attribution Tracking
-- ============================================================================

-- Add ai_assisted flag to track AI involvement (separate from source)
ALTER TABLE inquiries 
  ADD COLUMN ai_assisted BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: Mark existing AI-sourced inquiries as ai_assisted
UPDATE inquiries 
  SET ai_assisted = true 
  WHERE source IN ('ai_agent', 'ai_agent_handoff', 'ai');

-- Create index for analytics queries
CREATE INDEX inquiries_ai_assisted_idx 
  ON inquiries(business_id, ai_assisted, created_at)
  WHERE ai_assisted = true;

-- ============================================================================
-- Part 3: Beta Rollout Flag
-- ============================================================================

-- Add beta flag for gradual UI rollout
ALTER TABLE businesses 
  ADD COLUMN ai_assistant_beta_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Create partial index for beta-enabled businesses
CREATE INDEX businesses_ai_assistant_beta_enabled_idx 
  ON businesses(ai_assistant_beta_enabled) 
  WHERE ai_assistant_beta_enabled = true;

-- ============================================================================
-- Part 4: Verify Core Columns (from migration 0016, add if missing)
-- ============================================================================

DO $$
BEGIN
  -- Check and add ai_agent_enabled column
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'businesses' 
      AND column_name = 'ai_agent_enabled'
  ) THEN
    ALTER TABLE businesses 
      ADD COLUMN ai_agent_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    
    CREATE INDEX businesses_ai_agent_enabled_idx 
      ON businesses(ai_agent_enabled) 
      WHERE ai_agent_enabled = true;
  END IF;

  -- Check and add ai_agent_config column
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'businesses' 
      AND column_name = 'ai_agent_config'
  ) THEN
    ALTER TABLE businesses 
      ADD COLUMN ai_agent_config JSONB DEFAULT '{}'::jsonb NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- Migration complete
-- ============================================================================
```

**Run with**:
```bash
npm run db:generate -- --name ai_assistant_ux_enhancement
npm run db:migrate
```

---

## Test Matrix (Abbreviated — Full version has 57 scenarios)

| # | Scenario | Type | File | Status |
|---|----------|------|------|--------|
| 1 | Tenant isolation | integration | `ai-agent-tenant-isolation.test.ts` | ✅ Exists |
| 2 | Knowledge isolation | integration | Same | ✅ Exists |
| 3 | Session token security | integration | `ai-agent-session-security.test.ts` | ⬜ New |
| 4 | Session token entropy | unit | `session-token-generation.test.ts` | ⬜ New |
| 5 | IP rate limiting | integration | `ai-agent-rate-limiting.test.ts` | ⬜ New |
| 6 | Session rate limiting | integration | Same | ⬜ New |
| 7 | Usage quota (free) | integration | `ai-agent-usage-quota.test.ts` | ⬜ New |
| 8 | Usage quota (pro) | integration | Same | ⬜ New |
| 9 | Max steps | unit | `ai-agent-orchestrator.test.ts` | ⬜ New |
| 10 | Tool loop | integration | Same | ✅ Exists |
| 11 | Inquiry creation | integration | `ai-agent-inquiry-creation.test.ts` | ✅ Exists |
| 12 | Duplicate customer | integration | Same | ⬜ New |
| 13 | Missing fields | unit | `qualification-state.test.ts` | ⬜ New |
| 14 | Existing fields | unit | Same | ⬜ New |
| 15 | Form recommendation | integration | `ai-agent-form-recommendation.test.ts` | ⬜ New |
| 16 | AI → form prefill | e2e | `ai-to-form-handoff.spec.ts` | ⬜ New |
| 17 | Form → AI state | e2e | Same | ⬜ New |
| 18 | Tool failure | integration | `ai-agent-tool-failures.test.ts` | ⬜ New |
| 19 | Prompt injection | unit+integration | `prompt-injection-defense.test.ts` | ⬜ New |
| 20 | Human handoff | integration | `ai-agent-inquiry-creation.test.ts` | ✅ Exists |
| 21 | Human takeover | integration | `ai-agent-takeover.test.ts` | ⬜ New |
| 22 | RLS enforcement | integration | `ai-agent-rls.test.ts` | ⬜ New |
| 23 | Model fallback | integration | `ai-agent-orchestrator.test.ts` | ✅ Exists |
| 24 | Attribution tracking | integration | `inquiry-attribution.test.ts` | ⬜ New |
| 25 | Inquiry hub | e2e | `inquiry-hub.spec.ts` | ⬜ New |
| 26 | Legacy chat route | e2e | `ai-agent-conversation.spec.ts` | ✅ Exists |
| 27 | Navigation | e2e | `navigation.spec.ts` | ⬜ Extend |
| 28 | Settings moved | e2e | Same | ⬜ New |
| 29 | Beta flag | integration | `beta-flag.test.ts` | ⬜ New |
| 30 | ... | ... | ... | ... |

**Test coverage target**: 100% for new code, maintain existing coverage.

---

## Backward Compatibility Guarantees

### Routes (Permanent Support)
- ✅ `/b/{slug}/chat` — existing AI chat page, works forever
- ✅ `/inquire/{slug}` — existing inquiry page, works forever
- ✅ `/inquire/{slug}/{formSlug}` — direct form links, work forever
- ➡️ `/settings/ai-agent` — 301 redirect to `/assistant/settings`

### Data (No Breaking Changes)
- ✅ Existing `ai_agent_sessions`, `ai_agent_messages`, `ai_agent_runs` unchanged
- ✅ Existing inquiries with `source = 'ai_agent'` remain valid
- ✅ New `ai_assisted` flag added (backfilled, not breaking)
- ✅ Schema names unchanged (`ai_agent_*`, not renamed to `ai_assistant_*`)

### Code (Internal Naming)
- ✅ Internal code keeps "agent" terminology
- ✅ Schema keeps `ai_agent_*` table names
- ✅ Feature directory remains `features/ai-agent/`
- ✅ Only customer-facing UI labels change

---

## Rollout Strategy

### Stage 1: Internal Testing (Week 1)
- Deploy to staging
- Enable beta flag for demo/test businesses
- Manual QA of all flows
- Fix critical bugs

### Stage 2: Beta Opt-In (Week 2-3)
- Deploy to production
- Add beta opt-in UI in settings
- Email select customers inviting them to beta
- Monitor errors, feedback, adoption
- Fix issues

### Stage 3: Gradual Rollout (Week 4-5)
- Auto-enable beta for new businesses
- Gradually enable for existing businesses (10% → 50% → 100%)
- Monitor metrics: adoption, errors, support tickets
- Adjust based on feedback

### Stage 4: Full Release (Week 6)
- Enable beta for 100% of businesses
- Remove beta flag from UI
- Update documentation
- Announce in changelog/blog

### Stage 5: Cleanup (Week 7+)
- Remove `ai_assistant_beta_enabled` column (after confirming stability)
- Archive old documentation
- Monitor long-term adoption

---

## Success Metrics

### Security (Critical)
- ✅ Zero cross-tenant data leaks
- ✅ Zero bypassed usage quotas
- ✅ Zero session token enumeration successes
- ✅ RLS policies enforced on all dashboard queries

### Adoption (Primary)
- 🎯 50%+ of businesses with AI enabled use new inquiry hub within 30 days
- 🎯 80%+ of new businesses opt into beta within 7 days
- 🎯 <5% of beta users opt out

### Performance (Secondary)
- 🎯 No regression in chat latency (maintain <2s p95)
- 🎯 Dashboard loads in <1s (conversations list)
- 🎯 Rate limiting blocks 100% of abuse attempts

### Quality (Secondary)
- 🎯 <1% error rate in production
- 🎯 Zero P0 bugs in beta period
- 🎯 All tests pass (unit, component, integration, e2e)

### UX (Tertiary)
- 🎯 Customer-facing terminology 100% consistent (no "agent" references)
- 🎯 Mobile navigation works on all tested devices
- 🎯 Form ↔ AI state sharing works in >90% of cases (localStorage limitations accepted)

---

## Estimated Timeline

| Phase | Duration | Dependencies | Staffing |
|-------|----------|--------------|----------|
| 1. Audit & Fixes | 2-3 days | None | 1 dev |
| 2. Terminology & Nav | 2 days | Phase 1 | 1 dev |
| 3. Inquiry Hub | 2-3 days | Phase 2 | 1 dev |
| 4. Dashboard | 4-5 days | Phase 2 | 1-2 devs |
| 5. Form Integration | 3-4 days | Phase 3, 4 | 1 dev |
| 6. Hardening | 5-7 days | Phase 1-5 | 1-2 devs |
| **Total** | **18-24 days** | Sequential with some parallelization | **1-2 devs** |

**Parallelization opportunities**:
- Phase 4 (Dashboard) can start while Phase 3 (Hub) is in review
- Test writing can happen alongside feature development
- Documentation can happen during Phase 6

**Recommended approach**: 1 dev, 4-5 weeks elapsed time with code review, testing, and buffer for issues.

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation | Owner |
|------|--------|------------|------------|-------|
| Breaking existing AI users | High | Medium | Keep legacy routes. Beta flag. | Dev |
| RLS breaks dashboard queries | High | Low | Test with non-service-role clients. | Dev |
| Quota enforcement too strict | Medium | Medium | Log near-limit warnings. Grace period. | Product |
| Form state sharing fragile | Low | Medium | Document localStorage limitations. | Dev |
| Nav changes confuse users | Medium | Low | Onboarding tour. Help docs. | Design |
| Test coverage gaps | Medium | Medium | Complete test matrix first. | QA |
| Timeline overrun | Medium | Medium | Prioritize phases 1-4. Defer 5-6 if needed. | PM |

---

## References

- [ADR 002: AI Assistant UX Enhancement](./architecture/adr-002-ai-assistant-ux-enhancement.md) — Full decision log (30 decisions)
- [ADR 001: AI Agent Architecture](./architecture/adr-001-ai-agent.md) — Original AI Agent V1 decisions
- [CONTEXT.md](../CONTEXT.md) — Domain model with terminology mapping
- [AGENTS.md](../AGENTS.md) — Agent working conventions, entitlement architecture
- [AI Router](../lib/ai/router.ts) — Model selection and fallback
- [Usage Limiter](../lib/ai/usage-limiter.ts) — Quota enforcement
- [Existing AI Agent Tests](../tests/integration/ai-agent-*.test.ts) — Starting test coverage

---

## Next Steps

1. **Review this plan** with team (design, product, eng)
2. **Confirm timeline** and resource allocation
3. **Start Phase 1** (Audit & Fixes) — highest priority for security
4. **Create tracking ticket** for each phase in project management tool
5. **Schedule weekly sync** during implementation (review progress, blockers, risks)

---

**Questions? Concerns? Reach out to the implementation team.**
