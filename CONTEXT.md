# Requo Domain Model

## Core Entities

### Business
A tenant in the multi-tenant SaaS. Each business has its own inquiries, quotes, forms, knowledge, and configuration. Identified by `slug` in public URLs and `id` internally.

### Inquiry
A customer request for service. Created either through:
- Traditional form submission → immediate inquiry with status="new"
- AI agent conversation → session qualifies → inquiry created with status="new"

An inquiry is **not** the conversation itself; it's the qualified, structured result.

**Lifecycle**: `new` → `quoted` → `waiting` → `won` | `lost` | `archived`

**Key distinction**: The existing `inquiry_messages` table is for human-written notes and responses on inquiries, not AI chat transcripts.

### Agent Session (customer-facing)
A conversational interaction between a prospective customer and the AI agent. Exists independently until it produces a qualified inquiry.

**Terminology note**: Internal schema and code use "AI Agent" (`ai_agent_sessions`, `features/ai-agent/`, etc.). Customer-facing copy calls it a **chat assistant** or **public chat** — never "AI Assistant", which names the owner-facing surface. See ADR 003. This avoids production database migrations while keeping product naming unambiguous.

**Lifecycle**: `active` → `completed` | `human_handoff` | `abandoned`

- **Active**: Conversation in progress, collecting information
- **Completed**: Sufficient information collected, inquiry created successfully
- **Human handoff**: Agent determined it cannot help; requires human attention
- **Abandoned**: Customer left without completing (no inquiry created)

**Key principle**: Sessions are ephemeral qualification containers. Once they create an inquiry, the inquiry becomes the authoritative record.

### AI Agent Message
A single message within an agent session. Roles: `user` (customer), `assistant` (AI), `tool` (tool result), `system` (internal).

Stored separately from inquiry data. These are chat transcripts, not inquiry notes.

### AI-Assisted Attribution
The `inquiries.ai_assisted` boolean flag tracks whether AI was involved in collecting the inquiry, regardless of final submission method. This allows analytics to measure AI impact even when customers complete via form.

**Attribution model**:
- `source`: Final submission method (`form`, `ai_agent`, `manual`, `api`)
- `ai_assisted`: Whether AI participated at any point in qualification (`true`/`false`)

Example: Customer chats with AI, then completes a form → `source = "form"`, `ai_assisted = true`.

### Customer
**Not a first-class entity in V1.** Customer information is stored as denormalized fields on inquiries and quotes:
- `customerName`
- `customerEmail`
- `customerContactMethod`
- `customerContactHandle`

No cross-inquiry identity or deduplication in MVP. Tools like "create_customer" are misnomers; they should be understood as "set inquiry customer fields."

### Business Memory
Knowledge entries maintained by the business owner. Used for RAG retrieval during AI conversations. Categories:
- `business_rules`: How the business operates
- `customer_context`: Common customer scenarios
- `workflow_preferences`: Internal preferences
- `pricing_knowledge`: Context-only; never monetary authority

**Tenant-scoped**: Agent can only retrieve memories belonging to its business.

## AI Agent Concepts

### Tool
A capability the AI agent can invoke during conversation. MVP tools:
- `search_knowledge`: Retrieve relevant business memories via RAG
- `get_business_info`: Return public business information
- `get_services`: List available services
- `create_inquiry`: Create a qualified inquiry from collected information
- `request_human_handoff`: Mark session as requiring human attention

**Security invariant**: Every tool independently verifies tenant context from the session. Tools never trust LLM-provided tenant identifiers.

### Agent Run
A single execution of the AI agent (one user message → agent response loop). Tracked for telemetry:
- Model/provider used
- Token counts
- Estimated cost
- Tools invoked
- Errors
- Latency

### Qualification
The process of collecting sufficient information from a customer conversation to create a valid inquiry.

**Minimum required fields** (MVP):
- `customerName`
- `customerEmail` or `customerContactHandle` (depending on contactMethod)
- `serviceCategory`
- `details` (what they need)

**Optional fields**:
- `requestedDeadline`
- `budgetText`

**Qualification state** is maintained in the session's `state` JSONB:
```jsonb
{
  "collected": {
    "customerName": true,
    "customerEmail": true,
    "serviceCategory": true,
    "details": true
  },
  "values": {
    "customerName": "John Smith",
    "customerEmail": "john@example.com",
    "serviceCategory": "Website Development",
    "details": "Need an e-commerce site for my bakery"
  },
  "missing": []
}
```

The agent conducts natural conversation while the application maintains structured state.

### Human Handoff
A transition where the AI agent determines it cannot adequately help and marks the session for human attention.

**Triggers** (MVP):
- Customer explicitly requests human contact
- Agent cannot answer question after 2 knowledge search attempts
- Customer expresses frustration (detected via LLM)
- Pricing questions not in knowledge base
- Service requests outside business offerings

**Result**: Session status → `human_handoff`, inquiry created with flag `needsAttention=true` (or stored in metadata).

### Autonomy Level
**Deferred to V2.** MVP operates in fully autonomous mode:
- Knowledge search: automatic
- Inquiry creation: automatic (no approval required)
- Human handoff: automatic when conditions met

Future levels: `suggest` (drafts only), `assist` (low-risk auto, high-risk approval), `autonomous` (all automatic).

## Security Model

### Session Token
A secure, unguessable identifier for a public agent session. Stored in browser localStorage, passed to API.

**Authorization flow**:
1. Client sends session token
2. Server resolves token → session record
3. Session record provides `businessId`
4. All queries/mutations scoped to that business

**Never** trust:
- LLM-provided tenant IDs
- URL parameters for authorization
- Client-provided business context

### Tenant Isolation
Every database query must filter by `businessId`. Tools receive resolved business context from the server-side session, never from the LLM or client.

**Row-level security** (RLS) on:
- `ai_agent_sessions`
- `ai_agent_messages`
- `ai_agent_runs`
- All existing business-scoped tables

### Prompt Injection Defense
Customer messages are untrusted input. System prompts, business secrets, internal configuration must never be exposed.

**Defense layers**:
1. Tools enforce authorization at the database layer
2. RLS policies prevent cross-tenant data access
3. Rate limiting prevents abuse
4. Input sanitization (existing `lib/ai/input-sanitizer.ts`)
5. Output filtering (existing `lib/ai/output-filter.ts`)

## Data Flow

### Traditional Form Flow
```
Customer → Form → createInquirySubmission() → inquiries table (status="new") → Business inbox
```

### AI Agent Flow (MVP)
```
Customer → AI chat UI → 
  Session created → 
  Conversation (multiple turns) → 
  Agent collects fields → 
  Qualification complete → 
  create_inquiry tool → 
  createInquirySubmission() → 
  inquiries table (status="new") → 
  Business inbox →
  Session status="completed"
```

**Key invariant**: Both flows use the same `createInquirySubmission()` service. AI agent does not bypass existing business logic.

## Owner Assistant (Business Operations Assistant)

### Overview
A conversational AI interface for authenticated business owners to interact with their business data and operations. Distinct from the customer-facing AI Agent — this is an **internal operations tool** for searching data, analyzing metrics, and executing write operations.

**Terminology**: Internal code uses "Owner Assistant" (`features/owner-assistant/`). Owner-facing UI calls it simply **Assistant**. Each Assistant Session has its own URL, a title derived from the opening message, and a member-scoped history sidebar (rename, delete, paginated).

### Owner Assistant Session
A conversational interaction between a business owner/member and the operations assistant. Sessions are persisted in the database and can be resumed across devices and browser sessions.

**Lifecycle**: Active sessions can be resumed. Assistant history is retained indefinitely. (The 30-day purge applies only to Agent transcripts that never produced an Inquiry — see ADR 004.)

**Context maintained** (persisted in `owner_assistant_sessions` and `owner_assistant_messages`):
```ts
{
  sessionId: string;        // Changed from conversationId for consistency
  businessId: string;
  userId: string;
  userRole: string;
  plan: string;
  state: {
    lastMentioned: {
      inquiryId?: string;
      quoteId?: string;
      customerId?: string;
    };
  };
  messages: Array<{role, content}>; // Stored in separate table
}
```

### Owner Assistant Tools
Capabilities the assistant can invoke. Three categories:

#### Read Tools (Search & Analytics)
- `search_inquiries`: Filter inquiries by status, date range, customer, AI-assisted flag, tags
- `get_inquiry_stats`: Counts by status, sources, conversion metrics
- `search_quotes`: Filter quotes by status, value range, customer, date
- `get_quote_stats`: Pipeline value, acceptance rate, average quote value
- `get_conversion_analytics`: Conversion funnel, rates over time (plan-gated: Pro+)
- `search_customers`: Find by name, email, associated inquiries/quotes
- `search_knowledge`: RAG search over business memory
- `get_follow_up_stats`: Pending, overdue, completion metrics
- `get_workflow_analytics`, `schedule_follow_up`: schemas exist but are **not implemented** — building or deleting them is a deferred decision, not part of the current surface. The Assistant never claims they exist.

#### Write Tools (Operations)
- `create_inquiry`: Manual inquiry entry (reuses `createInquirySubmission()`)
- `create_quote`: Generate quote from inquiry or scratch (reuses quote creation service)
- `update_inquiry_status`: Transition inquiry lifecycle (new → quoted → won/lost)
- `send_quote`: Deliver quote via email or link (reuses quote delivery service)
- `schedule_follow_up`: Create follow-up reminder

#### Tool Authorization
- All tools require authenticated user + business membership
- Business-scoped queries via `getBusinessActionContext()`
- Plan-gated tools (analytics) return upgrade prompts for insufficient plans
- High-risk operations require confirmation (see Write Operation Safety)

### Write Operation Safety
Tools are categorized by risk level:

**Low-risk (auto-execute)**:
- `create_inquiry` (manual entry)
- `search_*` (all read operations)
- `get_*_stats` (all analytics)

**High-risk (require confirmation)**:
- `send_quote` (triggers email delivery, customer notification)
- `update_inquiry_status` (alters the pipeline)

A staged confirmation is consumed exactly once by a server action; only then does the operation execute through the shared product service with an audit record. Drafting (`create_inquiry`, `create_quote`) is not gated.

High-risk tools include `requiresConfirmation: true` metadata. The assistant generates a confirmation prompt:
```
"I've prepared to send Quote #123 to john@example.com. Confirm to send."
```

User must explicitly confirm before execution.

### Tool Result Presentation
Tools return structured results that the UI renders as rich components, not just text:

**Result types**:
- `inquiry_list`: Renders `<InquiryListCard>` component
- `quote_list`: Renders `<QuoteListCard>` component
- `stats_summary`: Renders `<StatsSummaryCard>` with metrics
- `chart_data`: Renders charts (conversion funnel, timeline, etc.)
- `error`: Renders error alert with actionable message

Example tool response:
```ts
{
  type: "inquiry_list",
  data: Array<Inquiry>,
  summary: "Found 8 inquiries from the past week",
  metadata: { total: 47, filtered: 8 }
}
```

The assistant's message is the summary; the UI renders the data component.

### Plan Entitlement Integration
Owner Assistant respects existing plan limits (`lib/plans/entitlements.ts`):

**Free plan**: Basic search, inquiry/quote stats, create operations
**Pro plan**: + conversion analytics, AI quote drafting, knowledge base search
**Business plan**: + workflow analytics, advanced operational metrics

When a Free user requests Pro features, tools return:
```ts
{
  error: "PLAN_LIMIT",
  feature: "analyticsConversion",
  message: "Conversion analytics require Pro plan",
  upgradeUrl: "/checkout?plan=pro"
}
```

The assistant translates to natural language: "Conversion analytics are available on the Pro plan. [Upgrade to unlock]."

**Key principle**: The assistant is visible to all plans. Features are gated at the tool level, not the UI level.

### Entry Points
Multiple access paths, all leading to the same experience:

1. **Home widget** (primary): Floating input on `/b/[slug]/home` → collect first prompt → redirect to `/b/[slug]/assistant` with prompt in session storage
2. **Sidebar navigation**: Direct link to `/b/[slug]/assistant`
3. **Command menu**: `Cmd+K` → "Ask Assistant" → navigate to `/b/[slug]/assistant`
4. **Context actions** (future): Deep-link with pre-filled context

**Home widget design**:
- Desktop: Prominent hero section (top of home page), integrated layout
- Mobile: Responsive top section (non-floating), less prominent
- Placeholder: "Create a quote, search inquiries, get analytics..."
- Example prompts: Meta text below input, non-interactive

**Assistant page** (`/b/[slug]/assistant`):
- Standard dashboard layout (sidebar visible, PageHeader)
- Full-height chat interface (message history + fixed input)
- Empty state: Interactive prompt cards (clickable examples)
- "Clear conversation" button to reset session

### Security Model
Unlike the customer-facing agent (session token auth), the owner assistant uses **authenticated sessions**:

**Authorization flow**:
1. User must be logged in (Better Auth)
2. Request includes business context (from URL slug)
3. Server validates user is member of business via `getBusinessActionContext()`
4. Tools receive resolved business context, never trust LLM-provided IDs
5. Role-based permissions enforced (initially all roles allowed, V2 may add role-specific tool restrictions)

**Prompt injection defense**:
- Owner input is still untrusted (malicious prompts could attempt data exfiltration)
- Tools enforce authorization at database layer
- Input sanitization via `lib/ai/input-sanitizer.ts`
- Output filtering via `lib/ai/output-filter.ts`
- Rate limiting per user/business

### Error Handling & Rollback
Write operations are **not transactional** across multiple tools. Each tool is an independent mutation.

When a multi-step operation fails:
```
Owner: "Create a quote and send it to the customer"
→ create_quote succeeds (Quote #123 created)
→ send_quote fails (email service down)
```

**Behavior**: No automatic rollback. Assistant reports:
> "I've created Quote #123, but failed to send it due to [error]. You can send it manually from the quote page or try again."

Tools should be **idempotent** where possible (e.g., `send_quote` checks if already sent).

### Audit Logging
All write operations are logged via existing `lib/db/schema/audit.ts`:

```json
{
  "action": "owner_assistant.tool_call",
  "actor": "user-123",
  "resource": "quote-456",
  "details": {
    "tool": "create_quote",
    "parameters": {"inquiryId": "789"},
    "success": true
  }
}
```

**Privacy**: Raw natural language queries are **not logged** (may contain sensitive data). Only tool executions are audited.

### AI Infrastructure Reuse
Owner Assistant shares the existing AI infrastructure (`lib/ai/`):
- Model routing via `router.ts`
- Usage tracking via `usage-limiter.ts` (business-scoped)
- Token logging, cache layers, request dedup
- Quality gate, input sanitizer, output filter

Owner and customer chats draw from the same **business AI budget** (correct — it's the business's resource pool).

**Only differences**: Tool inventory and system prompt (injected context includes user role, plan, business info).

### Conversation Context Management
Lightweight context tracking in browser memory:

**System prompt includes**:
```
Business: Acme Services (Pro plan)
User: John Doe (Owner)
Available features: AI quote drafting, analytics, knowledge base, follow-ups
Limits: 50 pricing entries, 25 knowledge sources, 5 forms
```

**Last-mentioned entities**: Tools update `lastMentioned` when operating on resources:
```ts
// After create_quote tool
context.lastMentioned.quoteId = "123";
```

This allows natural follow-ups:
```
Owner: "Create a quote for John Smith"
Assistant: [creates Quote #123]
Owner: "Add a 20% discount"
Assistant: [knows to apply discount to Quote #123]
```

### Multi-Turn Tool Orchestration
Uses Vercel AI SDK `streamText()` with tools. Supports:
- **Sequential calls**: Tool A → result → Tool B → result → final response
- **Parallel calls**: Independent tools execute concurrently
- **Multi-turn**: LLM can call tools, receive results, decide next action

Example flow:
```
Owner: "Create a quote for John Smith's inquiry"
→ Tool: search_inquiries({customerName: "John Smith"})
→ Result: Found inquiry #789
→ Tool: create_quote({inquiryId: "789"})
→ Result: Quote #123 created
→ Assistant: "I've created Quote #123 for John Smith's inquiry #789."
```

LLM orchestrates the sequence autonomously.

### Rollout Strategy
The Assistant is available on every plan (including free) with a per-plan daily message bucket (free 25 / pro 250 / business 1000). The Agent requires Pro or above with a separate monthly session bucket (pro 100 / business 500, 50 messages per session). Volume limits render the standard paywall prompt inside the conversation; navigation is never hidden by plan.

How the two surfaces are built is described in `docs/architecture/assistant-and-agent.md`. Naming and privacy boundaries are recorded in ADR 003 and ADR 004, which supersede the corresponding parts of ADR 002.

## Language

**The core invariant**: **Agent** means customer-facing. **Assistant** means owner-facing. This holds in code, schema, documentation, and internal conversation — never use one word for the other. A customer never sees both surfaces, so customer-facing UI copy may use friendlier wording ("Chat with us"); internal language stays strict.

|  | Agent | Assistant |
|---|---|---|
| Speaks to | A prospective customer | The business owner or a member |
| Identity | Anonymous — no account | Authenticated member of the business |
| Surface | Public, per-business | Inside the business dashboard |
| Produces | A qualified Inquiry | Inquiries, Quotes, answers about the business |
| History | Private to the customer; not browsable by the business | Persisted and resumable by its owner |

**Agent**:
The customer-facing conversational surface that qualifies a prospective customer into an Inquiry.
_Avoid_: AI Assistant, chatbot, customer assistant, bot

**Assistant**:
The owner-facing conversational surface for operating the business — searching its data and creating Inquiries and Quotes.
_Avoid_: Agent, owner agent, copilot, AI chat

**Agent Session**:
One anonymous customer conversation with the Agent, from first message until it produces an Inquiry or is abandoned.
_Avoid_: Conversation, chat, thread

**Assistant Session**:
One owner conversation with the Assistant. Resumable by the member who created it.
_Avoid_: Agent session, chat log

**Agent Message** / **Assistant Message**:
A single turn within the corresponding session.
_Avoid_: Chat message (ambiguous with Inquiry Note)

**Inquiry Note**:
A human-written note or response recorded against an Inquiry. Not a chat transcript.
_Avoid_: Message, comment, chat message

**Tool**:
A capability either surface can invoke mid-conversation.
_Avoid_: Function, action, skill

**Qualification**:
Collecting enough information in an Agent Session to create a valid Inquiry.
_Avoid_: Intake, triage, lead capture

**Business Memory**:
An owner-maintained knowledge entry retrieved during conversation.
_Avoid_: Knowledge base article, document, embedding

### Reserved / rejected terms
- ❌ **"Customer"** as a standalone entity — there is none; customer details are fields on an Inquiry or Quote.
- ❌ **"AI Inquiry"** — an Inquiry created by the Agent is just an Inquiry, distinguished by `source` and `ai_assisted`.
- ❌ **"Conversation"** as a type name — ambiguous across the two surfaces. Use Agent Session or Assistant Session.

## Edge Cases

### Abandoned Sessions
Customer starts chat, provides partial info, leaves. No inquiry created. Session remains `active` until:
- 1 hour timeout → mark `abandoned`
- Customer returns within 1 hour → resume session

### Duplicate Conversations
Customer opens multiple browser tabs. Each gets a separate session token (no shared state). If they create inquiries in both, business sees 2 inquiries (acceptable; existing form allows this too).

Future: Detect duplicate by email and merge/flag.

### Mid-Session Handoff
Customer asks for human help halfway through qualification. Agent calls `request_human_handoff` tool:
- Session → `human_handoff`
- Create partial inquiry with `needsAttention=true` flag
- Business owner sees inquiry marked "AI needs help"
- The Agent Session transcript is snapshotted onto that Inquiry, so the owner has the context for the request they received

**Privacy boundary**: this snapshot is the *only* way an Agent transcript reaches the business. There is no surface for browsing or searching customer conversations, and no transcript is exposed for a session that never produced an Inquiry.

### Session Expiry
Sessions older than 24 hours with status `active` → auto-mark `abandoned` (background job). Messages retained for analytics.

### Rate Limit Hit
Customer exceeds per-session message limit (50 messages). Agent returns polite error: "This conversation has reached its limit. Please submit an inquiry form or contact us directly."

## Non-Goals (Explicitly Out of Scope)

### V1 Does NOT Include
- Quote generation/sending via AI
- Follow-up automation
- Email agent
- Multi-channel support (email/SMS/WhatsApp)
- Customer identity across inquiries
- Agent configuration UI (uses hardcoded defaults)
- Approval workflows
- Analytics dashboard
- A/B testing
- Autonomous pricing

### Why These Boundaries Matter
The AI agent in V1 is **a conversational inquiry form**, not a full customer service automation platform. It collects the same information as the form, just through natural conversation.

Quoting, follow-ups, and email are separate workflows that may be AI-assisted later, but they operate on inquiries (the output of qualification), not during the session.
