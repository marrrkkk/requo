# Requo Domain

What Requo's business concepts mean. Uses the application's own terminology.

Related: `docs/architecture.md`, `docs/data.md` (tables), `docs/workflows.md` (end-to-end flows), `docs/ai.md` (Agent/Assistant/RAG).

## Terminology

**Agent** = customer-facing anonymous chat that qualifies a visitor into an Inquiry. **Assistant** = owner-facing authenticated chat for operating the business. Never swap the words (ADR 003). Customer-facing copy may say "chat assistant"; internal language stays strict.

**Service** = an offering a business sells and the unit of intake. Backed by the `business_inquiry_forms` table (name kept to avoid migration); routes, components, and copy use "Service". Owns its intake form, public page, default/public/archive state, and URL slug. The **Form tab** inside the Service editor edits the intake mechanism.

**Customer is not an entity.** Customer details (`customerName`, `customerEmail`, `customerContactMethod`, `customerContactHandle`) are denormalized fields on inquiries and quotes. No cross-inquiry identity or deduplication.

**Inquiry Note** = human-written note/response on an inquiry (`inquiry_notes`). Not a chat transcript. **Agent/Assistant Message** = a recorded chat message (`ai_agent_messages`, `owner_assistant_messages`).

**Follow-up** (owner reminder task, `follow_ups`) vs **Follow-up Email** (unattended customer sequence, `quotes.autoFollowUp*`) vs **Suggested Message** (copy-paste draft) vs **Reply Snippet** (orphaned `reply_snippets` row, no send path). Never use "follow-up" alone for the email.

**Email Template** = customizable block config (`businesses.quote_email_template`, `invoice_email_template`, `quote_follow_up_template`). Edited in Settings → Email templates.

## Core entities

| Entity | Purpose | Ownership | Table(s) |
|---|---|---|---|
| Business | Tenant; container for everything billable | `ownerUserId`, members via `business_members` | `businesses`, `business_members`, `profiles` |
| Service | Offering + intake form + public page | `businessId` | `business_inquiry_forms` |
| Inquiry | Qualified customer request | `businessId` (+ optional `businessInquiryFormId`) | `inquiries`, `inquiry_notes`, `inquiry_attachments`, `inquiry_messages`, `inquiry_duplicates` |
| Proposed Inquiry | Agent-staged result awaiting visitor approval; commits nothing | session state on `ai_agent_sessions` | no table (session `state` JSONB) |
| Quote | Priced proposal with line items, versions, delivery state | `businessId` (+ optional `inquiryId`) | `quotes`, `quote_items`, `quote_versions`, `quote_revision_requests` |
| Quote library entry | Reusable block/package/template + items | `businessId` | `quote_library_entries`, `quote_library_entry_items` |
| Invoice | Payment request from accepted quote or standalone; snapshot on send | `businessId` (+ optional `quoteId`) | `invoices`, `invoice_line_items` |
| Payment | Manually recorded amount against one invoice | `businessId` → invoice | `payments` |
| Follow-up | Owner reminder task linked to inquiry and/or quote | `businessId` | `follow_ups` |
| Business Memory | Owner-maintained knowledge for RAG grounding | `businessId` | `business_memories`, `business_knowledge_files`, `business_knowledge_chunks` |
| Notification | In-app event for a business | `businessId` | `business_notifications`, `..._states`, `..._reads` |
| Subscription | Business billing state | `businessId` (unique) | `business_subscriptions`, `billing_events` |

## Lifecycles and states

**Service:** `live` (default + public) → `live-non-default` → `unpublished` (public disabled) → `archived` (kept for history, no submissions). Starter template recorded in `business_type`; new Services inherit the business template.

**Inquiry** (`inquiry_status`): `new` → `quoted` → `waiting` → `won` | `lost` | `archived`. `overdue` is a derived display state. `ai_assisted` flag is orthogonal to `source` (`service_form` | `ai_assistant` | `manual` | `api` | `unknown`, `features/inquiries/types.ts`; legacy values like `ai_agent` normalize via `normalizeInquirySource`): a chat-then-form submission is `source = "service_form"`, `ai_assisted = true`.

**Agent Session** (`ai_agent_session_status`): `active` → `completed` (inquiry created) | `human_handoff` | `abandoned` (timeout, hourly sweep; transcripts without inquiry purged after 30 days).

**Assistant Session:** long-lived, per member (`businessId` + `userId`), retained indefinitely. No completed state.

**Quote** (`quote_status`): `draft` → `sent` → `accepted` | `rejected` | `revision_requested` → (new version) → `sent` … → `expired` | `voided`. `publicToken` gates the public page. `autoFollowUp*` fields drive the unattended nudge sequence. `aiReadiness` (`ready` | `needs_confirmation` | `scope_only`) + `aiMissingInfo` describe AI-draft confidence — display only, never price authority.

**Invoice** (`invoice_status`): `draft` → `sent` → `unpaid` | `partially_paid` → `paid` | `overdue`; `voided` terminal. One non-void invoice per quote (`businessId, quoteId` unique partial). Payments are manual records; voided payments excluded from balances.

**Follow-up** (`follow_up_status`): `pending` → `completed` | `skipped`. Requires `inquiryId` OR `quoteId`. Recurrence (`none`/`daily`/`weekly`/…) with termination condition.

**Knowledge file** (`knowledge_file_status`): `pending` → `processing` → `ready` | `failed`.

## Business rules and invariants

- Both intake paths (public Service submit, Agent approve) funnel through `createInquirySubmission` (`features/inquiries/mutations.ts`) — the Agent never bypasses intake logic.
- Qualification minimums (Agent): `customerName`, contact (`customerEmail` or handle), `targetServiceId` (resolved from live Services, never free-form), `details`. Optional: `requestedDeadline`, `budgetText`.
- Autonomy: knowledge search automatic; inquiry creation proposed-then-approved by the visitor; handoff escalation immediate and ungated (ADR 005).
- Pricing authority: quote-library DB rows only. Memories and past quotes are context, never price sources. The model must return `unitPriceInCents: 0`; server hydrates prices.
- Transcript privacy (ADR 004): the handoff/inquiry snapshot is the only path an Agent transcript reaches the business.
- Every tool independently verifies tenant context from the session — never trusts LLM-provided IDs.
- One invoice per quote (non-void); invoice totals are snapshots once sent.
- `businesses.plan` is a denormalized read cache; `business_subscriptions` is authoritative.
