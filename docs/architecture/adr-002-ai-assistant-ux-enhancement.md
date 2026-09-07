# ADR 002: AI Assistant UX Enhancement

**Status**: Accepted  
**Date**: 2026-09-01  
**Deciders**: Implementation team  
**Context**: Requo AI Assistant V2 — Rebrand and UX Enhancement

---

## Context

The AI Agent V1 exists and is functional (see ADR 001). This ADR documents the decisions for enhancing it into a first-class "AI Assistant" product experience with:

1. Customer-facing terminology rebrand (Agent → Assistant)
2. First-class navigation placement
3. Universal inquiry hub (AI + forms)
4. Owner dashboard for conversations and activity
5. Bidirectional form ↔ AI state sharing
6. Security and cost control hardening

This is an enhancement/rebrand, not a greenfield build.

---

## Decision Summary

### Round 1: Foundation & Terminology (Q1-Q10)

#### Q1: Terminology Authority
**Decision**: Keep internal schema/code as `ai_agent_*`. Create UI label mapping layer.  
**Rationale**: Avoid production database migrations. Customer-facing UI says "AI Assistant", code remains "agent".  
**Action**: Update `CONTEXT.md` with: "AI Agent (internal/schema) / AI Assistant (customer-facing UI)"

#### Q2: Customer Entity
**Decision**: NO customers table. Tool is actually `setInquiryCustomerFields()` abstraction.  
**Rationale**: Aligns with ADR 001 decision. Customer entity is a future project, not blocking for AI Assistant.  
**Action**: Document in `CONTEXT.md` that "createCustomer" tool writes to inquiry denormalized fields.

#### Q3: Universal Inquiry Page URL
**Decision**: Keep `/b/{slug}` as profile. Create `/b/{slug}/inquire` as universal inquiry hub (AI + forms).  
**Rationale**: Preserves existing SEO and behavior. Clear separation: profile vs. inquiry entry point.  
**Action**: New route for inquiry hub. Update public nav.

#### Q4: Navigation Structure
**Decision**: Remove non-existent "Customers" from nav.  
**New nav order**: Home, Inquiries, **AI Assistant**, Forms, Products, Quotes, Follow-ups, Analytics, Members  
**Rationale**: Matches actual app structure. No customers table = no customers nav.

#### Q5: AI Router Integration
**Decision**: Already correct. No action needed.  
**Rationale**: Existing orchestrator correctly uses `lib/ai/router.ts`.

#### Q6: Vercel AI SDK Version
**Decision**: Using `ai@^6.0.184`. Use `streamText` + tools pattern, not `ToolLoopAgent`.  
**Rationale**: SDK 6 modern API. `ToolLoopAgent` was SDK v3.  
**Action**: Remove `ToolLoopAgent` references from plan.

#### Q7: Settings Migration
**Decision**: Route/nav change only. Keep schema untouched.  
**Rationale**: Avoid duplicate config. Same data, new location.  
**Action**: Move settings UI from `/settings/ai-agent` to `/assistant/settings`.

#### Q8: Form Recommendation Flow
**Decision**: "Submit an inquiry" opens form selector (if multiple) or default form. AI form recommendation opens specific form in new tab, preserving chat session.  
**Rationale**: Clear UX. Customer choice vs. AI recommendation are distinct actions.

#### Q9: Form ↔ AI State Preservation
**Decision**: Use localStorage (`requo-agent-session:{slug}`) for MVP. Same-device only.  
**Rationale**: Simple, no server writes from public forms. Cross-device is V2.  
**Action**: Document same-device limitation.

#### Q10: Human Takeover Mechanics
**Decision**: Takeover = session status → `human_handoff`, AI refuses further messages, owner contacts via inquiry workflow.  
**Rationale**: No real-time human-in-chat for V1. Keep scope manageable.  
**Action**: Session frozen after handoff. Owner uses inquiry notes/email.

---

### Round 2: Security, Cost, Data, Testing (Q11-Q20)

#### Q11: RLS Missing
**Decision**: Add RLS policies for `ai_agent_sessions`, `ai_agent_messages`, `ai_agent_runs` before expanding.  
**Rationale**: Defense-in-depth even though service role bypasses RLS.  
**Action**: Migration 0017: Enable RLS + add tenant isolation policies.

#### Q12: Session Token Security
**Decision**: Verify token generation uses crypto-secure random (minimum 128-bit entropy).  
**Rationale**: Prevent session enumeration attacks.  
**Action**: Audit `session-service.ts` token creation. Document entropy in code comments.

#### Q13: Rate Limiting Scope
**Decision**: Add dual rate limits: 100/hour per IP + 50/hour per session.  
**Rationale**: IP-only is unfair (NAT, VPN). Session limit is more granular.  
**Action**: Update chat route to check both limits.

#### Q14: Cost Tracking vs. Limiting
**Decision**: Implement hard limit checks in orchestrator.  
**Rationale**: Prevent uncontrolled spending.  
**Action**: Check business usage quota before `runAgent()`. Return error if exceeded.

#### Q15: Agent Loop Max Steps
**Decision**: Add `maxSteps: 5` to `streamText()` call.  
**Rationale**: Prevent infinite tool loops.  
**Action**: Add `onStepFinish` callback to log tool usage.

#### Q16: Inquiry Attribution
**Decision**: Add `ai_assisted: boolean` flag to inquiries. Source = final submission method.  
**Rationale**: Track AI involvement separately from submission channel for analytics.  
**Action**: Schema change: `inquiries.ai_assisted`. Backfill existing `source = 'ai_agent'`.

#### Q17: Public Business Page
**Decision**: Keep `/b/{slug}` as profile. Create `/b/{slug}/inquire` as inquiry hub.  
**Rationale**: Preserves existing SEO. Clear purpose separation.  
**Action**: New route. Update nav.

#### Q18: Navigation Plan Filtering
**Decision**: AI Assistant nav always visible. Show paywall/upgrade prompt if plan-gated.  
**Rationale**: Aligns with entitlement-visibility architecture (features visible, locked when unavailable).  
**Action**: Document AI Assistant plan entitlement.

#### Q19: Settings Route Location
**Decision**: Use `/{businessSlug}/assistant/*` for new AI Assistant section.  
**Rationale**: Avoids collision with existing `features/ai/` (quote AI).  
**Action**: Create `app/(business)/[businessSlug]/(main)/assistant/` route group.

#### Q20: Testing Strategy
**Decision**: Create test matrix mapping scenarios to categories (unit/component/integration/e2e).  
**Rationale**: Prevent gaps and duplicates.  
**Action**: Build test matrix before implementation.

---

### Round 3: Migration, Data Integrity, Rollout (Q21-Q30)

#### Q21: Missing Schema Column
**Decision**: Verify `businesses` table has `ai_agent_enabled` and `ai_agent_config`. Add if missing.  
**Rationale**: Settings form requires these columns.  
**Action**: Migration 0017 adds columns if not present.

#### Q22: Existing AI Agent Users
**Decision**: Keep `/b/{slug}/chat` as permanent route (legacy support). Add new `/b/{slug}/inquire` hub. Gradual terminology transition.  
**Rationale**: Backward-compatible. Don't break existing users.  
**Action**: Document migration plan. Keep old routes working.

#### Q23: Inquiry Schema Migration
**Decision**: Add `ai_assisted` column with backfill in same migration. Keep old source values.  
**Rationale**: Dual-tracking for analytics without breaking existing data.  
**Action**: `UPDATE inquiries SET ai_assisted = true WHERE source IN ('ai_agent', 'ai_agent_handoff', 'ai')`.

#### Q24: RLS Policy Enforcement Timing
**Decision**: Add RLS + user policies if dashboard queries these tables. Document which code path uses which client.  
**Rationale**: Service role bypasses RLS, but dashboard UI needs user-scoped access.  
**Action**: Identify access patterns. Add appropriate policies.

#### Q25: AI Usage Quota Check Placement
**Decision**: Check in API route (HTTP-level) + defensive check in orchestrator (business logic).  
**Rationale**: Double-enforcement prevents bypass.  
**Action**: Add `checkUsageLimit()` in both locations.

#### Q26: Test Matrix Category Assignment
**Decision**: Map all 57 scenarios to unit/component/integration/e2e categories.  
**Rationale**: Clear testing responsibilities.  
**Action**: Complete test matrix table (partial provided).

#### Q27: Navigation Update Coordination
**Decision**: Update all nav components, breadcrumbs, command menu, mobile nav.  
**Rationale**: Consistent navigation everywhere.  
**Action**: Checklist of every file referencing nav structure.

#### Q28: Public Inquiry Hub Route Strategy
**Decision**: Keep both `/inquire/{slug}` and `/b/{slug}/inquire` short-term. Add redirects long-term (3-month deprecation).  
**Rationale**: Avoid breaking existing links. Gradual migration.  
**Action**: 301 redirects after deprecation period.

#### Q29: Rollout Feature Flag
**Decision**: Beta opt-in stored in `businesses.ai_assistant_beta_enabled`.  
**Rationale**: User-controlled gradual migration. Safer testing.  
**Action**: Add flag column. Remove after 100% adoption.

#### Q30: Implementation Phase Dependencies
**Decision**: Rewrite phases as enhancement (not greenfield).  
**New phases**:
1. Audit & Fixes (security, limits)
2. Terminology & Nav (rebrand)
3. Inquiry Hub (universal page)
4. Dashboard (conversations, activity)
5. Form Integration (state sharing)
6. Hardening (tests, review)

**Rationale**: Reflects reality (AI Agent exists, this is enhancement).

---

## Implementation Phases (Revised)

### Phase 1: Audit & Security Fixes
**Goal**: Harden existing AI Agent before expanding surface area.

- Add RLS policies for agent tables
- Verify session token crypto strength
- Add per-session rate limiting (50/hour)
- Implement hard usage quota checks
- Add `maxSteps: 5` to agent orchestrator
- Add `onStepFinish` logging

**Acceptance**: All security checks pass. Rate limiting works. Quota enforcement blocks exceeding users.

---

### Phase 2: Terminology & Navigation Rebrand
**Goal**: Customer-facing "AI Assistant" branding and first-class nav placement.

- Update `CONTEXT.md` with terminology mapping
- Add AI Assistant to main dashboard nav
- Add AI Assistant to mobile nav
- Add AI Assistant to command menu
- Create `/assistant/*` route structure
- Move settings from `/settings/ai-agent` to `/assistant/settings`
- Update all UI labels: "AI Agent" → "AI Assistant"

**Acceptance**: Nav shows AI Assistant. Settings moved. No customer-facing "agent" references.

---

### Phase 3: Universal Inquiry Hub
**Goal**: Single entry point for AI + forms.

- Create `/b/{slug}/inquire` page
- Show business identity + "How can we help?"
- Primary CTA: "Chat with our AI Assistant"
- Secondary CTA: "Submit an inquiry" (form selector)
- Keep `/b/{slug}/chat` working (legacy)
- Keep `/inquire/{slug}` working (legacy)
- Add public nav link to inquiry hub

**Acceptance**: Customer can choose AI or form. Existing links work. Mobile responsive.

---

### Phase 4: Owner Dashboard
**Goal**: Visibility into AI Assistant activity.

- `/assistant/overview` — status, metrics, quick links
- `/assistant/conversations` — list of sessions (active, completed, handoff, abandoned)
- `/assistant/conversations/[id]` — conversation detail (messages, actions, takeover)
- `/assistant/activity` — recent AI actions (inquiry created, handoff, form recommended)
- `/assistant/settings` — existing settings (moved from global settings)

**Acceptance**: Owner can see conversations, read messages, see AI actions, take over sessions.

---

### Phase 5: Form Integration
**Goal**: Bidirectional state sharing between AI chat and forms.

- AI → Form: Prefill form fields from session state (localStorage bridge)
- Form → AI: Show "Need help?" button, opens AI with form progress preserved
- Add "Continue with AI" and "Open [Form Name]" buttons in chat
- Add `ai_assisted` flag to inquiries schema
- Backfill existing `ai_agent` inquiries with `ai_assisted = true`
- Track attribution: source = final submission, ai_assisted = AI involvement

**Acceptance**: Customer can switch AI ↔ form without losing progress. Attribution tracked correctly.

---

### Phase 6: Hardening & Rollout
**Goal**: Production-ready quality and controlled rollout.

- Complete test matrix (57 scenarios mapped to unit/component/integration/e2e)
- Write missing tests
- Security review (prompt injection, tenant isolation, RLS)
- Add `businesses.ai_assistant_beta_enabled` flag
- Beta opt-in UI for business owners
- Documentation: owner help docs, onboarding guide
- Remove beta flag after 100% adoption

**Acceptance**: All tests pass. Security review complete. Gradual rollout successful.

---

## Database Migrations

### Migration 0017: AI Assistant Enhancement

```sql
-- RLS policies for tenant isolation
ALTER TABLE ai_agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own business agent sessions"
  ON ai_agent_sessions FOR ALL
  USING (business_id IN (
    SELECT business_id FROM business_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users access own business agent messages"
  ON ai_agent_messages FOR ALL
  USING (session_id IN (
    SELECT id FROM ai_agent_sessions WHERE business_id IN (
      SELECT business_id FROM business_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users access own business agent runs"
  ON ai_agent_runs FOR ALL
  USING (business_id IN (
    SELECT business_id FROM business_members WHERE user_id = auth.uid()
  ));

-- Add ai_assisted flag to inquiries for attribution tracking
ALTER TABLE inquiries 
  ADD COLUMN ai_assisted BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill existing AI-sourced inquiries
UPDATE inquiries 
  SET ai_assisted = true 
  WHERE source IN ('ai_agent', 'ai_agent_handoff', 'ai');

-- Add beta flag for gradual rollout
ALTER TABLE businesses 
  ADD COLUMN ai_assistant_beta_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Verify ai_agent columns exist (add if missing from previous migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'ai_agent_enabled'
  ) THEN
    ALTER TABLE businesses 
      ADD COLUMN ai_agent_enabled BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'ai_agent_config'
  ) THEN
    ALTER TABLE businesses 
      ADD COLUMN ai_agent_config JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create index for beta flag queries
CREATE INDEX businesses_ai_assistant_beta_enabled_idx 
  ON businesses(ai_assistant_beta_enabled) 
  WHERE ai_assistant_beta_enabled = true;

-- Create index for ai_assisted analytics
CREATE INDEX inquiries_ai_assisted_idx 
  ON inquiries(business_id, ai_assisted, created_at);
```

---

## Test Matrix (Partial — Expand to 57 Scenarios)

| # | Scenario | Category | Location | Notes |
|---|----------|----------|----------|-------|
| 1 | Tenant isolation (Assistant A ↔ B) | integration | `tests/integration/ai-agent-tenant-isolation.test.ts` | Already exists |
| 2 | Knowledge isolation | integration | Same file | Already exists |
| 3 | Session token security | integration | `tests/integration/ai-agent-session-security.test.ts` | New |
| 4 | Session token entropy | unit | `tests/unit/session-token-generation.test.ts` | New |
| 5 | IP rate limiting | integration | `tests/integration/ai-agent-rate-limiting.test.ts` | New |
| 6 | Session rate limiting | integration | Same file | New |
| 7 | Usage quota (free plan) | integration | `tests/integration/ai-agent-usage-quota.test.ts` | New |
| 8 | Usage quota (pro plan) | integration | Same file | New |
| 9 | Max steps enforcement | unit | `tests/unit/ai-agent-orchestrator.test.ts` | New |
| 10 | Tool loop detection | integration | `tests/integration/ai-agent-orchestrator.test.ts` | Already exists |
| 11 | Inquiry creation | integration | `tests/integration/ai-agent-inquiry-creation.test.ts` | Already exists |
| 12 | Duplicate customer (email match) | integration | Same file | New |
| 13 | Missing fields (qualification) | unit | `tests/unit/qualification-state.test.ts` | New |
| 14 | Existing fields (no re-ask) | unit | Same file | New |
| 15 | Form recommendation | integration | `tests/integration/ai-agent-form-recommendation.test.ts` | New |
| 16 | AI → form prefill | e2e | `tests/e2e/ai-to-form-handoff.spec.ts` | New |
| 17 | Form → AI state | e2e | Same file | New |
| 18 | Tool failure handling | integration | `tests/integration/ai-agent-tool-failures.test.ts` | New |
| 19 | Prompt injection (system prompt) | unit | `tests/unit/prompt-injection-defense.test.ts` | New |
| 20 | Prompt injection (secrets) | integration | Same file | New |
| 21 | Human handoff (request) | integration | `tests/integration/ai-agent-inquiry-creation.test.ts` | Already exists |
| 22 | Human takeover (session freeze) | integration | `tests/integration/ai-agent-takeover.test.ts` | New |
| 23 | RLS enforcement | integration | `tests/integration/ai-agent-rls.test.ts` | New |
| 24 | Model fallback | integration | `tests/integration/ai-agent-orchestrator.test.ts` | Already exists |
| 25 | Attribution (ai_assisted flag) | integration | `tests/integration/inquiry-attribution.test.ts` | New |
| 26 | Public inquiry hub renders | e2e | `tests/e2e/inquiry-hub.spec.ts` | New |
| 27 | Legacy chat route works | e2e | `tests/e2e/ai-agent-conversation.spec.ts` | Already exists |
| 28 | Navigation shows AI Assistant | e2e | `tests/e2e/navigation.spec.ts` | Extend existing |
| 29 | Settings moved correctly | e2e | Same file | New |
| 30 | Beta flag hides new UI | integration | `tests/integration/beta-flag.test.ts` | New |

*Continue mapping remaining 27 scenarios...*

---

## Backward Compatibility

### Routes (Permanent)
- `/b/{slug}/chat` → always works (existing bookmarks)
- `/inquire/{slug}` → always works (existing marketing links)
- `/settings/ai-agent` → redirect to `/assistant/settings` (301)

### Data
- Existing `ai_agent_sessions`, `ai_agent_messages` remain unchanged
- Existing inquiries with `source = 'ai_agent'` remain valid
- New `ai_assisted` flag backfilled for existing data

### Terminology
- Internal code/schema keeps "agent" naming
- Only customer-facing UI changes to "assistant"
- No database column renames (avoid production migrations)

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing AI Agent users | Medium | High | Keep legacy routes. Beta flag. Gradual rollout. |
| RLS policy breaks existing queries | Low | High | Test with non-service-role clients. Verify dashboard access. |
| Quota enforcement too aggressive | Medium | Medium | Log near-limit warnings. Grace period before hard block. |
| Form ↔ AI state sharing fragile | Medium | Low | localStorage only. Server-side sync is V3. |
| Navigation changes confuse users | Low | Medium | Onboarding tour highlights new location. Help docs. |
| Test coverage gaps | Medium | Medium | Complete test matrix before implementation. |

---

## Success Metrics

- **Security**: Zero cross-tenant data leaks. Zero bypassed usage quotas.
- **Adoption**: 50%+ of businesses with AI enabled use new inquiry hub.
- **Attribution**: ai_assisted flag accurately tracks AI involvement.
- **Performance**: No regression in chat latency. Rate limits prevent abuse.
- **UX**: Customer-facing terminology consistent (no "agent" references).

---

## References

- [ADR 001: AI Agent Architecture](./adr-001-ai-agent.md) — Original AI Agent decisions
- [CONTEXT.md](../../CONTEXT.md) — Domain model
- [Entitlement-Visibility Architecture](../../AGENTS.md#entitlement-visibility-architecture) — Plan gating patterns
- [AI Router](../../lib/ai/router.ts) — Model selection and fallback
- [Usage Limiter](../../lib/ai/usage-limiter.ts) — Quota enforcement

---

## Revision History

- **2026-09-01**: Initial version (30 decisions across 3 grilling rounds)
