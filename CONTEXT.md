# Requo Domain Model

## Core Entities

### Business
A tenant in the multi-tenant SaaS. Each business has its own inquiries, quotes, services, knowledge, and configuration. Identified by `slug` in public URLs and `id` internally.

### Service
A service a business offers. A Service is the unit of intake: it owns its intake form, public page design, default/public/archive state, and public URL slug. A business can have multiple live Services (plan-gated).

- **Code/storage identity**: backed by the `business_inquiry_forms` row (table name kept to avoid migration; user-facing copy and routes use "Service" exclusively).
- **Public URL**: `/inquire/{businessSlug}` (default service) or `/inquire/{businessSlug}/{serviceSlug}` (named service).
- **Dashboard URL**: `/{businessSlug}/services` (list) and `/{businessSlug}/services/{serviceSlug}` (editor with Form | Service page | Settings).
- **Lifecycle per service**: `live` (default + public enabled), `live-non-default` (public enabled, not default), `unpublished` (public disabled), `archived` (no longer accepts submissions, kept for historical inquiries).
- **Starter template**: the `business_type` column records the starter template that seeds a Service's fields and page copy. Creating a Service asks only for a name and silently inherits the business's template; changing a Service's template happens in Settings → Template (apply-preset), never in the editor's identity panel.
- **Service description**: the public page's description field doubles as the Service's description — it appears in the services list and on the public page. There is no separate description field.

A Service is the entity the customer thinks in ("deep cleaning"); the underlying intake form is implementation detail.

### Inquiry
A customer request for a service. Created either through:
- Public Service submission → immediate inquiry with status="new", linked to the originating Service
- AI agent conversation → session qualifies → Proposed Inquiry → the prospective customer approves → inquiry created with status="new" and linked to the Service they were qualifying for

An inquiry is **not** the conversation itself; it's the qualified, structured result.

**Lifecycle**: `new` → `quoted` → `waiting` → `won` | `lost` | `archived`

**Key distinction**: The existing `inquiry_messages` table is for human-written notes and responses on inquiries, not AI chat transcripts.

### Proposed Inquiry
A structured inquiry the Agent has assembled from an Agent Session and put to the prospective customer for approval. It is not an Inquiry — nothing reaches the business until the person it describes approves it. Editable both directly and by continuing the conversation, and superseded rather than versioned, so a session holds at most one.

### Agent Session (customer-facing)
A conversational interaction between a prospective customer and the AI agent. Exists independently until it produces a qualified inquiry.

**Terminology note**: Internal schema and code use "AI Agent" (`ai_agent_sessions`, `features/ai-agent/`, etc.). Customer-facing copy calls it a **chat assistant** or **public chat** — never "AI Assistant", which names the owner-facing surface. See ADR 003. This avoids production database migrations while keeping product naming unambiguous.

**Lifecycle**: `active` → `completed` | `human_handoff` | `abandoned`

- **Active**: Conversation in progress, collecting information
- **Completed**: Sufficient information collected, inquiry created successfully
- **Human handoff**: Agent determined it cannot help; requires human attention
- **Abandoned**: Customer left without completing — no inquiry created, including when a Proposed Inquiry was never approved

**Key principle**: Sessions are ephemeral qualification containers. Once they create an inquiry, the inquiry becomes the authoritative record.

### AI Agent Message
A single message within an agent session. Roles: `user` (customer), `assistant` (AI), `tool` (tool result), `system` (internal).

Stored separately from inquiry data. These are chat transcripts, not inquiry notes.

### AI-Assisted Attribution
The `inquiries.ai_assisted` boolean flag tracks whether AI was involved in collecting the inquiry, regardless of final submission method. This allows analytics to measure AI impact even when customers complete via a Service.

**Attribution model**:
- `source`: Final submission method (`service` (was `form`), `ai_agent`, `manual`, `api`)
- `ai_assisted`: Whether AI participated at any point in qualification (`true`/`false`)

Example: Customer chats with AI, then completes a Service submission → `source = "service"`, `ai_assisted = true`.

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

### Turn Budget
A bounded allowance for one AI Turn, covering the estimated context tokens sent to a provider and the maximum response tokens reserved for that turn. A Turn Budget is a reliability control, not a user-visible plan entitlement. Requo keeps recent context plus a compact extractive summary when a session grows, and reserves provider TPM headroom before starting a stream.

### Provider Budget
The conservative per-minute token allowance used by Requo for one provider/model pool. It is configured from deployment environment variables and intentionally sits below the provider's published or observed limit. The provider dashboard remains authoritative; a Provider Budget prevents avoidable TPM errors but cannot guarantee availability.

### Stream Recovery
The bounded recovery path after a streamed AI Turn fails. The transcript and any partial reply remain visible, and the member or visitor can retry with the same user turn after context compaction. A retry must not repeat a side-effecting Tool unless that Tool is idempotent or has not executed.

### Tool
A capability the AI agent can invoke during conversation. MVP tools:
- `search_knowledge`: Retrieve relevant business memories via RAG
- `get_business_info`: Return public business information
- `get_services`: List the business's live Services (the offerings a prospective customer can ask about — sourced from `business_inquiry_forms` with `archived_at IS NULL` and `public_inquiry_enabled = true`)
- `propose_inquiry`: Stage a Proposed Inquiry for the prospective customer to review and send (commits nothing — see Proposed Inquiry)
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
- `targetServiceId` (the Service the prospective customer is asking about — the agent resolves this from the live Services list and the customer's description, not from a free-form category)
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
    "targetServiceId": true,
    "details": true
  },
  "values": {
    "customerName": "John Smith",
    "customerEmail": "john@example.com",
    "targetServiceId": "deep-cleaning",
    "details": "Need an e-commerce site for my bakery"
  },
  "missing": []
}
```

The agent conducts natural conversation while the application maintains structured state. `serviceCategory` on the persisted inquiry record is set to the chosen Service's name; customers no longer re-pick a category from a dropdown the Service already implies.

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
The Agent operates at `assist`: low-risk steps run on their own, and the one step that commits a record to the business waits for approval.
- Knowledge search: automatic
- Inquiry creation: proposed, then approved by the prospective customer (see Proposed Inquiry)
- Human handoff: automatic when conditions met — an escalation is never gated behind an approval

Levels not used: `suggest` (drafts only), `autonomous` (all automatic).

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

### Public Service Flow
```
Customer → /inquire/{slug} or /inquire/{slug}/{serviceSlug} →
  submitPublicInquiryAction() → createInquirySubmission() (linked to the Service) →
  inquiries table (status="new") → Business inbox
```

### AI Agent Flow (MVP)
```
Customer → AI chat UI →
  Session created →
  Conversation (multiple turns) →
  Agent lists live Services via get_services and qualifies the customer against one →
  Qualification complete →
  propose_inquiry tool (stages Proposed Inquiry, commits nothing) →
  Prospective customer reviews, edits, and approves →
  approveAgentProposalAction() → createInquirySubmission() →
  inquiries table (status="new") → Business inbox →
  Session status="completed"
```

**Key invariant**: Both flows use the same `createInquirySubmission()` service. AI agent does not bypass existing business logic.

## Owner Assistant (Business Operations Assistant)

### Overview
A conversational AI interface for authenticated business owners to interact with their business data and operations. Distinct from the customer-facing AI Agent — this is an **internal operations tool** for searching data, analyzing metrics, and executing write operations.

**Terminology**: Internal code uses "Owner Assistant" (`features/owner-assistant/`). Owner-facing UI calls it simply **Assistant**. Each Assistant Session has its own URL, a title derived from the opening message, and appears in a member-scoped history panel opened from the chat header (rename, delete, paginated).

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
Three access paths, all landing on the same composer (dashboard routes are
`/[businessSlug]/...`; `/b/[slug]/...` is the public prefix):

1. **Dashboard home box** (primary): a composer on `/[businessSlug]/home` takes
   the first prompt and hands it to `/[businessSlug]/assistant?q=...`, which
   sends it on arrival. The hand-off clears the box, so returning home finds an
   empty prompt.
2. **Sidebar navigation**: direct link to `/[businessSlug]/assistant`.
3. **Command menu**: `Cmd+K` → "Ask Assistant".

The section root and a saved conversation are one surface: greeting, mark and
composer sit centred until the first send, then the composer settles to the
bottom. `New chat` sits at the left of the header, history at the right. Chrome
detail (shared primitives, motion, the customer/owner asymmetries) lives in
`docs/architecture/assistant-and-agent.md` — not here.

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
One recorded message within the corresponding session, attributed to the person or to the surface.
_Avoid_: Chat message (ambiguous with Inquiry Note)

**Turn**:
One exchange within a session: what the person said and the reply it produced. A reply may be recorded as several Messages while still reading as one Turn.
_Avoid_: Block, group, round, exchange

**Inquiry Note**:
A human-written note or response recorded against an Inquiry. Not a chat transcript.
_Avoid_: Message, comment, chat message

**Tool**:
A capability either surface can invoke mid-conversation.
_Avoid_: Function, action, skill

**Tool Step**:
One invocation of a Tool within a Turn, together with its outcome. A member may inspect the steps behind an Assistant reply; a customer is never shown the steps behind an Agent reply.
_Avoid_: Trace, process, step log, tool run (that is an Agent Run)

**Qualification**:
Collecting enough information in an Agent Session to create a valid Inquiry.
_Avoid_: Intake, triage, lead capture

**Proposed Inquiry**:
The structured result of Qualification, put to the prospective customer for approval before it becomes an Inquiry.
_Avoid_: Inquiry draft, draft inquiry, inquiry preview, pending inquiry

**Business Memory**:
An owner-maintained knowledge entry retrieved during conversation.
_Avoid_: Knowledge base article, document, embedding

### Navigation Rendering

**Static Shell**:
The portion of a dashboard route that renders immediately on navigation,
before any per-request data arrives: the persistent business shell (sidebar,
top bar, mobile navigation) plus the destination page's static structure
(title, description, control chrome, skeleton fallbacks).
_Avoid_: Page skeleton (a route-level blank state), loading spinner

**Progressive Region**:
One independently-loading section of a page — an async Server Component
behind its own `<Suspense>` boundary (and, where it can fail on its own, a
region error boundary). Fast regions resolve before slow ones; a failed
region leaves the shell and its siblings usable.
_Avoid_: Per-card spinner cascade, blocking page load

**Instant Navigation**:
A client-side route transition that paints the destination's Static Shell
from the prefetched App Shell the moment the link is clicked, while
Progressive Regions stream in after. Backed by the `instant` route segment
config, Partial Prefetching, and per-link pending hints — never by a global
loader.
_Avoid_: Full page reload, global spinner

### Tours

**Dashboard Tour**:
The onboarding product tour shown on the business home. Walks through the
dashboard surfaces once per business membership, in sidebar order: Home,
Inquiries, Quotes, Follow-ups, Assistant, Services, Products, Members,
Analytics — with a "Draft with AI" deep-dive on the Quotes surface right
after the Quotes step. Completion is recorded on the membership.
_Avoid_: Onboarding tour (ambiguous with first-business onboarding), product walkthrough

**Form Editor Tour**:
The one-time walkthrough shown inside the Service editor, stepping through its
three tabs — Form, Service page, Settings (publishing & defaults). Completion
is recorded per user profile.
_Avoid_: Service tour, editor walkthrough, form tour (a form is the intake mechanism inside a Service)

### Reserved / rejected terms
- ❌ **"Customer"** as a standalone entity — there is none; customer details are fields on an Inquiry or Quote.
- ❌ **"AI Inquiry"** — an Inquiry created by the Agent is just an Inquiry, distinguished by `source` and `ai_assisted`.
- ❌ **"User"** for the person on the Agent surface — "User" names an authenticated account holder. The person chatting with the Agent is a **prospective customer** in prose and a **visitor** in code and comments.
- ❌ **"Conversation"** as a type name — ambiguous across the two surfaces. Use Agent Session or Assistant Session. Owner-facing UI copy may say "conversation" for an Assistant Session, since that is the word a member expects; customer-facing copy never names the session at all.
- ❌ **"Form"** in owner-facing or customer-facing copy for the intake container — that is a **Service**. The DB table stays `business_inquiry_forms` to avoid migration, but routes, components, and copy use **Service**. The exception is the mechanism itself inside the Service editor: the **Form tab** edits the intake form, and customer-facing copy (public pages, emails) may say "form" when pointing at the thing a visitor fills out. Product/pricing copy also drops "service package" — packages are **packages** under Products; the live offer is the **Service**.

**Service**:
An offering a business sells, and the unit of intake — it owns its intake form, public page, default/public/archive state, and URL slug.
_Avoid_: Form (for the container), intake form (as the product object), business type preset

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
- Business-side approval workflows — routing, sign-off, or a review queue before an Inquiry reaches the inbox. Distinct from the prospective customer approving their own Proposed Inquiry, which is in scope.
- Analytics dashboard
- A/B testing
- Autonomous pricing

### Why These Boundaries Matter
The AI agent in V1 is **a conversational inquiry form**, not a full customer service automation platform. It collects the same information as the form, just through natural conversation.

Quoting, follow-ups, and email are separate workflows that may be AI-assisted later, but they operate on inquiries (the output of qualification), not during the session.
