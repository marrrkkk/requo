# Design Document: Workflow Automation Builder

## Overview

This design describes the technical architecture for Requo's workflow automation system. The system is composed of five layers: schema/domain, event dispatch, scheduled execution, action execution, and UI (quick automations + visual builder). It integrates with existing mutations, follows the feature-oriented architecture, and respects plan entitlements.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  UI Layer                                                        │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐  │
│  │ Quick Automation UI  │  │ Visual Workflow Builder (React Flow)│ │
│  │ (Card presets, list) │  │ (Canvas, node config panel)       │  │
│  └─────────┬───────────┘  └──────────────┬───────────────────┘  │
│            │                              │                       │
│            └──────────┬───────────────────┘                      │
│                       ▼                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Server Actions (CRUD for business_automations)          │    │
│  │  features/automations/actions.ts                          │    │
│  └─────────────────────────────┬───────────────────────────┘    │
└────────────────────────────────┼────────────────────────────────┘
                                 │
┌────────────────────────────────┼────────────────────────────────┐
│  Execution Layer               │                                 │
│                                ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Event Dispatcher                                        │    │
│  │  features/automations/dispatcher.ts                      │    │
│  │  - Called from existing mutations                        │    │
│  │  - Queries matching rules                                │    │
│  │  - Evaluates conditions                                  │    │
│  │  - Routes to immediate exec or scheduler                 │    │
│  └──────────┬──────────────────────┬───────────────────────┘    │
│             │                      │                             │
│             ▼                      ▼                             │
│  ┌──────────────────┐  ┌────────────────────────────┐           │
│  │ Immediate Exec   │  │ Scheduled Job Creator       │           │
│  │ (fire-and-forget │  │ (writes to                  │           │
│  │  via waitUntil)  │  │  automation_scheduled_jobs) │           │
│  └────────┬─────────┘  └──────────────┬─────────────┘           │
│           │                            │                         │
│           ▼                            ▼                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Action Executor Registry                                │    │
│  │  features/automations/executors/index.ts                 │    │
│  │  - create_follow_up                                      │    │
│  │  - send_email                                            │    │
│  │  - send_notification                                     │    │
│  │  - update_inquiry_status                                 │    │
│  │  - update_quote_status                                   │    │
│  │  - archive_inquiry                                       │    │
│  │  - create_job_from_quote                                 │    │
│  │  - generate_invoice                                      │    │
│  │  - generate_draft_quote                                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Cron: Scheduled Job Processor                           │    │
│  │  app/api/cron/automations/route.ts                       │    │
│  │  - Polls pending jobs every 5 min                        │    │
│  │  - Executes due actions                                  │    │
│  │  - Handles retries with backoff                          │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│  Data Layer                                                       │
│  ┌───────────────────┐ ┌──────────────────┐ ┌────────────────┐  │
│  │business_automations│ │automation_        │ │automation_logs │  │
│  │                   │ │scheduled_jobs     │ │                │  │
│  └───────────────────┘ └──────────────────┘ └────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## File Structure

```
features/automations/
├── types.ts                    # Domain types, trigger/action enums, Zod schemas
├── dispatcher.ts               # Event dispatcher (emitEvent)
├── condition-evaluator.ts      # Condition predicate evaluation
├── scheduler.ts                # Create/cancel scheduled jobs
├── processor.ts                # Scheduled job processor logic
├── queries.ts                  # Database queries (list, get, history)
├── mutations.ts                # Server actions (create, update, delete, toggle)
├── entitlements.ts             # Plan limit checks for automations
├── onboarding-defaults.ts      # Default automation templates by business type
├── executors/
│   ├── index.ts                # Executor registry and dispatcher
│   ├── create-follow-up.ts
│   ├── send-email.ts
│   ├── send-notification.ts
│   ├── update-inquiry-status.ts
│   ├── update-quote-status.ts
│   ├── archive-inquiry.ts
│   ├── create-job-from-quote.ts
│   ├── generate-invoice.ts
│   └── generate-draft-quote.ts
├── components/
│   ├── automation-list.tsx      # List of all business automations
│   ├── automation-card.tsx      # Single automation summary card
│   ├── quick-automation-presets.tsx  # Preset cards for one-click setup
│   ├── automation-form.tsx      # Create/edit form (sheet-based)
│   ├── automation-history.tsx   # Execution log viewer
│   └── builder/
│       ├── workflow-canvas.tsx  # React Flow canvas wrapper
│       ├── nodes/
│       │   ├── trigger-node.tsx
│       │   ├── condition-node.tsx
│       │   ├── delay-node.tsx
│       │   └── action-node.tsx
│       ├── edges/
│       │   └── automation-edge.tsx
│       ├── panels/
│       │   ├── node-config-panel.tsx
│       │   └── workflow-toolbar.tsx
│       ├── hooks/
│       │   ├── use-workflow-state.ts
│       │   └── use-undo-redo.ts
│       └── utils/
│           ├── serializer.ts    # Graph ↔ JSON serialization
│           └── validator.ts     # Workflow validation rules

lib/db/schema/
├── automations.ts              # Drizzle schema definitions

app/api/cron/automations/
├── route.ts                    # Cron endpoint for scheduled job processing

app/(business)/[businessSlug]/settings/automations/
├── page.tsx                    # Automations settings page
├── loading.tsx

app/(business)/[businessSlug]/automations/
├── page.tsx                    # Full automations dashboard
├── [automationId]/
│   ├── page.tsx                # Automation detail/edit
│   └── builder/
│       └── page.tsx            # Visual workflow builder page
```

## Key Design Decisions

### 1. Event Dispatch via Direct Calls (not pub/sub)

We use direct function calls (`emitEvent`) from mutations rather than a message queue or pub/sub system. Reasoning:
- Requo runs on Vercel serverless — no persistent process for event consumers
- Direct calls are simpler to trace, test, and debug
- `waitUntil` provides non-blocking execution for non-critical actions
- A message queue can be introduced later if scale demands it

### 2. JSONB for Flexibility

Trigger configs, conditions, and actions use JSONB columns rather than normalized relational tables. This allows:
- Easy schema evolution without migrations for new action/trigger types
- Direct serialization of React Flow graph state
- Flexible condition predicates without a rigid condition table

### 3. Cron-based Scheduling (not real-time queue)

Delayed automations use a database table polled every 5 minutes rather than a dedicated job queue (e.g., BullMQ, Trigger.dev). Reasoning:
- No additional infrastructure dependency
- 5-minute granularity is acceptable for business workflow automation (follow-ups, expiration)
- Fits within Vercel Cron capabilities
- Can migrate to Trigger.dev later if sub-minute precision is needed

### 4. Dual UI: Quick Automations + Visual Builder

- Quick Automations: covers 80% of use cases (simple trigger → action with delay)
- Visual Builder: covers advanced multi-step, conditional workflows
- Both serialize to the same `business_automations` schema
- Visual Builder is plan-gated to drive upgrades

### 5. React Flow for Visual Builder

- Industry standard for node-based UIs in React
- Active maintenance, good TypeScript support, MIT license
- Custom nodes styled with Requo design tokens
- Serializes naturally to nodes/edges JSON

## Trigger Payload Schemas

Each trigger type emits a standardized payload:

```typescript
type TriggerPayload = {
  'inquiry.received': { inquiryId: string; customerName: string; source: string; formId: string }
  'inquiry.qualified': { inquiryId: string; qualifiedAt: string }
  'inquiry.archived': { inquiryId: string; reason: string }
  'quote.created': { quoteId: string; inquiryId: string; amount: number }
  'quote.sent': { quoteId: string; sentAt: string; recipientEmail: string }
  'quote.viewed': { quoteId: string; viewedAt: string }
  'quote.accepted': { quoteId: string; acceptedAt: string; amount: number }
  'quote.rejected': { quoteId: string; rejectedAt: string; reason?: string }
  'quote.expired': { quoteId: string; expiredAt: string }
  'job.created': { jobId: string; quoteId: string; title: string }
  'job.completed': { jobId: string; completedAt: string }
  'invoice.sent': { invoiceId: string; jobId: string; amount: number; recipientEmail: string }
  'invoice.paid': { invoiceId: string; paidAt: string; amount: number }
  'invoice.overdue': { invoiceId: string; dueDate: string; amount: number }
  'follow_up.due': { followUpId: string; quoteId?: string; inquiryId?: string }
  'follow_up.overdue': { followUpId: string; overdueBy: number }
}
```

## Condition Evaluation

Conditions are evaluated as predicate objects:

```typescript
type Condition = {
  field: string        // dot-path into trigger payload (e.g., "amount", "source")
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains'
  value: string | number | boolean
}
```

Multiple conditions are AND-joined. The condition evaluator resolves the field path against the trigger payload and applies the operator.

## Security Model

- All queries/mutations validate session + business membership
- Event dispatcher only matches rules for the emitting business
- Scheduled job processor re-validates business ownership before execution
- Action executors receive scoped businessId and cannot access cross-tenant data
- CRUD operations use server actions with Zod validation
- Rate limits prevent abuse (50 creates/hour, 200 emissions/minute per business)
