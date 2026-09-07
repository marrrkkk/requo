# ADR 004: Agent Transcript Privacy Boundary

**Status**: Accepted
**Date**: 2026-09-05
**Supersedes**: ADR-002's owner conversation dashboard
(`/assistant/conversations`, conversation detail routes and queries)

## Context

ADR-002 specified an owner-facing dashboard for browsing customer
conversations. That contradicts the product's privacy boundary: a prospective
customer chats without an account, and their words must not become a browsable
corpus for the business. Browsing also retains data the business never needed.

## Decision

- The customer conversation browser and its detail route are deleted. There is
  no way — UI, API, or query helper — to browse or search Agent Sessions.
- An Agent Session becomes visible to the business **only** through an Inquiry
  it produced: either the Agent created it or the customer escalated.
- The transcript is attached to that Inquiry as a collapsible, read-only block
  (`getAgentTranscriptForInquiry`), business-scoped through the inquiry itself.
- Escalation sets a dedicated `inquiries.escalated` flag, surfaced as an
  inbox filter chip ("Needs human"), so a waiting customer is visible in the
  queue rather than only inside a transcript.
- Agent transcripts that never produced an Inquiry are purged after 30 days
  (hourly expiry job). Assistant history is retained indefinitely.
- Reloading the public chat restores the customer's own transcript by
  possession of the session token; this grants the business no new visibility.

## Consequences

- The `getAssistantConversations*`, `getAssistantConversationDetail`,
  `getAssistantOverviewMetrics`, and `getAssistantRecentConversations` queries
  are removed. Aggregate reporting that needs them must be rebuilt on
  inquiry-level data, not session browsing.
- Escalated inquiries are attributed `aiAssisted: true` with source
  `ai_agent_handoff`, so reporting stays consistent.
