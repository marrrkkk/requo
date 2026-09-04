# ADR 003: Agent / Assistant Naming Split

**Status**: Accepted
**Date**: 2026-09-05
**Supersedes**: ADR-002's naming decision (customer surface labelled "AI Assistant")

## Context

ADR-002 assigned the label "AI Assistant" to the customer-facing surface at the
same time as the owner-facing surface was being built under the same words.
The settings card, navigation, and breadcrumbs therefore called two different
products by one name, and every owner-facing reference to "the Assistant" was
ambiguous.

## Decision

- **Agent** always means the customer-facing anonymous surface — in code,
  schema, tests, documentation, and conversation.
- **Assistant** always means the owner-facing authenticated surface.
- Customer-facing copy calls the Agent a **chat assistant** or **public chat**.
  Owner-facing copy calls the Assistant simply **Assistant**.
- The settings card managing the public surface is labelled **Public chat**.
- Internal identifiers keep their current names (`ai_agent_*`,
  `owner_assistant_*`, `features/ai-agent/`, `features/owner-assistant/`).
  Renaming tables and modules is churn without product value.
- The glossary (`CONTEXT.md` Language section) is the source of truth and
  stays a glossary: no implementation detail. `assistant-and-agent.md`
  describes how the two surfaces are built.

## Consequences

- ADR-002's rename phases (customer labels Agent → Assistant) are withdrawn.
- Breadcrumbs, navigation, settings copy, and the public chat header use the
  new terms. No migration is required (copy-only change).
