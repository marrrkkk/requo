# Implementation Plan: Workflow Automation Builder

## Overview

Implement a full workflow automation system for Requo: database schema, event dispatcher, scheduled job processor, action executors, plan entitlements, quick automation UI, visual workflow builder (React Flow), onboarding defaults, and observability. Tasks are ordered to establish the data layer first, then the execution engine, then UI, and finally integration and polish.

## Tasks

- [x] 1. Database schema and domain types
  - [x] 1.1 Create automation schema at `lib/db/schema/automations.ts`
    - Define `triggerTypeEnum` with all 16 trigger types
    - Define `automationJobStatusEnum` (pending, processing, completed, failed, cancelled)
    - Define `automationLogStatusEnum` (success, partial_failure, failure)
    - Define `businessAutomations` table with all fields per Requirement 1.1
    - Define `automationScheduledJobs` table per Requirement 1.2
    - Define `automationLogs` table per Requirement 1.3
    - Add composite index on (businessId, triggerType, enabled) per Requirement 1.4
    - Add index on (status, scheduledFor) per Requirement 1.5
    - Export all from `lib/db/schema/index.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 1.2 Generate and run database migration
    - Run `npx drizzle-kit generate` to create migration file
    - Verify migration SQL is correct
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.3 Create domain types and Zod schemas at `features/automations/types.ts`
    - Define `TriggerType` union type matching the enum
    - Define `TriggerPayload` mapped type for each trigger
    - Define `Condition` schema (field, operator, value)
    - Define `ActionConfig` discriminated union for each action type
    - Define `DelayConfig` schema (unit: minutes/hours/days, value: number)
    - Define `WorkflowGraph` type (nodes array, edges array)
    - Define Zod schemas for create/update automation input validation
    - Define `ActionResult` type (success, result, error)
    - _Requirements: 1.6, 1.7, 2.2, 4.2, 4.9_

- [x] 2. Plan entitlements and feature gating
  - [x] 2.1 Add automation features to entitlements
    - Add `automations` and `workflowBuilder` to `planFeatures` array in `lib/plans/entitlements.ts`
    - Add `automations` to free (limit: 3), pro (limit: 20), business (limit: 100) plan sets
    - Add `workflowBuilder` to pro and business plan sets only
    - Add labels and descriptions for both features
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 2.2 Create automation entitlement helpers at `features/automations/entitlements.ts`
    - Implement `getAutomationLimit(plan)` returning the numeric cap
    - Implement `canCreateAutomation(businessId)` that checks current count vs limit
    - Implement `canAccessWorkflowBuilder(plan)` check
    - _Requirements: 5.5, 5.6, 5.7_

- [x] 3. Event dispatcher
  - [x] 3.1 Implement event dispatcher at `features/automations/dispatcher.ts`
    - Implement `emitEvent(businessId, triggerType, payload)` function
    - Query enabled rules matching businessId + triggerType, ordered by priority
    - Evaluate conditions against payload using condition evaluator
    - Route to immediate execution or scheduled job creation based on delay config
    - Use `waitUntil` for non-blocking action execution
    - Log all executions to `automation_logs`
    - Handle errors gracefully (log, don't throw)
    - Target < 200ms for dispatch phase
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 9.1_

  - [x] 3.2 Implement condition evaluator at `features/automations/condition-evaluator.ts`
    - Implement `evaluateConditions(conditions, payload)` function
    - Support operators: eq, neq, gt, gte, lt, lte, contains, not_contains
    - Support dot-path field resolution in payload
    - Return true if all conditions pass (AND logic) or no conditions exist
    - _Requirements: 2.3_

  - [x] 3.3 Implement scheduler at `features/automations/scheduler.ts`
    - Implement `createScheduledJob(automationId, businessId, payload, delay)` function
    - Calculate `scheduledFor` from delay config
    - Implement `cancelPendingJobs(automationId)` for rule disable/delete
    - _Requirements: 2.4, 3.7_

- [x] 4. Action executors
  - [x] 4.1 Create executor registry at `features/automations/executors/index.ts`
    - Define executor map: actionType → executor function
    - Implement `executeAction(actionType, input)` dispatcher
    - Validate actionConfig with Zod before execution
    - Return standardized `ActionResult`
    - _Requirements: 4.1, 4.2, 4.9_

  - [x] 4.2 Implement core action executors
    - `features/automations/executors/create-follow-up.ts`: Create follow-up with configurable title, reason, channel, due offset
    - `features/automations/executors/send-email.ts`: Send templated email via Resend with dynamic variables
    - `features/automations/executors/send-notification.ts`: Create push notification via existing infrastructure
    - `features/automations/executors/update-inquiry-status.ts`: Update inquiry status with validation
    - `features/automations/executors/update-quote-status.ts`: Update quote status (for expiration, etc.)
    - `features/automations/executors/archive-inquiry.ts`: Archive inquiry with reason
    - _Requirements: 4.3, 4.4, 4.5, 4.6_

  - [x] 4.3 Implement document-generation action executors
    - `features/automations/executors/create-job-from-quote.ts`: Create job from accepted quote
    - `features/automations/executors/generate-invoice.ts`: Create draft invoice from completed job
    - `features/automations/executors/generate-draft-quote.ts`: Invoke AI quote generator for draft
    - _Requirements: 4.7, 4.8, 4.6_

- [x] 5. Scheduled job processor
  - [x] 5.1 Implement processor logic at `features/automations/processor.ts`
    - Query pending jobs where scheduledFor <= now, limit 50
    - Set status to processing, execute actions, set completed/failed
    - Implement retry with exponential backoff (attempts * 15 min)
    - Respect 55-second time budget
    - Re-validate business ownership before execution
    - Idempotent (skip processing/completed jobs)
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 10.3_

  - [x] 5.2 Create cron endpoint at `app/api/cron/automations/route.ts`
    - Authenticate via Vercel cron secret
    - Invoke processor
    - Return execution summary
    - _Requirements: 3.1_

- [x] 6. Checkpoint — Backend complete
  - Run `npm run typecheck` and `npm run lint` to verify backend compiles clean.
  - Verify migration generates correctly.
  - Ask user if questions arise before proceeding to UI.

- [x] 7. Integrate event dispatch into existing mutations
  - [x] 7.1 Add emitEvent calls to inquiry mutations
    - Inquiry creation → `inquiry.received`
    - Inquiry qualification → `inquiry.qualified`
    - Inquiry archival → `inquiry.archived`
    - _Requirements: 2.9_

  - [x] 7.2 Add emitEvent calls to quote mutations
    - Quote sent → `quote.sent`
    - Quote accepted → `quote.accepted`
    - Quote rejected → `quote.rejected`
    - Quote expired → `quote.expired`
    - _Requirements: 2.9_

  - [x] 7.3 Add emitEvent calls to job and invoice mutations
    - Job created → `job.created`
    - Job completed → `job.completed`
    - Invoice sent → `invoice.sent`
    - Invoice paid → `invoice.paid`
    - _Requirements: 2.9_

  - [x] 7.4 Add emitEvent calls to follow-up mutations
    - Follow-up due (from cron) → `follow_up.due`
    - Follow-up overdue → `follow_up.overdue`
    - _Requirements: 2.9_

- [x] 8. CRUD server actions and queries
  - [x] 8.1 Implement automation queries at `features/automations/queries.ts`
    - `getBusinessAutomations(businessId)` — list with count, last triggered
    - `getAutomationById(automationId, businessId)` — detail with validation
    - `getAutomationHistory(automationId, businessId, filters)` — paginated logs
    - `getAutomationStats(businessId)` — active count, execution stats
    - All queries scoped by businessId with membership validation
    - _Requirements: 6.4, 6.5, 9.2, 10.1_

  - [x] 8.2 Implement automation mutations at `features/automations/mutations.ts`
    - `createAutomation` server action with Zod validation, plan limit check
    - `updateAutomation` server action
    - `deleteAutomation` server action (cancels pending jobs)
    - `toggleAutomation` server action (enable/disable, cancels jobs on disable)
    - `duplicateAutomation` server action
    - All mutations validate session + business membership
    - _Requirements: 5.5, 10.1, 10.5, 3.7_

- [ ] 9. Quick Automation UI
  - [x] 9.1 Create automation list page at `app/(business)/[businessSlug]/settings/automations/page.tsx`
    - Server component fetching business automations
    - Show automation list with name, trigger, action, enabled toggle, last triggered
    - Empty state pointing to presets or creation
    - Plan limit indicator
    - _Requirements: 6.4_

  - [-] 9.2 Create quick automation presets component at `features/automations/components/quick-automation-presets.tsx`
    - Preset cards: follow-up after quote viewed, expire quotes, create job on acceptance, notify on inquiry, archive stale inquiries, follow-up overdue reminders
    - One-click enable with customizable timing
    - Uses Card, Badge, Button from shared UI
    - _Requirements: 6.1, 6.2, 6.3, 6.6_

  - [~] 9.3 Create automation form (sheet-based) at `features/automations/components/automation-form.tsx`
    - Sheet with trigger selection, condition builder, action configuration, delay setting
    - Zod-validated form with inline errors
    - Supports both create and edit modes
    - _Requirements: 6.3, 6.7_

  - [~] 9.4 Create automation history view at `features/automations/components/automation-history.tsx`
    - Table showing execution logs: timestamp, status badge, trigger context, duration
    - Filter by success/failure
    - Accessible from automation detail
    - _Requirements: 6.5, 9.2_

- [ ] 10. Visual Workflow Builder
  - [~] 10.1 Install React Flow and set up builder infrastructure
    - Install `@xyflow/react` package
    - Create `features/automations/components/builder/` directory structure
    - Create workflow state hook at `use-workflow-state.ts` managing nodes, edges, selection
    - Create undo/redo hook at `use-undo-redo.ts` with 20-step history
    - _Requirements: 7.1, 7.8_

  - [~] 10.2 Create custom node components
    - `trigger-node.tsx`: Entry point node with trigger type icon and label
    - `condition-node.tsx`: Diamond/branching node with true/false handles
    - `delay-node.tsx`: Timer node showing delay duration
    - `action-node.tsx`: Action node with action type icon and summary
    - All nodes styled with Requo design tokens (surface-card, border, primary accent)
    - _Requirements: 7.2, 7.3_

  - [~] 10.3 Create workflow canvas and toolbar
    - `workflow-canvas.tsx`: React Flow canvas with custom nodes, pan/zoom, minimap
    - `workflow-toolbar.tsx`: Add-node buttons, save, validate, undo/redo controls
    - `automation-edge.tsx`: Custom edge with animated flow indicator
    - Edge validation rules (single trigger, condition branching, no orphans)
    - _Requirements: 7.4, 7.10_

  - [~] 10.4 Create node configuration panel
    - `node-config-panel.tsx`: Right-side panel opening on node selection
    - Trigger config: select trigger type
    - Condition config: field, operator, value inputs
    - Delay config: duration input with unit selector
    - Action config: action type selector + type-specific fields
    - _Requirements: 7.6_

  - [~] 10.5 Implement serialization and validation
    - `serializer.ts`: Convert React Flow state ↔ JSON for database storage
    - `validator.ts`: Validate workflow (single trigger, connected graph, no orphans, configs complete)
    - Show inline error indicators on invalid nodes
    - _Requirements: 7.5, 7.7_

  - [~] 10.6 Create builder page and paywall
    - Builder page at `app/(business)/[businessSlug]/automations/[automationId]/builder/page.tsx`
    - Full-page canvas with save/cancel actions
    - Paywall state for users without `workflowBuilder` access showing preview
    - _Requirements: 7.9, 5.6_

- [ ] 11. Onboarding defaults
  - [~] 11.1 Create onboarding default templates at `features/automations/onboarding-defaults.ts`
    - Define default automation templates per business type
    - Include: follow-up 3 days after quote viewed, expire quotes 30 days, create job on acceptance, notify on new inquiry
    - Mark as "Suggested" source
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

  - [~] 11.2 Integrate defaults into onboarding flow
    - After business creation, call automation defaults creator
    - Present defaults in onboarding with adjust/disable controls
    - Respect plan limits (disable excess with upgrade note)
    - _Requirements: 8.3, 8.4_

- [ ] 12. Observability and auto-disable
  - [~] 12.1 Implement failure tracking and auto-disable
    - Track consecutive failures per automation rule
    - Auto-disable after 5 consecutive failures
    - Send owner notification on auto-disable
    - _Requirements: 9.3_

  - [~] 12.2 Add automation logs to data export
    - Include automation logs in existing export feature
    - Respect `exports` plan feature gate
    - _Requirements: 9.4_

  - [~] 12.3 Implement log retention cleanup
    - Add cleanup logic to cron processor: delete logs older than 90 days
    - Run as low-priority task after job processing
    - _Requirements: 9.5_

- [ ] 13. Security hardening and rate limiting
  - [~] 13.1 Add rate limiting to automation endpoints
    - 50 automation creates per business per hour
    - 200 event emissions per business per minute
    - Use existing rate limiter pattern
    - _Requirements: 10.6_

  - [~] 13.2 Security review and validation pass
    - Verify all queries include businessId filter
    - Verify all mutations validate session + membership
    - Verify event dispatcher scopes to emitting business
    - Verify processor re-validates ownership
    - Verify action executors reject cross-business references
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [~] 14. Final verification
  - Run `npm run check` (lint + typecheck)
  - Run `npm run build` to verify no build errors
  - Verify migration applies cleanly
  - Manual smoke test of quick automation creation and toggle
  - Verify plan gating works (free user cannot access builder)

## Notes

- The visual workflow builder (`@xyflow/react`) is the largest UI piece. It can be shipped as a separate follow-up if the quick automation UI is prioritized first.
- The cron processor runs every 5 minutes, meaning delayed automations have up to 5 minutes of jitter. This is acceptable for business workflow automation (follow-ups are measured in days).
- Event dispatch is non-blocking for the original mutation. If Vercel's `waitUntil` is not available in all contexts, fallback to fire-and-forget with error logging.
- The `generate_draft_quote` action uses AI and may be slower. It should always be non-blocking and leave the quote in draft status.
- React Flow requires a client component boundary. The builder page will use a thin server component wrapper with the canvas as a client component.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1] },
    { "wave": 2, "tasks": [2, 3] },
    { "wave": 3, "tasks": [4, 5] },
    { "wave": 4, "tasks": [6] },
    { "wave": 5, "tasks": [7, 8] },
    { "wave": 6, "tasks": [9] },
    { "wave": 7, "tasks": [10] },
    { "wave": 8, "tasks": [11, 12, 13] },
    { "wave": 9, "tasks": [14] }
  ]
}
```
