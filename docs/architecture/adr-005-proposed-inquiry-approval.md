# ADR 005: Proposed Inquiry Approval

**Status**: Accepted
**Date**: 2026-09-05
**Amends**: ADR-001 Decision 6 (Fully Autonomous in V1)

## Context

ADR-001 chose a fully autonomous Agent: once Qualification completed, the
model filed the Inquiry itself. In practice the moment the Agent decided it
had enough, it committed a record nobody had agreed to. A misheard phone
number, a wrong budget, or a summary in the person's own words became the
business's first impression with no review step, no correction path except
filing a second Inquiry — the source of near-duplicates the business reconciles
by hand.

## Decision

- The Agent proposes; the prospective customer disposes. When Qualification
  completes, the model calls `propose_inquiry`, which stages a **Proposed
  Inquiry** on the Agent Session and returns it. It commits nothing.
- The only path from proposal to Inquiry is a visitor-authorised server action
  (session-token scoped, row-locked read-modify-write, exactly-once), creating
  through the existing Agent submission path so notifications, activity and
  follow-ups are unchanged.
- Requesting a human stays ungated and immediate. Someone who is stuck meets
  no approval step. Two commit paths with different rules is a decision, not
  an oversight: proposing is gated behind approval, handoff is not.
- If the plan or Agent toggle lapses between proposal and approval, the staged
  proposal is still honoured. Further model work stops (the chat is the gated
  feature), but Inquiry intake was never gated — a free-plan business receives
  public-form Inquiries today, and the submission path takes no plan argument.
  The lapse is logged and both entitlement checks re-run at approval time.

## Consequences

- Friction-versus-accuracy: approving is one action on an already-filled card
  (every field editable, chat revision composes with manual edits). The extra
  step buys records the person stands behind and fewer duplicates.
- Commit authority leaves the model. The tool registry, progress text and
  system-prompt rule change with it; the session lifecycle gains no new status
  (pending/approved/discarded live on the proposal).
- The honour-the-staged-proposal exception is narrow: only an already-staged
  proposal is sendable after a lapse. New model work stays refused.
- Abandoned covers a proposal never approved: nothing reaches the inbox.
