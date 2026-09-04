# Owner Assistant Feature

The owner-facing conversational surface (**Assistant**) for authenticated
business members. UI calls it "Assistant". See ADR 003 for naming.

## Purpose

An AI-powered conversational interface that helps members:
- Search and analyze business data (inquiries, quotes, customers)
- Get operational metrics and analytics
- Execute write operations (create inquiries and quotes; send quotes and change
  inquiry status only after explicit confirmation)

Distinct from the customer-facing Agent (anonymous public chat that qualifies
inquiries), the Assistant operates on existing business data with full
authentication and authorization.

## Architecture

### Session Management
- **Persisted sessions**: `owner_assistant_sessions` + `owner_assistant_messages`.
  The server owns identifiers (`oas_*`); the client never mints one.
- Each session has its own URL (`/assistant/chat/[sessionId]`), a title
  derived from the opening message (renamable, deletable), and a member-scoped,
  paginated history sidebar (sheet on mobile). The section root is a composer
  that creates nothing until a message is sent.
- Sessions are scoped to the member who created them and retained indefinitely.

### Transport
UI message stream (`toUIMessageStreamResponse` + `useChat`), so tool calls and
results stream as structured parts rendered by `ToolResultRenderer`.
The orchestrator persists the user turn **before** building the prompt, so the
model always receives the user's text.

### Tool Categories
1. **Read tools** (9): search/stats/analytics/customers/knowledge/follow-ups.
   Archived/deleted records are excluded, name matching is case-insensitive,
   money is dollars (never raw cents), failures return typed errors.
2. **Write tools** (4): `create_inquiry`, `create_quote` (drafting, not gated),
   `update_inquiry_status`, `send_quote` (gated — see below).

See `docs/owner-assistant-tools.md` for the tool inventory and
`docs/architecture/assistant-and-agent.md` for the full picture.

### Authorization
- Requires authenticated user (Better Auth, the only auth system).
- Business membership validation via `getBusinessActionContext()`.
- Business-scoped queries (all tools filter by `businessId`).
- Server-side role checks (`requireToolRole`): drafting is open to all
  members; `send_quote` requires manager or above.

### Write Operation Safety
- **Drafting** (`create_inquiry`, `create_quote`): auto-execute through the
  shared product services, with an audit record per write.
- **Outbound / state-changing** (`send_quote`, `update_inquiry_status`):
  stage a pending confirmation in session state, return
  `confirmation_required`, and execute exactly once via
  `confirmAssistantToolAction` after owner approval.

### Tool Result Presentation
Tools return structured data types that render as rich UI components:
- `inquiry_list` → `<InquiryListCard>`
- `quote_list` → `<QuoteListCard>`
- `stats_summary` → `<StatsSummaryCard>`
- `chart_data` → `<ChartDataCard>`
- `knowledge_results` → `<KnowledgeResultsCard>`
- `customer_list` → `<CustomerListCard>`
- `*_created` / `*_sent` / `*_updated` → `<ActionSuccessCard>`
- `error` → `<ErrorCard>`
- `confirmation_required` → `<ConfirmationRequiredCard>`

## File Structure

```
features/owner-assistant/
├── actions.ts              # Server actions (create/rename/delete/list/confirm)
├── types.ts                # TypeScript types
├── schemas.ts              # Zod input/output schemas
├── queries.ts              # Database query functions (business-scoped)
├── permissions.ts          # Role gating + money helpers
├── orchestrator.ts         # Chat loop (persist-first prompt, UI stream)
├── session-service.ts      # Session/message persistence, titles, confirmations
├── tools/
│   ├── index.ts            # Tool registry
│   └── [tool-name].ts      # Individual tool implementations
├── components/             # Chat, composer, history sidebar, result cards
└── prompts/
    └── system-prompt.ts    # Plan-aware system prompt
```

## Usage

### Create a session (server owns the id)
```typescript
import { createAssistantSessionAction } from "@/features/owner-assistant/actions";

const result = await createAssistantSessionAction({ businessSlug });
// → { sessionId: "oas_..." }; navigate to /[slug]/assistant/chat/[sessionId]
```

### Chat
`POST /api/ai/owner-assistant/chat` with `{ businessSlug, sessionId?, messages: UIMessage[] }`
returns the UI message stream; the canonical session id arrives in `X-Session-Id`.

### Confirm a staged operation
```typescript
import { confirmAssistantToolAction } from "@/features/owner-assistant/actions";

await confirmAssistantToolAction({ businessSlug, sessionId, confirmationId, decision: "approved" });
```

## Safety and metering

- Input sanitisation (`sanitizeAiInput`) before untrusted text reaches a model
  with tools; output filtering (`filterAiOutput`) before persistence.
- Per-plan daily message bucket (`assistantMessagesPerDay`), separate from the
  Agent's session bucket; the shared monthly credit pool is the hard ceiling.
  Limits render `UpgradePrompt` inside the conversation.
- Token usage and cost recorded per surface via `logAiInvocation`.
- Deny-all RLS on assistant tables (service role bypasses; defence in depth).

## Testing

- Provider seam: `MockLanguageModelV3` at `registry.languageModel`, driven
  through the route handler (`tests/support/mock-model.ts`,
  `tests/integration/assistant-chat-route.test.ts`).
- Unit: title generation, schemas, limit arithmetic.
- Component: history sidebar (collapse/sheet/rename/delete), confirmation
  callbacks, card rendering.

## Related Documentation

- [CONTEXT.md](../../CONTEXT.md) - Domain model and glossary
- [docs/owner-assistant-tools.md](../../docs/owner-assistant-tools.md) - Tool inventory
- [docs/architecture/assistant-and-agent.md](../../docs/architecture/assistant-and-agent.md) - Surfaces architecture
- [docs/architecture/adr-003-agent-assistant-naming.md](../../docs/architecture/adr-003-agent-assistant-naming.md) - Naming
- [docs/architecture/adr-004-agent-transcript-privacy.md](../../docs/architecture/adr-004-agent-transcript-privacy.md) - Privacy
- [AGENTS.md](../../AGENTS.md) - Architecture overview
