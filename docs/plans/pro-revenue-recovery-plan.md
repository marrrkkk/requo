# Pro Revenue Recovery Loop

## Summary

Build Pro around one measurable workflow: identify quotes that are going cold, prioritize them in the existing dashboard queue, send a safe three-touch reminder sequence, and show whether the opportunity became active again.

Reuse the existing quote auto-follow-up, follow-up, activity-log, notification, AI usage, dashboard queue, and plan-gating infrastructure. Extend those systems instead of creating a parallel automation product.

## Key Changes

### Quote Recovery Domain

- Add business-level recovery configuration with:
  - enabled by default for new Pro businesses;
  - default delays of 3, 7, and 14 days;
  - editable delays and owner-approved neutral email templates;
  - pause and disable controls.
- Snapshot the active recovery configuration onto each eligible sent quote so later settings changes do not alter an in-progress sequence unexpectedly.
- Extend quote recovery state to support the current attempt, next scheduled attempt, paused/stopped state, send failure and retry metadata, and recovery attribution metadata.
- Treat both sent-but-never-responded quotes and previously viewed or engaged quotes that later become quiet as stale.
- Exclude accepted, rejected, expired, voided, archived, snoozed, dismissed, deleted, and customer-responded quotes.
- On customer reply, stop future sends, mark the quote active/in-progress where the existing lifecycle permits, write an activity event, and notify the owner.
- Add an owner action to mark an offline conversation as re-engaged. Record this as an activity event rather than fabricating a customer reply.

### Scheduled Processing And Email Safety

- Extend `features/quotes/jobs/auto-follow-ups.ts` to process the three-step schedule idempotently.
- Keep the existing hourly Inngest job and email provider boundary.
- Use only neutral, owner-approved templates for automatic sends. Do not use free-form AI-generated copy in auto-send.
- Enforce Pro entitlement before processing, quote validity and terminal-status checks, customer email presence, the hard three-touch stop, and duplicate-send protection.
- Keep failures visible with retry controls.
- Add activity-log events for scheduled, sent, skipped, failed, paused, customer-replied, and owner-marked-re-engaged states.
- Add owner notifications for failures and customer replies.

### Needs Attention Queue

- Extend the existing dashboard queue in `features/businesses` instead of creating a new dashboard.
- Add stale quote recovery items with urgency, days since sent or viewed, quote value, engagement state, next scheduled action, and recovery status.
- Rank deterministically:
  1. overdue or failed recovery action;
  2. previously viewed or engaged quotes;
  3. higher quote value;
  4. longer staleness;
  5. newest item as the tie-breaker.
- Add owner controls to pin, dismiss, pause, and open the related quote.
- Keep the queue visible to Free users for discovery; lock automatic recovery and recovery reporting with the existing paywall components.

### Recovery Reporting

- Add a per-quote recovery timeline showing reminder attempts and the event that caused recovery.
- Add a monthly summary query for stale quotes, reminders sent, customer replies after reminders, owner-recorded re-engagements, and recovered conversations per 100 stale quotes.
- Attribute recovery only to a customer reply after a reminder or an owner-recorded re-engagement after a reminder.
- Do not count views, clicks, opens, or accepted quotes as recovered conversations unless the explicit recovery event also exists.

### AI Allowance Changes

- Use action-based allowances:
  - Free: 5 quote AI actions per month;
  - Pro: 5 quote AI actions per day and 100 per month;
  - Business: retain the higher existing allowance until separately re-evaluated.
- Preserve the current server-side AI limiter and `ai_usage_events` accounting, adding daily action checks alongside the monthly check.
- Treat quote drafts and quote improvements as one action unit for this product promise.
- Enforce the monthly cap as a hard stop with a clear message; the rest of Pro recovery continues to work.
- Update `lib/plans/usage-limits.ts`, `lib/plans/catalog.ts`, and related canonical plan helpers and paywall paths.
- Update pricing, upgrade, and in-app usage copy to lead with quote recovery and faster quote production, not raw AI credits.

### Settings And Onboarding

- Add a focused Pro recovery settings section using existing settings forms and validation:
  - enabled or paused;
  - delay fields;
  - template editing;
  - next-send preview;
  - reset to recommended defaults.
- For new Pro businesses, enable detection and the default sequence with a first-run disclosure and visible pause control.
- Do not require a visual workflow builder for this feature.
- Keep Free users able to view stale-quote detection and manually send normal follow-ups; gate automated sending and recovery reporting.

## Data And Interfaces

- Add a new Drizzle migration; never edit committed migrations.
- Prefer typed JSON configuration for the three-step sequence where existing scalar quote fields cannot represent distinct delays and templates cleanly.
- Add or extend typed quote and recovery view models in `features/quotes/types.ts` and `features/businesses/types.ts`.
- Add Zod schemas for recovery settings, template edits, pin/dismiss/pause actions, retry actions, and owner-recorded re-engagement.
- Keep mutations behind business-scoped action-context helpers and enforce `hasFeatureAccess(plan, "autoFollowUps")` before writes or email work.
- Reuse cache tags and invalidate business dashboard, quote detail, follow-up, and analytics tags after state changes.

## Test Plan

### Unit Tests

- Stale eligibility for unopened and previously viewed quotes.
- Terminal, paused, dismissed, and deleted quote exclusion.
- Three, seven, and fourteen-day schedule calculation.
- Idempotent attempt advancement.
- Recovery attribution rules.
- Daily and monthly AI allowance boundaries.
- Template and settings validation.

### Integration Tests

- Free cannot enable or execute automatic recovery.
- Pro can configure, pause, retry, and execute recovery.
- Business scoping prevents cross-business quote access.
- Customer reply stops future sends.
- Failed sends remain retryable and visible.
- Owner-recorded re-engagement creates the correct activity event.
- Monthly recovery metrics use only explicit recovery events.

### Component Tests

- Queue rendering and deterministic priority.
- Pin, dismiss, pause, and retry interactions.
- Locked Free states and accessible upgrade actions.
- Settings form validation and preview.

### End-To-End Smoke Flow

1. Create and send a quote.
2. Advance fixture state into stale status.
3. Verify the quote appears in Needs Attention.
4. Run or observe the reminder.
5. Simulate a customer reply.
6. Verify automation stops and recovery appears in the quote timeline.

Run `npm run check`, `npm run test`, `npm run test:integration`, `npm run build`, and the relevant Playwright smoke test.

## Rollout And Measurement

- Ship detection and queue visibility first.
- Enable the default sequence for new Pro businesses after the first-run disclosure.
- Instrument activation, pause rate, reminder delivery and failure, customer replies, owner-recorded re-engagement, and recovered conversations per 100 stale quotes.
- Validate with 5-10 service-business owners and seek paid-pilot or real payment commitment.
- Keep Pro near the current $9/month price during validation.
- Do not add SMS, multichannel messaging, predictive close scoring, margin intelligence, or a full workflow builder until recovery activation and measurable re-engagement prove demand.

## Assumptions

- Existing quote auto-follow-up fields and hourly Inngest processing are retained and extended.
- Email remains the only automatic customer-facing channel.
- Default-on applies to new Pro businesses because there are no existing subscribers; sending still has a visible pause control.
- The first release measures recovered active conversations, not causal revenue attribution.
- Business-plan AI limits remain unchanged until real usage data justifies revisiting them.
