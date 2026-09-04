# AI Assistant UX Enhancement — Executive Summary

**Date**: 2026-09-01  
**Status**: Ready for implementation  
**Type**: Enhancement of existing functionality

---

## What We're Building

Transform the existing AI Agent (working, but buried in settings) into a first-class **AI Assistant** product experience:

### Customer Experience
- **Before**: Customer finds `/b/{slug}/chat` if they know to look for it
- **After**: Customer goes to `/b/{slug}/inquire` and chooses "Chat with AI Assistant" or "Submit a form"

### Business Owner Experience
- **Before**: AI Agent toggle hidden in Settings
- **After**: "AI Assistant" in main navigation with conversations dashboard, activity feed, and analytics

### Terminology
- **Customer-facing**: "AI Assistant" everywhere
- **Internal/Schema**: Keep `ai_agent_*` (avoid database migrations)

---

## Key Decisions (30 Total)

Full log: [ADR 002](./architecture/adr-002-ai-assistant-ux-enhancement.md)

### Must-Know Decisions

1. **No schema renames** — keep `ai_agent_*` tables, only rebrand UI
2. **No customer entity** — defer to separate project (per ADR 001)
3. **Add `inquiries.ai_assisted` flag** — track AI involvement separate from source
4. **Universal inquiry hub** at `/b/{slug}/inquire` — single entry for AI + forms
5. **Keep legacy routes forever** — `/b/{slug}/chat`, `/inquire/{slug}` backward compat
6. **Beta flag rollout** — `businesses.ai_assistant_beta_enabled` for gradual adoption
7. **RLS policies required** — defense-in-depth tenant isolation
8. **Dual rate limiting** — 100/hour per IP + 50/hour per session
9. **Hard usage quota** — block requests exceeding plan limits
10. **Form state via localStorage** — same-device only, cross-device is V2

---

## Implementation Phases

| Phase | Goal | Duration | Key Deliverables |
|-------|------|----------|------------------|
| **1. Audit & Fixes** | Harden security | 2-3 days | RLS policies, rate limits, quota checks, maxSteps |
| **2. Terminology & Nav** | Rebrand UI | 2 days | Nav items, route structure, settings moved |
| **3. Inquiry Hub** | Single entry point | 2-3 days | `/b/{slug}/inquire` with AI + form choice |
| **4. Dashboard** | Owner visibility | 4-5 days | Conversations list, detail, activity, analytics |
| **5. Form Integration** | Bidirectional state | 3-4 days | AI → form prefill, form → AI, attribution |
| **6. Hardening** | Production ready | 5-7 days | Tests (57 scenarios), security review, rollout |

**Total**: 18-24 days, 1-2 developers

---

## Critical Path

```
Phase 1 (Security) → BLOCKS → Everything else
         ↓
Phase 2 (Nav) → Phase 3 (Hub) → Phase 5 (Forms)
         ↓                ↓
         → Phase 4 (Dashboard) ← Can parallelize
                     ↓
              Phase 6 (Hardening)
```

**Cannot skip Phase 1** — security hardening must happen before expanding surface area.

**Can parallelize** — Dashboard (Phase 4) can start during Phase 3 code review.

---

## Migration 0017 (Required)

```sql
-- 1. Enable RLS on ai_agent_* tables + add policies
-- 2. Add inquiries.ai_assisted (backfill existing data)
-- 3. Add businesses.ai_assistant_beta_enabled (rollout flag)
-- 4. Verify ai_agent_enabled, ai_agent_config exist (add if missing)
```

**Run before starting Phase 1**.

---

## Backward Compatibility

### Routes (Never Break)
- ✅ `/b/{slug}/chat` — works forever
- ✅ `/inquire/{slug}` — works forever
- ✅ `/inquire/{slug}/{formSlug}` — works forever
- ➡️ `/settings/ai-agent` — redirect to `/assistant/settings`

### Data (Additive Only)
- ✅ No column renames
- ✅ No table renames
- ✅ Only add `ai_assisted` flag (backfilled)

### Code (Internal Unchanged)
- ✅ `features/ai-agent/` stays
- ✅ `ai_agent_sessions` table name stays
- ✅ Only UI labels change

---

## Rollout Strategy

1. **Week 1**: Internal testing (staging, demo businesses)
2. **Week 2-3**: Beta opt-in (select customers, monitor feedback)
3. **Week 4-5**: Gradual rollout (10% → 50% → 100%)
4. **Week 6**: Full release (all businesses, announce)
5. **Week 7+**: Cleanup (remove beta flag)

---

## Success Metrics

### Security (Must-Have)
- ✅ Zero cross-tenant leaks
- ✅ Zero quota bypasses
- ✅ RLS enforced

### Adoption (Primary Goal)
- 🎯 50%+ use inquiry hub within 30 days
- 🎯 80%+ of new businesses opt into beta

### Quality (Secondary)
- 🎯 <1% error rate
- 🎯 No P0 bugs in beta
- 🎯 All tests pass

---

## What Changes Where

### Files to Create (New)
```
app/(business)/[businessSlug]/(main)/assistant/
  ├── overview/page.tsx
  ├── conversations/page.tsx
  ├── conversations/[sessionId]/page.tsx
  ├── activity/page.tsx
  └── settings/page.tsx

app/(public)/b/[slug]/inquire/page.tsx

tests/integration/ai-agent-rate-limiting.test.ts
tests/integration/ai-agent-usage-quota.test.ts
tests/integration/ai-agent-rls.test.ts
tests/e2e/inquiry-hub.spec.ts
tests/e2e/ai-to-form-handoff.spec.ts
... (15+ new test files)

drizzle/0017_ai_assistant_ux_enhancement.sql
```

### Files to Modify (Existing)
```
components/shell/dashboard-navigation.tsx (add AI Assistant item)
components/shell/mobile-bottom-nav.tsx (add AI Assistant)
features/ai-agent/orchestrator.ts (add maxSteps, quota check)
app/api/ai/agent/chat/route.ts (add session rate limit)
features/settings/components/business-ai-agent-settings-form.tsx (move, rebrand labels)
lib/db/schema/inquiries.ts (add ai_assisted column)
lib/db/schema/businesses.ts (add beta flag)
CONTEXT.md (add terminology mapping) ✅ done
... (20+ files)
```

### Files to Find/Replace
```
Grep: "AI Agent" (customer-facing only)
Replace: "AI Assistant"

Keep unchanged:
- Code comments
- Schema names
- Internal variable names
- Technical documentation
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing users | Keep legacy routes, beta flag, gradual rollout |
| RLS breaks queries | Test with dashboard UI, verify policies |
| Timeline overrun | Prioritize phases 1-4, defer 5-6 if needed |
| Quota too strict | Log warnings, grace period before hard block |
| Test coverage gaps | Complete matrix before coding |

---

## Decision Authority

- **Technical decisions** (architecture, security): Engineering team
- **UX decisions** (navigation, terminology): Design + Product
- **Rollout decisions** (beta %, timing): Product + Engineering
- **Scope decisions** (phase priority): Product

**Escalation path**: Product → Engineering Lead → CTO

---

## Open Questions (Resolve Before Phase 1)

None — all 30 questions resolved during design phase.

See [ADR 002](./architecture/adr-002-ai-assistant-ux-enhancement.md) for full decision rationale.

---

## Documentation Links

- **Full Implementation Plan**: [ai-assistant-ux-implementation-plan.md](./ai-assistant-ux-implementation-plan.md)
- **Full Decision Log**: [ADR 002](./architecture/adr-002-ai-assistant-ux-enhancement.md)
- **Domain Model**: [CONTEXT.md](../CONTEXT.md)
- **Original AI Agent ADR**: [ADR 001](./architecture/adr-001-ai-agent.md)

---

## Next Actions

1. ✅ Review this summary with team
2. ⬜ Confirm timeline and resources (1-2 devs, 4-5 weeks)
3. ⬜ Create migration 0017 and test on staging
4. ⬜ Start Phase 1 (Audit & Fixes)
5. ⬜ Schedule weekly sync during implementation

---

**Ready to start?** Begin with Phase 1 (Audit & Fixes) — see full implementation plan for detailed tasks.
