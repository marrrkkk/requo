# Assistant and Agent — Architecture

Two conversational surfaces, one shared product core. **Agent** always means
the customer-facing anonymous surface; **Assistant** always means the
owner-facing authenticated surface (glossary: `CONTEXT.md` Language section).

## Surfaces

|  | Agent (customer) | Assistant (owner) |
|---|---|---|
| Identity | Anonymous, token-possession (`ai_agent_sessions.public_token`) | Authenticated member (`owner_assistant_sessions.business_id + user_id`) |
| Entry | `/b/[slug]/chat`, `/b/[slug]/inquire` hub | `/[businessSlug]/assistant` (composer), `/assistant/chat/[sessionId]` |
| Session scope | Per business, 24h expiry, 50-message cap | Per member, long-lived, retained indefinitely |
| Transport | UI message stream (`toUIMessageStreamResponse` + `useChat`) | Same UI message stream + `useChat` |
| Completion | `completed` on inquiry creation, `human_handoff` on escalation, else hourly sweep to `abandoned` | No completed state (long-lived by design) |
| Retention | Transcripts without an inquiry purged after 30 days | Indefinite |

## Request flow (both surfaces)

1. Boundary checks: validation (Zod), rate limits (Agent: per-IP, per-session,
   creation, per-business daily ceiling), entitlements (Agent: Pro+ at boundary
   **and** in the orchestrator so downgrades take effect in-flight; Assistant:
   daily message bucket per plan).
2. Orchestrator: load session → sanitise input (`sanitizeAiInput`) → persist
   user turn → advance state (Agent: qualification extraction; Assistant: title
   derivation) → build prompt from history **after** the persist → `streamText`
   with tools over the UI message stream.
3. Telemetry: run rows (Agent), `recordUsage` into the shared monthly credit
   pool (hard ceiling), `logAiInvocation` per surface for attributable spend.
   Model output is filtered (`filterAiOutput`) before persistence.

## Tools

- Agent tools (`features/ai-agent/tools/`): `search_knowledge`,
  `get_business_info`, `get_services`, `create_inquiry`, `request_human_handoff`.
  Inquiry creation and escalation route through shared exported submission
  wrappers (`createAgentInquirySubmission`, `createAgentHandoffSubmission`) in
  `features/inquiries/mutations.ts` — the same intake path as public/manual
  submissions, preserving `source` (`ai_agent` / `ai_agent_handoff`) and
  `aiAssisted: true`. Escalations additionally set `inquiries.escalated`.
- Assistant tools (`features/owner-assistant/tools/`): read tools over
  business-scoped queries (archived/deleted excluded, case-insensitive match,
  dollars never raw cents), `search_knowledge` via `retrieveBusinessKnowledge`,
  writes via the shared product services (`createAssistantInquirySubmission`,
  `createQuoteForBusiness`, `changeInquiryStatusForBusiness`,
  `markQuoteSentForBusiness` + `sendQuoteEmail`). Every write writes an audit
  record attributed to the acting member. Tool failures return typed `error`
  results — never plausible empty data.
- Role enforcement is server-side (`requireToolRole`): drafting is open to all
  members; `send_quote` requires manager or above.
- Confirmation: `send_quote` and `update_inquiry_status` stage a pending
  operation in session state and return `confirmation_required`. The client
  renders `ConfirmationRequiredCard`; approval calls `confirmAssistantToolAction`,
  which consumes the staged operation exactly once and executes it.

## Privacy boundary (ADR 004)

There is no browse or search over Agent Sessions. A session becomes visible to
the business only through an Inquiry it produced, via `getAgentTranscriptForInquiry`
rendered read-only on the inquiry detail page. Escalated inquiries carry
`inquiries.escalated` with an inbox filter chip.

## Testing seam

One seam: `MockLanguageModelV3` (`ai/test`) at the provider boundary
(`registry.languageModel`), driven through the route handlers against the real
database (`tests/support/mock-model.ts`). No orchestrator stubs, no call-shape
assertions against fakes.
