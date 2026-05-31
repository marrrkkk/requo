# Requirements Document

## Introduction

Workflow Automation Builder for Requo. This feature adds event-driven, business-scoped automation rules that fire actions when lifecycle events occur across the inquiry → quote → job → invoice workflow. The system includes a database-backed rule engine, an event dispatcher integrated into existing mutations, a delayed execution scheduler, a visual workflow builder UI (React Flow), quick-automation presets for common patterns, plan-gated access, and smart onboarding defaults. The goal is to let service business owners automate repetitive follow-ups, status transitions, notifications, and document generation without manual intervention — while keeping the system lightweight, auditable, and extendable.

## Glossary

- **Automation_Rule**: A business-scoped record defining a trigger event, optional conditions, optional delay, and one or more actions to execute when the trigger fires.
- **Trigger**: A named lifecycle event that fires when a domain entity changes state (e.g., `quote.sent`, `inquiry.received`, `job.completed`).
- **Action**: A discrete operation performed when an automation rule fires (e.g., create follow-up, send email, update status, generate invoice).
- **Condition**: An optional predicate evaluated after a trigger fires but before actions execute (e.g., "quote value > $500", "inquiry source = website").
- **Delay**: An optional time offset between trigger firing and action execution (e.g., "wait 3 days").
- **Event_Dispatcher**: A server-side module that emits domain events from existing mutations and matches them against active automation rules for the business.
- **Scheduled_Job**: A database row representing a delayed automation action awaiting execution at a future timestamp.
- **Workflow**: A multi-step automation composed of a trigger followed by one or more action nodes, optional condition branches, and optional delays, represented as a directed graph.
- **Workflow_Builder**: A visual drag-and-drop canvas UI built with React Flow that allows business owners to compose multi-step workflows.
- **Quick_Automation**: A simplified single-trigger, single-action automation configured through a card-based UI without the full canvas.
- **Automation_Log**: An audit record of each automation execution including trigger, rule, actions taken, timing, and outcome.

## Requirements

### Requirement 1: Database Schema and Domain Model

**User Story:** As a developer, I want a well-structured schema for automation rules, scheduled jobs, and execution logs, so that the system can store, query, and audit automation behavior reliably.

#### Acceptance Criteria

1. THE system SHALL define a `business_automations` table with fields: id, businessId (FK to businesses with cascade delete), name, description, triggerType (enum), triggerConfig (JSONB), conditions (JSONB array), actions (JSONB array), delay (JSONB with unit and value), enabled (boolean, default true), priority (integer, default 0), createdAt, updatedAt, createdByUserId (FK to user).
2. THE system SHALL define a `automation_scheduled_jobs` table with fields: id, automationId (FK to business_automations with cascade delete), businessId (FK to businesses with cascade delete), triggerPayload (JSONB), scheduledFor (timestamp with timezone), status (enum: pending, processing, completed, failed, cancelled), attempts (integer, default 0), maxAttempts (integer, default 3), lastError (text, nullable), completedAt (timestamp, nullable), createdAt.
3. THE system SHALL define an `automation_logs` table with fields: id, automationId (FK to business_automations with set null on delete), businessId (FK to businesses with cascade delete), triggerType, triggerPayload (JSONB), actionsExecuted (JSONB array), status (enum: success, partial_failure, failure), durationMs (integer), error (text, nullable), createdAt.
4. THE `business_automations` table SHALL have a composite index on (businessId, triggerType, enabled) for efficient rule lookup during event dispatch.
5. THE `automation_scheduled_jobs` table SHALL have an index on (status, scheduledFor) for efficient polling of due jobs.
6. THE system SHALL define a `trigger_type` enum including: `inquiry.received`, `inquiry.qualified`, `inquiry.archived`, `quote.created`, `quote.sent`, `quote.viewed`, `quote.accepted`, `quote.rejected`, `quote.expired`, `job.created`, `job.completed`, `invoice.sent`, `invoice.paid`, `invoice.overdue`, `follow_up.due`, `follow_up.overdue`.
7. THE system SHALL store workflow graph data (nodes and edges for multi-step automations) in the `actions` JSONB field as a serialized directed graph when the automation is a multi-step workflow, and as a flat array of action objects for simple automations.

### Requirement 2: Event Dispatcher

**User Story:** As a developer, I want domain events emitted from existing mutations to automatically trigger matching automation rules, so that the automation system integrates seamlessly without rewriting business logic.

#### Acceptance Criteria

1. THE Event_Dispatcher SHALL expose an `emitEvent(businessId, triggerType, payload)` function that mutations call after successful state changes.
2. WHEN an event is emitted, THE Event_Dispatcher SHALL query all enabled Automation_Rules for the given businessId and triggerType, ordered by priority descending.
3. FOR each matching rule, THE Event_Dispatcher SHALL evaluate conditions against the trigger payload. IF all conditions pass (or no conditions exist), the rule proceeds to action execution.
4. IF a matching rule has a delay configured, THE Event_Dispatcher SHALL create a Scheduled_Job with `scheduledFor` set to `now + delay` instead of executing actions immediately.
5. IF a matching rule has no delay, THE Event_Dispatcher SHALL execute the rule's actions immediately and synchronously within the same server request (fire-and-forget for non-critical actions, awaited for critical actions like status updates).
6. THE Event_Dispatcher SHALL execute within 200ms for the dispatch phase (rule lookup + condition evaluation + scheduling), excluding action execution time.
7. THE Event_Dispatcher SHALL NOT block the original mutation's response to the user. Non-critical action execution (email, notifications) SHALL be deferred using `waitUntil` or equivalent non-blocking pattern.
8. IF action execution fails, THE Event_Dispatcher SHALL log the failure to `automation_logs` with error details and SHALL NOT throw to the calling mutation.
9. THE Event_Dispatcher SHALL be integrated into existing mutation paths by adding `emitEvent` calls to: inquiry creation, inquiry qualification, inquiry archival, quote status changes (sent, accepted, rejected, expired, voided), job creation, job completion, invoice sending, invoice payment, and follow-up due date triggers.

### Requirement 3: Scheduled Job Processor

**User Story:** As a business owner, I want delayed automations (e.g., "follow up 3 days after quote sent") to execute reliably at the scheduled time, so that time-based workflows work without manual intervention.

#### Acceptance Criteria

1. THE system SHALL implement a scheduled job processor invoked via a cron endpoint at `app/api/cron/automations/route.ts`, triggered every 5 minutes by Vercel Cron.
2. WHEN the processor runs, it SHALL query all `automation_scheduled_jobs` with status `pending` and `scheduledFor <= now`, ordered by scheduledFor ascending, limited to 50 jobs per run.
3. FOR each due job, the processor SHALL set status to `processing`, execute the automation's actions with the stored triggerPayload, and set status to `completed` on success or `failed` on error.
4. IF action execution fails, the processor SHALL increment the `attempts` counter. IF attempts < maxAttempts, the status SHALL revert to `pending` with `scheduledFor` pushed forward by `attempts * 15 minutes` (exponential backoff). IF attempts >= maxAttempts, status SHALL be set to `failed`.
5. THE processor SHALL complete within 55 seconds (fitting within a 60-second Vercel function timeout) by processing jobs sequentially and aborting the batch if time budget is exceeded.
6. THE processor SHALL be idempotent: if the cron fires twice in the same window, already-processing or completed jobs SHALL be skipped.
7. WHEN an automation rule is disabled or deleted, any pending scheduled jobs for that rule SHALL be set to `cancelled`.

### Requirement 4: Action Executors

**User Story:** As a business owner, I want automations to perform real actions like creating follow-ups, sending emails, updating statuses, and generating documents, so that my workflow is truly automated.

#### Acceptance Criteria

1. THE system SHALL implement the following action executors, each as a pure function in `features/automations/actions/`: `create_follow_up`, `send_notification`, `send_email`, `update_inquiry_status`, `update_quote_status`, `archive_inquiry`, `create_job_from_quote`, `generate_invoice`, `generate_draft_quote`.
2. EACH action executor SHALL accept a standardized input: `{ businessId, triggerPayload, actionConfig }` and return `{ success: boolean, result?: unknown, error?: string }`.
3. THE `create_follow_up` action SHALL create a follow-up record with configurable title template, reason, channel, and due date offset relative to the trigger event timestamp.
4. THE `send_email` action SHALL use the existing Resend integration to send a templated email, supporting dynamic variables from the trigger payload (customer name, quote number, amount, business name).
5. THE `send_notification` action SHALL create a push notification using the existing notification infrastructure.
6. THE `generate_draft_quote` action SHALL invoke the existing AI quote generator to create a draft quote from inquiry data, leaving it in `draft` status for owner review.
7. THE `create_job_from_quote` action SHALL create a job linked to the accepted quote using the existing job creation logic.
8. THE `generate_invoice` action SHALL create a draft invoice linked to the completed job using the existing invoice creation logic.
9. ALL action executors SHALL validate their actionConfig with Zod before execution and return a typed error if validation fails.

### Requirement 5: Plan Entitlements and Limits

**User Story:** As a product owner, I want automation access gated by plan tier, so that it drives upgrade conversions while giving free users a taste of automation value.

#### Acceptance Criteria

1. THE system SHALL add two new plan features to `lib/plans/entitlements.ts`: `automations` (basic automation access) and `workflowBuilder` (visual multi-step builder access).
2. THE `free` plan SHALL grant `automations` with a limit of 3 active automation rules per business and no access to `workflowBuilder`.
3. THE `pro` plan SHALL grant `automations` with a limit of 20 active automation rules per business and grant `workflowBuilder` access.
4. THE `business` plan SHALL grant `automations` with a limit of 100 active automation rules per business and grant `workflowBuilder` access.
5. WHEN a user attempts to create an automation that would exceed their plan limit, THE system SHALL return a clear error directing them to upgrade.
6. THE visual workflow builder UI SHALL show a paywall upgrade prompt for users on the free plan, with a preview of what multi-step workflows look like.
7. ALL plan checks SHALL use the existing `hasFeatureAccess` pattern and SHALL NOT bypass the entitlement system.

### Requirement 6: Quick Automation UI

**User Story:** As a business owner, I want a simple card-based interface to set up common automations (like "follow up 3 days after quote sent") without needing to use a complex visual builder.

#### Acceptance Criteria

1. THE Quick Automation UI SHALL be accessible from the business settings page under an "Automations" section and from contextual locations (e.g., quote settings, follow-up settings).
2. THE UI SHALL present common automation patterns as preset cards that can be enabled with one click: "Follow up after quote viewed (3 days)", "Expire quotes after 30 days", "Create job when quote accepted", "Follow up on overdue follow-ups", "Notify on new inquiry", "Archive stale inquiries (14 days)".
3. EACH preset card SHALL allow the user to customize timing (delay value), enable/disable toggle, and basic action parameters before saving.
4. THE UI SHALL display all active automations for the business in a list with: name, trigger description, action description, enabled toggle, last triggered timestamp, and edit/delete actions.
5. THE UI SHALL show automation execution history with status (success/failure), timestamp, and trigger context accessible from each automation's detail view.
6. THE UI SHALL use existing shared wrappers (`DashboardSection`, `Card`, `Badge`, `Sheet`) and design tokens per DESIGN.md.
7. WHEN creating or editing an automation, validation errors SHALL be displayed inline using the existing form patterns.

### Requirement 7: Visual Workflow Builder

**User Story:** As a power-user business owner on a Pro or Business plan, I want a drag-and-drop canvas to compose multi-step automations with conditions and delays, so that I can build complex workflows visually.

#### Acceptance Criteria

1. THE Visual Workflow Builder SHALL use `@xyflow/react` (React Flow v12+) as the canvas library, rendering within a full-page or sheet-based editor.
2. THE builder SHALL support the following node types: Trigger (exactly one per workflow, the entry point), Condition (branching based on payload predicates), Delay (configurable time wait), and Action (any supported action executor).
3. EACH node type SHALL have a custom React component styled with Requo design tokens, displaying a clear icon, label, and summary of its configuration.
4. THE builder SHALL allow users to connect nodes via edges (directed connections), enforcing that: a workflow starts with exactly one Trigger node, Condition nodes have exactly two outgoing edges (true/false), and Action/Delay nodes have at most one outgoing edge.
5. THE builder SHALL serialize the workflow graph to a JSON structure containing `{ nodes: [...], edges: [...] }` compatible with the `actions` JSONB field in `business_automations`.
6. THE builder SHALL include a right-side configuration panel that opens when a node is selected, allowing the user to configure that node's parameters (trigger type, condition predicates, delay duration, action config).
7. THE builder SHALL validate the workflow before saving: connected graph, single trigger, no orphan nodes, all required node configs filled. Invalid states SHALL show inline error indicators on the affected nodes.
8. THE builder SHALL provide undo/redo support (at minimum 20 steps) for node additions, deletions, moves, and connections.
9. THE builder SHALL be accessible only to users with `workflowBuilder` feature access. Users without access SHALL see a preview/paywall state.
10. THE builder canvas SHALL be responsive, supporting a minimum viewport width of 768px, with pan and zoom controls.

### Requirement 8: Onboarding Defaults

**User Story:** As a new business owner going through onboarding, I want sensible automation defaults pre-configured for my business type, so that I get immediate value without manual setup.

#### Acceptance Criteria

1. WHEN a new business completes onboarding, THE system SHALL create a set of default automation rules based on the selected business type/template.
2. THE default automations SHALL include at minimum: "Follow up 3 days after quote viewed but not responded", "Expire quotes after 30 days", "Create job when quote accepted", "Notify owner on new inquiry".
3. DEFAULT automations SHALL be created in an enabled state but SHALL respect the plan's automation limit (excess defaults are created disabled with a note to upgrade).
4. THE onboarding flow SHALL present the default automations to the user with the ability to adjust timing or disable specific ones before completing setup.
5. DEFAULT automations SHALL be clearly labeled as "Suggested" in the automation list so users can distinguish them from manually created rules.

### Requirement 9: Automation Observability and Audit

**User Story:** As a business owner, I want to see when my automations run, what they did, and whether they succeeded, so that I can trust the system and debug issues.

#### Acceptance Criteria

1. EVERY automation execution (immediate or scheduled) SHALL write an entry to `automation_logs` with: automationId, businessId, triggerType, triggerPayload, actionsExecuted (array of action results), status, durationMs, and error if applicable.
2. THE automation log SHALL be queryable from the UI showing the last 100 executions per automation, with filtering by status (success/failure) and date range.
3. WHEN an automation fails, THE system SHALL increment a failure counter on the automation rule. IF failures exceed 5 consecutive executions, THE system SHALL auto-disable the rule and notify the owner.
4. THE automation logs SHALL be included in the existing audit log export if the user has the `exports` plan feature.
5. Automation logs SHALL be retained for 90 days, after which they are eligible for cleanup by a scheduled maintenance task.

### Requirement 10: Security and Scoping

**User Story:** As a platform operator, I want automations strictly scoped to the owning business with no cross-tenant data access, so that the multi-tenant system remains secure.

#### Acceptance Criteria

1. ALL automation queries, mutations, and action executions SHALL include a `businessId` filter and SHALL validate that the authenticated user has membership in that business.
2. THE Event_Dispatcher SHALL only match rules belonging to the same businessId as the emitted event.
3. THE Scheduled Job Processor SHALL re-validate businessId ownership before executing each job's actions.
4. Action executors SHALL NOT access data from other businesses, even if referenced in triggerPayload. Cross-business references SHALL be rejected with an error.
5. ALL automation CRUD operations SHALL use server actions with Zod-validated input and session-based auth checks consistent with existing patterns.
6. THE automation API SHALL be rate-limited: maximum 50 automation creates per business per hour, maximum 200 event emissions per business per minute.
