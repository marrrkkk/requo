# Target Market, Starter Workflows, and Onboarding Implementation Plan

## Document Purpose

This document is a decision-complete implementation handoff for repositioning
Requo, simplifying its starter templates, and reducing first-business onboarding
to a fast path from signup to a usable inquiry-to-quote workflow.

It is written for another AI or engineer. The implementer should not reopen the
product decisions in this document unless the current repository makes one of
them technically impossible or conflicts with a newer explicit product decision.

## Required Preparation

Before changing code:

1. Re-read `AGENTS.md`, `DESIGN.md`, and
   `.agents/skills/requo-repo-guide/SKILL.md`.
2. Read the relevant Next.js 16.2 documentation in
   `node_modules/next/dist/docs/`, especially the instant-navigation guides,
   before changing any route or page.
3. Inspect the final worktree state. This repository currently contains broad
   product-simplification changes, including removed or reshaped jobs, invoices,
   automations, knowledge, and general AI-chat surfaces. Do not restore or
   advertise a removed feature because older docs mention it.
4. Preserve all unrelated user changes. Marketing and dashboard files may
   already be modified, so merge with their final state instead of replacing
   them from an older version.
5. Confirm the current behavior of onboarding, default inquiry-form creation,
   the dashboard activation checklist, and public inquiry routes before editing.

## Final Product Decisions

These decisions are final for this implementation:

- Requo is for owner-led service businesses that receive inquiries and prepare
  custom-scope quotes.
- The primary user is an owner-operator in a business with roughly 1-10 people.
- The secondary user is a lightweight helper: a partner, assistant, or
  coordinator who can help manage inquiries and follow-ups.
- Requo is not being designed as an enterprise CRM, appointment scheduler,
  dispatch system, marketplace, payroll system, or complex estimating suite.
- Appointment-first businesses with standardized services are not the primary
  target. Businesses requiring takeoffs, procurement, dispatch, or complex sales
  administration are also outside the primary target.
- Public positioning should focus on the use case, not a single vertical:
  service businesses that turn inbound inquiries into custom quotes.
- The central promise is: every inquiry should have a clear next step.
- Starter templates remain in the product, but they become quiet onboarding
  infrastructure rather than a major product category or marketing pillar.
- Onboarding succeeds when the owner has a usable public inquiry path and can
  move a test inquiry into a draft quote. Completing every business setting is
  not activation.
- Initial onboarding should be completable in approximately three minutes,
  excluding the optional test submission and quote walkthrough.

## Target-Market Language

Use this positioning internally and as the basis for customer-facing copy:

> Requo helps owner-led service businesses make sure every inquiry moves to its
> next step: qualification, quote, follow-up, or decision.

Preferred short promise:

> Never lose the next step.

Supporting explanation:

> Capture the request, send a clear quote, and follow up before the opportunity
> goes cold.

Representative businesses may be named as examples, including creative studios,
consultants, cleaners, event providers, contractors, and other project-based
services. Examples must remain subordinate to the shared inquiry-to-quote use
case. Do not create separate promises or landing-page experiences for every
industry in this phase.

Avoid these positioning patterns:

- "All-in-one platform for every business."
- "Fully customizable CRM."
- "Template marketplace."
- "Built for teams of any size."
- Language centered on configuration breadth rather than missed-response and
  follow-up outcomes.
- Promises involving product areas removed by the active simplification work.

## Current Implementation Summary

The current onboarding implementation has three visible steps:

1. Profile: photo, first name, last name, role, team size, and referral source.
2. Business: logo, business name, public slug, country, and currency.
3. Template: detailed business type, contact channel, and one of six
   vertical-shaped starter templates.

Relevant current modules include:

- `app/onboarding/page.tsx`
- `features/onboarding/components/onboarding-form/*`
- `features/onboarding/actions.ts`
- `features/onboarding/mutations.ts`
- `features/onboarding/schemas.ts`
- `features/onboarding/helpers.ts`
- `features/businesses/starter-templates.ts`
- `features/inquiries/business-types.ts`
- `features/inquiries/form-config.ts`
- `features/businesses/components/dashboard-activation-checklist.tsx`

The current six starter definitions are Agency / Studio, Consultant /
Professional Services, Contractor / Home Service, Event / Production,
Recurring Service, and General Service Business. They are keyed by existing
`BusinessType` values and feed default inquiry-form fields.

The dashboard already contains useful activation behavior: business readiness,
form publishing, first inquiry, and first quote. Reuse and strengthen this
surface instead of creating a separate onboarding system.

Marketing already contains strong inquiry-to-quote and slow-response language.
Treat marketing work as alignment and cleanup, not a page rewrite.

## Desired Onboarding Experience

### Entry Conditions

- Signup continues to create the user and profile through Better Auth.
- `/onboarding` continues to create the first business.
- Users with an existing business membership or completed onboarding continue
  to bypass onboarding through the existing redirect behavior.
- Additional businesses continue to use the explicit business-creation flow.
  Do not force the first-business onboarding experience onto that flow in this
  phase.

### Step 1: Business Basics

Show one compact step titled `Set up your business`.

Required inputs:

- Business name.
- Service category, using the existing `BusinessType` taxonomy for business
  metadata and personalization.
- Preferred customer contact channel.

Automatically resolved inputs:

- Public slug generated from the business name.
- Country inferred from the existing request-header behavior.
- Currency inferred from country using existing locale helpers.
- Owner first and last name prefilled from the authenticated account.

Interaction requirements:

- Keep the generated slug editable through a small `Edit URL` affordance, but
  do not make URL selection the visual focus.
- Show country and currency in a compact secondary row or disclosure. They must
  remain correctable before submission.
- If the authenticated profile is missing a valid name, show the name fields in
  this step. Otherwise, do not spend a separate step confirming them.
- Remove profile photo, business logo, role, team size, and referral source from
  the blocking onboarding path.
- Do not delete support for those fields from account or business settings.
  They are deferred, not removed from the product.

### Step 2: Starting Workflow

Show one step titled `How do you usually sell the work?`.

Offer exactly three choices:

1. `Project quote`
   - Description: `Collect scope, timing, budget, and files for a custom job.`
   - Default form behavior: general custom-project questions suitable for
     creative, contractor, fabrication, web, print, and mixed project work.
2. `Recurring service`
   - Description: `Collect location, frequency, timing, and service details.`
   - Default form behavior: use and generalize the current recurring-service
     field set.
3. `Consultation to proposal`
   - Description: `Qualify the goal and engagement before preparing a proposal.`
   - Default form behavior: use and generalize the current consulting field set.

Selection behavior:

- Recommend a workflow based on the chosen service category.
- Preselect the recommendation so the owner can continue without making another
  decision.
- Let the owner select a different workflow.
- Show a short summary of the information the inquiry form will collect.
- Do not display six industry cards, large field-chip lists, or a searchable
  template catalog.
- Do not call this step or its choices a template marketplace or library.

### Submission and Redirect

On successful submission:

- Create the profile updates, business, owner membership, default inquiry form,
  business defaults, and onboarding completion marker in the existing
  transaction boundary.
- Preserve existing cache invalidation, audit behavior, and business-scoping
  rules.
- Redirect to the new business home route with a short-lived welcome query,
  such as `?welcome=1`, only if that fits the final route helpers.
- The destination page must still satisfy the repository's instant-navigation
  structure: synchronous page shell, dynamic reads inside Suspense-wrapped async
  regions, and no blocking route-level await.

## Starter Workflow Architecture

### Separate Workflow Choice From Business Category

Introduce an app-level workflow type:

```ts
export const starterWorkflowKeys = [
  "project_quote",
  "recurring_service",
  "consultation_proposal",
] as const;

export type StarterWorkflowKey =
  (typeof starterWorkflowKeys)[number];
```

Place this contract in the current starter-definition module or a narrowly
renamed replacement under `features/businesses/`. Do not place it in `app/`.

`BusinessType` and `StarterWorkflowKey` have different responsibilities:

- `BusinessType` describes what kind of service business this is.
- `StarterWorkflowKey` chooses the initial inquiry-form field pattern.

Do not continue using a vertical `BusinessType` value as the semantic identity
of the workflow choice in new onboarding code.

### Persistence and Schema Decision

Do not add a database column in this phase.

The workflow selection is consumed when generating the initial inquiry-form
configuration. The generated form configuration is already persisted and
editable, so storing the starter choice indefinitely is not necessary for
runtime behavior.

Continue storing the owner's actual service category in
`businesses.businessType`. The default inquiry-form config should also retain a
valid existing `BusinessType` for backward compatibility, while its field list
is chosen from `StarterWorkflowKey`.

Refactor `createInquiryFormConfigDefaults` to accept both concepts explicitly:

```ts
createInquiryFormConfigDefaults({
  businessType,
  starterWorkflow,
});
```

When `starterWorkflow` is absent, preserve current behavior by deriving a
workflow recommendation from `businessType`. Existing call sites therefore keep
working while new onboarding passes the explicit workflow choice.

### Recommendation Mapping

Use this initial mapping:

- `cleaning_services`, `landscaping_outdoor_services`, and `pet_services` ->
  `recurring_service`
- `consulting_professional_services` -> `consultation_proposal`
- Every other current business type -> `project_quote`

Keep the mapping in one pure helper and cover every `BusinessType` in unit tests.
The fallback must be `project_quote`.

### Existing Template Compatibility

- Do not mutate existing businesses or saved inquiry-form configs.
- Do not rewrite historical inquiry snapshots.
- Keep `normalizeBusinessType` and legacy business-type mappings intact.
- Existing six-template field builders may initially remain as private helpers,
  but new onboarding must expose only the three workflow choices.
- Consolidate the project-oriented builders gradually. For this phase, the
  `project_quote` starter should use one strong, general project field set rather
  than selecting a different visible starter by vertical.
- Preserve current form-config parsing and fallback behavior for saved records.
- Do not create a migration unless implementation uncovers a real persisted
  constraint that cannot be handled through the compatibility layer above.

## Activation Launchpad

Refactor the existing dashboard activation checklist into the post-onboarding
launchpad. It should appear prominently for a new business until the first
inquiry and first quote milestones are complete.

The launchpad title should be `Get your inquiry flow live`.

Required actions and states:

1. `Review your inquiry form`
   - Opens the existing form editor or preview.
   - Complete when the default form exists.
2. `Publish and copy your link`
   - Uses existing form publishing behavior.
   - Exposes the existing copy-public-link action after publication.
   - Complete when the public form is enabled.
3. `Send a test inquiry`
   - Opens the public inquiry page in a new tab or clearly labeled preview mode.
   - Do not create fake inquiry data directly in the database.
   - Complete when at least one real inquiry exists for the business.
4. `Turn it into a quote`
   - Links to the first inquiry when available, otherwise explains that a test
     inquiry is needed first.
   - Complete when at least one quote exists.

Behavior requirements:

- When `welcome=1` is present, place the launchpad before secondary dashboard
  analytics and overview content.
- Without the query parameter, continue showing it while activation remains
  incomplete, using the existing data-driven conditions.
- Once the business has an inquiry and quote, remove the launchpad from the
  normal dashboard flow. Existing milestone celebrations may continue.
- Do not trap the owner in a wizard. All normal navigation remains available.
- Empty and incomplete states must identify the next useful action.
- Reuse `DashboardPage`, `PageHeader`, `DashboardSection`, `Button`, `Badge`,
  and existing semantic surface utilities.
- Do not introduce nested cards or a new onboarding visual language.

## Deferred Setup

After activation, surface optional setup work through existing settings and
small contextual prompts, not another blocking wizard.

Deferred items include:

- Profile photo.
- Business logo.
- Detailed branding.
- Additional inquiry questions.
- Quote styling and default notes.
- Pricing-library population.
- Team invitations.
- Advanced follow-up preferences.
- Role, team-size, and referral metadata.

Do not build a large permanent setup checklist. Only show a deferred task when
it is relevant to the owner's current workflow or required by a feature they are
trying to use.

## Marketing Alignment

Audit the final marketing state after the active worktree changes settle.
Apply only the changes still needed to make these messages consistent:

- Primary audience: owner-led service businesses handling custom inquiries and
  quotes.
- Primary pain: slow responses and missed follow-up cause otherwise viable work
  to go cold.
- Product mechanism: capture inquiry -> prepare quote -> send/share -> follow up
  -> record the decision.
- Primary promise: every inquiry has a next step.

Required copy checks:

- Hero and metadata do not imply that Requo is for every service business.
- FAQ explains that appointment-first businesses are not the core use case
  without adding hostile exclusionary language.
- Examples remain illustrative rather than separate vertical products.
- Starter templates are not promoted as a headline feature.
- Pricing copy is consistent with the final plan packaging and the final set of
  surviving product capabilities.
- Structured data and marketing E2E assertions are updated when visible copy
  changes.

Do not create new vertical landing pages in this phase.

## Data and Measurement

Do not expand the existing public-page `analytics_events` enum for onboarding
events. That table currently models anonymous public form and quote views, and
mixing authenticated product events into it would blur its purpose.

Measure activation from existing persisted timestamps and records:

- Account created -> first business created.
- Business created -> default inquiry form enabled.
- Business created -> first inquiry created.
- First inquiry created -> first quote created.
- Business created -> first quote sent, if the final quote schema retains a
  reliable sent timestamp or status transition.

Add an internal query or operational script only if the repository does not
already expose these measurements cleanly. Keep it outside customer-facing
analytics unless separately requested.

Metric definitions:

- `setup_completed`: first business and owner membership successfully created.
- `intake_live`: at least one enabled public inquiry form exists.
- `first_inquiry`: at least one non-deleted inquiry exists.
- `first_quote`: at least one non-deleted quote exists.
- `activated`: `intake_live`, `first_inquiry`, and `first_quote` are all true.

Do not count preview-only actions as activation. A submitted test inquiry is
valid because it exercises the real public workflow.

## Implementation Sequence

### Phase 1: Introduce Workflow Contracts

- Add `StarterWorkflowKey`, its labels, descriptions, summaries, and the pure
  business-type recommendation helper.
- Refactor inquiry-form default generation to accept an optional explicit
  workflow key while retaining backward-compatible business-type fallback.
- Add unit tests before changing onboarding UI.
- Confirm every existing caller still produces a valid form configuration.

### Phase 2: Simplify Onboarding Validation and Data Flow

- Replace the current three-step field contract with the two-step experience.
- Keep server validation authoritative with Zod 4.
- Make deferred profile and branding fields optional or remove them from the
  onboarding action input while leaving their settings paths intact.
- Pass `businessType` and `starterWorkflow` independently through helpers,
  preview state, action parsing, mutation input, and form generation.
- Preserve session-storage draft restoration, but version or sanitize the draft
  so stale drafts containing old starter-template identifiers do not break the
  new form.
- Map an old draft's starter template to the closest new workflow when possible.

### Phase 3: Replace the Visible Onboarding UI

- Merge profile confirmation and business setup into `Business Basics`.
- Replace the six template cards with the three workflow choices.
- Keep accessible labels, keyboard interaction, loading states, field-level
  errors, and server-error restoration.
- Keep the submit overlay concise and outcome-focused.
- Update preview behavior, or remove the preview affordance if it duplicates the
  real post-onboarding launchpad and adds friction.
- Ensure the layout works at narrow mobile widths without button, label, or card
  overflow.

### Phase 4: Strengthen Post-Onboarding Activation

- Rework the existing activation checklist into the four-action launchpad.
- Reuse existing form paths, preview behavior, link-copy component, inquiry
  detail route, and quote-from-inquiry path.
- Ensure query and count loading remains inside Suspense regions on the home
  page.
- Preserve independent error boundaries for non-critical dashboard regions.
- Keep the activation region ahead of secondary data for newly onboarded
  businesses.

### Phase 5: Align Marketing and Product Copy

- Compare current marketing copy against the target-market language above.
- Make surgical edits only where positioning is broader, more generic, or more
  template-led than the final strategy.
- Update related metadata, JSON-LD text, pricing language, and E2E selectors in
  the same change.
- Review onboarding, empty states, first-visit tips, and dashboard copy for the
  same `next step` vocabulary.

### Phase 6: Validate With Real Users

After technical verification, observe 5-10 target businesses or realistic
target users completing the flow.

Use the same tasks for each session:

1. Describe the business and choose the closest service category.
2. Complete setup without facilitator guidance.
3. Explain what each workflow starter means before selecting it.
4. Publish the form and locate the public link.
5. Submit a realistic inquiry.
6. Find that inquiry and begin a quote.

Record:

- Completion time.
- Fields that cause hesitation.
- Whether the recommended workflow is accepted or changed.
- Whether users understand the difference between service category and sales
  workflow.
- Whether they can state Requo's value in their own words.
- Where they leave the launchpad or seek unrelated settings.

Do not add more starters from interview requests alone. Add or split a starter
only when repeated observed workflows cannot be served by editing one of the
three defaults.

## Public Interfaces and Types

Expected interface changes:

- Add `StarterWorkflowKey` and `starterWorkflowKeys`.
- Add `getRecommendedStarterWorkflow(businessType)`.
- Change onboarding draft and action input from a vertical
  `starterTemplateBusinessType` selection to `starterWorkflow`.
- Extend `createInquiryFormConfigDefaults` with optional `starterWorkflow`.
- Keep `BusinessType`, saved form config version `1`, historical snapshots, and
  existing database columns backward compatible.

Avoid renaming persisted `businessType` fields as part of this work. That is a
larger data-model change and is not required to achieve the product goal.

## Error and Edge-Case Behavior

- Missing geolocation: require or default country through the existing supported
  country behavior, then derive currency.
- Unsupported detected country: show a neutral country selector without an
  invalid preselection.
- Missing account name: require first and last name inline in Business Basics.
- Slug collision: retain debounced availability feedback and server-side final
  validation. Suggest a valid alternative without discarding other draft data.
- Stale onboarding draft: sanitize all fields and map old starter identifiers to
  a new workflow; otherwise use the recommendation.
- Server-action failure: restore the draft, remain on the relevant step, and
  show both a summary error and field errors.
- Duplicate submission: preserve transaction and idempotency protections in the
  current onboarding mutation. A user must not receive duplicate businesses or
  memberships from retrying.
- Existing business found during onboarding: retain the current redirect rather
  than creating another business.
- Public form disabled: launchpad must show publication as the next action and
  must not display a copy link that cannot work.
- Inquiry exists but no quote: link directly to the most useful inquiry or the
  inquiries list, using existing route helpers.
- Quote created manually without an inquiry: count it for the first-quote
  milestone, but keep first-inquiry incomplete.

## Test Plan

### Unit Tests

- Every `BusinessType` maps to exactly one recommended starter workflow.
- Unknown values fall back to `project_quote` at normalization boundaries.
- Each workflow produces a valid `InquiryFormConfig` with required contact,
  service/category, and details fields.
- Explicit workflow selection overrides the recommendation without changing the
  stored business category.
- Existing calls without `starterWorkflow` retain valid behavior.
- Old onboarding drafts map to the appropriate new workflow.
- Country changes still update inferred currency without overwriting an explicit
  valid currency unnecessarily.
- Onboarding field validation matches the new required fields.

### Component Tests

Add component tests only for meaningful interactions:

- Selecting a service category changes the recommendation while preserving a
  deliberate manual workflow selection.
- A preselected recommendation allows continuation without an extra click.
- Returning to a previous step preserves values.
- A stale restored draft is rendered safely.
- Slug errors and server field errors return focus or clear feedback to the
  relevant field.

Do not add snapshot tests for card appearance or step markup.

### Integration Tests

- A valid onboarding submission creates exactly one business, owner membership,
  default inquiry form, and completed profile state.
- The saved business category is the selected `BusinessType`.
- The generated form fields correspond to the selected workflow.
- A user cannot submit onboarding for another user or gain access to another
  business.
- Retried or duplicate onboarding submissions do not create duplicate ownership
  records.
- Cache invalidation makes the new business immediately available to shell and
  dashboard queries.
- Existing businesses and legacy form configs continue to load.

### E2E Tests

Add or update a focused smoke journey:

1. Sign up or start from an authenticated user with no business.
2. Complete the two-step onboarding flow.
3. Land on the new business activation launchpad.
4. Publish or confirm the public inquiry form.
5. Open the public form and submit a test inquiry.
6. Return to the dashboard and open the inquiry.
7. Start a linked draft quote.
8. Confirm the activation states update without access-control leaks.

Also update marketing-home assertions when headline or section copy changes.

### Accessibility and Responsive Checks

- Complete onboarding using keyboard only.
- Verify visible focus and announced validation errors.
- Verify the three workflow options expose selected and recommended states
  accessibly.
- Verify 320px, 375px, tablet, and desktop widths.
- Verify long business names, service labels, and translated browser-generated
  autofill values do not overflow controls.
- Verify reduced-motion behavior for existing transitions.

## Verification Commands

Run checks in this order after implementation:

```bash
npm run check
npm run test
npm run test:integration
npm run build
npm run test:e2e:smoke
```

Because onboarding and dashboard routes are changing, `npm run build` is
required. Because the onboarding server action creates business-scoped records,
`npm run test:integration` is required. Run the focused onboarding Playwright
test directly during iteration before the complete smoke suite.

If no schema change is made, do not generate a migration. If a real schema
constraint forces a change, stop and document why the compatibility approach in
this plan is insufficient before generating a new sequential migration.

## Acceptance Criteria

The implementation is complete when:

- A new owner can create the first business in two concise steps.
- The blocking flow asks only for identity data that is missing, business name,
  service category, contact destination, regional defaults, and starting
  workflow.
- Only three workflow starters are visible.
- Service category and workflow starter are separate typed concepts.
- Existing businesses, forms, and inquiry snapshots continue to work unchanged.
- The owner lands on a clear publish -> test inquiry -> draft quote path.
- The activation launchpad disappears after the relevant real milestones are
  complete.
- Marketing consistently describes owner-led custom-quote businesses and the
  cost of slow response or missed follow-up.
- No removed feature, enterprise workflow, appointment scheduling, or vertical
  template marketplace is introduced.
- Required automated checks pass, or any environment-specific failure is
  documented with the exact command and reason.

## Non-Goals

- Choosing one exclusive industry vertical.
- Creating many industry landing pages.
- Building a template marketplace or ongoing template browser.
- Redesigning the full dashboard.
- Adding advanced team collaboration or approval workflows.
- Adding appointment scheduling, dispatch, routing, payroll, or procurement.
- Reworking quote-template or email-template libraries that are unrelated to
  first-business starter workflows.
- Replacing Better Auth or changing the business ownership model.
- Adding onboarding product analytics to the public anonymous analytics-event
  table.
- Migrating all historical business-type data to a new taxonomy.

## Recommended Delivery Shape

Keep the work reviewable through three logical commits or pull-request slices:

1. `refactor(onboarding): separate workflow starters from business types`
2. `feat(onboarding): simplify setup and add activation launchpad`
3. `copy(marketing): align target-market and next-step messaging`

Do not stage or commit unrelated product-simplification changes with these
slices. If the worktree remains broadly dirty, implement carefully on top of it
and let the owner decide the final commit grouping.
