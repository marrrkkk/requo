# Implementation Plan: Instant Navigation Rollout

## Overview

This plan converts the design into incremental coding steps that make authenticated dashboard navigation genuinely instant. The work follows the design's phased, verified rollout:

- **Phase 0** — global router `staleTimes` config plus the pure rollout-governance tooling (escape-hatch validator, overdue detection, migration-coverage derivation, verification-gate / phase-ordering logic, coverage-check script). This pure decision logic is the only property-based-testing surface, so its property tests live here, close to implementation.
- **Phase 1 (pilot)** — migrate the home page, the inquiries list page, and one inquiry detail page to the non-blocking structural-shell pattern, then run the Verification_Gate.
- **Phase 2+** — extend the migration across the remaining `(main)`, `settings`, `admin`, `onboarding`, `(business)/new`, and businesses-hub routes, each ending in a Verification_Gate.
- **Final phase** — migrate the `(auth)` pages and remove their `unstable_disableValidation` flag, after every other phase has passed its gate.

Implementation language: **TypeScript / React** (the design uses TypeScript throughout).

Source of truth for all Next-specific behavior is the bundled documentation under `node_modules/next/dist/docs/` (`instant-navigation.md`, `instant.md`, `prefetching.md`, `caching.md`, `staleTimes.md`). Consult the relevant guide before writing any Next-specific code.

Each non-blocking-structure migration uses the same move: return the structural shell and skeletons synchronously, push every dynamic read (`params`, `searchParams`, `getAppShellContext`, cached/live queries) into a `<Suspense>`-wrapped child server component, and remove the `unstable_disableValidation` flag so validation runs. Authorization (`getAppShellContext`), business scoping (queries keyed by `businessId`), and mutation invalidation (`updateTag` via `updateCacheTags`) are preserved exactly.

## Tasks

- [x] 1. Phase 0 — Router stale-times configuration and bounds validator
  - [x] 1.1 Set deliberate `experimental.staleTimes` in `next.config.ts`
    - Change `staleTimes` from `{ dynamic: 86400, static: 86400 }` to `{ dynamic: 30, static: 180 }`
    - Add an inline comment documenting the freshness-versus-reuse rationale for each value and referencing the bundled `staleTimes.md` and `prefetching.md`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 1.2 Implement the stale-times bounds validator
    - Create `lib/instant-navigation/stale-times.ts` with the `StaleTimesConfig` type and a pure `isValidStaleTimes(config)` returning true iff `0 <= dynamic <= 60` and `60 <= static <= 300`
    - _Requirements: 8.1, 8.2_

  - [ ]* 1.3 Write property test for the stale-times bounds validator
    - **Property 5: Stale-times bounds validator**
    - **Validates: Requirements 8.1, 8.2**
    - fast-check, min 100 iterations, tagged `// Feature: instant-navigation-rollout, Property 5: ...`; generators cover boundary values 0, 60, 180, 300 and values just outside the bounds

- [x] 2. Phase 0 — Escape-hatch governance (validator, overdue, registry)
  - [x] 2.1 Implement the escape-hatch validator and types
    - Create `lib/instant-navigation/escape-hatches.ts` with `EscapeHatchEntry`, `EscapeHatchValidationResult`, the in-scope route set, and a pure `validateEscapeHatch(entry)` that returns `{ ok: true }` only when the entry resolves to exactly one in-scope route, has a non-empty `reason`, and has a valid `targetReviewDate`; otherwise `{ ok: false, errors }` naming each violated condition
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 2.2 Write property test for the escape-hatch validator
    - **Property 1: Escape-hatch validator correctness**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
    - fast-check, min 100 iterations; generators cover empty/whitespace `reason`, missing/invalid `targetReviewDate`, and route lists of length 0/1/many

  - [x] 2.3 Implement escape-hatch overdue detection
    - Add a pure `isEscapeHatchOverdue(entry, now)` to `lib/instant-navigation/escape-hatches.ts` returning true iff the entry is still active and `now` is strictly after `targetReviewDate`
    - _Requirements: 3.6_

  - [ ]* 2.4 Write property test for overdue detection
    - **Property 2: Escape-hatch overdue detection**
    - **Validates: Requirements 3.6**
    - fast-check, min 100 iterations; include the boundary case where `now` equals `targetReviewDate` (not overdue) and inactive entries (never overdue)

  - [x] 2.5 Create the escape-hatch tracked registry
    - Create the human-readable `.kiro/specs/instant-navigation-rollout/escape-hatches.md` and a typed `lib/instant-navigation/escape-hatch-registry.ts` exporting an initially-empty `EscapeHatchEntry[]`, each entry carrying `route`, `reason`, and `targetReviewDate`
    - _Requirements: 3.1, 3.2_

- [x] 3. Phase 0 — Migration coverage, verification gate, and phase ordering
  - [x] 3.1 Implement the migration-coverage derivation
    - Create `lib/instant-navigation/migration-coverage.ts` with the `MigrationCoverage` type and a pure derivation where `migrated` is true iff validation is enabled for the route and every cached query's cache tags each have at least one revalidating mutation action
    - _Requirements: 7.3, 7.4_

  - [ ]* 3.2 Write property test for the migration-coverage derived flag
    - **Property 4: Migration-coverage derived flag**
    - **Validates: Requirements 7.3, 7.4**
    - fast-check, min 100 iterations; assert any cached-query tag without a revalidator forces `migrated` false

  - [x] 3.3 Implement the verification-gate and phase-advancement logic
    - Create `lib/instant-navigation/rollout.ts` with the `RolloutPhase` type, a pure `isGatePassed(phase)` (passes iff both `check` and `build` are zero-error), and `canAdvance(phase)` (true iff the current phase's gate passed)
    - _Requirements: 9.2, 9.3, 9.6_

  - [ ]* 3.4 Write property test for verification gate and phase advancement
    - **Property 6: Verification gate and phase advancement**
    - **Validates: Requirements 9.2, 9.3, 9.6**
    - fast-check, min 100 iterations over all combinations of `check`/`build` results; assert a failed gate never permits advancement

  - [x] 3.5 Implement the phase-ordering validator
    - Add a pure `isValidPhaseOrdering(phases)` to `lib/instant-navigation/rollout.ts` returning true iff the pilot phase precedes every other in-scope phase and the `(auth)` phase comes strictly after every other in-scope phase
    - _Requirements: 9.1, 9.5_

  - [ ]* 3.6 Write property test for phase-ordering validity
    - **Property 7: Phase-ordering validity**
    - **Validates: Requirements 9.1, 9.5**
    - fast-check, min 100 iterations over permutations of phase orderings

  - [x] 3.7 Implement the migration-coverage check script
    - Create `scripts/instant-navigation/check-coverage.ts` that parses in-scope page files and asserts each page either has validation enabled (no disable flag) or has a matching, valid single-route registry entry (via `validateEscapeHatch`), failing on any page exempted without a valid tracked entry
    - _Requirements: 2.5, 3.1, 3.3, 7.4_

- [x] 4. Phase 0 checkpoint - Verify configuration and governance tooling
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npm run check`; confirm `isValidStaleTimes`, escape-hatch, coverage, and rollout property tests pass and the coverage-check script runs.

- [x] 5. Phase 1 (Pilot) — Migrate home, inquiries list, and inquiry detail
  - [x] 5.1 Refactor the home page to a non-blocking structural shell
    - In `app/(business)/[businessSlug]/(main)/home/page.tsx`, return the structural shell and skeletons synchronously; move `getAppShellContext` and all dynamic reads into `<Suspense>`-wrapped child server components, keeping the same components, structure, and styling
    - _Requirements: 1.1, 1.2, 1.4, 1.6, 5.3, 6.1, 10.6_

  - [x] 5.2 Cache the home incidental tour-completed query behind Suspense
    - Add a two-layer cached form of `getDashboardTourCompletedForMembership` (`React.cache()` + inner `"use cache"` with `cacheTag` from `getBusinessChecklistCacheTags` and a `cacheLife`) in `features/onboarding/queries.ts`; read it inside a `<Suspense>`-wrapped `DashboardTourGate` child that renders a fallback if the read fails or is slow
    - _Requirements: 5.1, 5.2, 5.4, 4.4_

  - [x] 5.3 Enable Instant_Validation on the home page
    - Set `unstable_instant = { prefetch: "static" }` (remove `unstable_disableValidation`) on the home page; resolve any blocking component validation surfaces by caching or Suspense-wrapping
    - _Requirements: 2.1, 2.5_

  - [x] 5.4 Refactor the inquiries list page to a non-blocking structural shell
    - In `app/(business)/[businessSlug]/(main)/inquiries/page.tsx`, return the shell and list/controls skeletons synchronously; move `getAppShellContext`, `getInquiryListPageForBusiness`, and `getInquiryListCountForBusiness` into `<Suspense>`-wrapped child components keyed by the active `businessId`; stream any live data behind its own boundary
    - _Requirements: 1.1, 1.2, 1.4, 1.6, 4.1, 4.2, 4.3, 4.4, 6.1, 6.3_

  - [x] 5.5 Enable Instant_Validation on the inquiries list page
    - Set `unstable_instant = { prefetch: "static" }` (remove the disable flag) and resolve any flagged blocking reads
    - _Requirements: 2.1, 2.5_

  - [x] 5.6 Refactor the inquiry detail page to a non-blocking structural shell
    - In `app/(business)/[businessSlug]/(main)/inquiries/[id]/page.tsx`, return the shell synchronously; move `getAppShellContext` and `getInquiryDetailForBusiness` (keyed by `businessId` + `inquiryId`) into a `<Suspense>` child; wrap independently-failing regions in a co-located error boundary and show skeletons on cold cache
    - _Requirements: 1.1, 1.2, 1.4, 1.6, 1.7, 4.1, 4.3, 4.5, 6.1, 6.3_

  - [x] 5.7 Enable Instant_Validation on the inquiry detail page
    - Set `unstable_instant = { prefetch: "static" }` (remove the disable flag) and resolve any flagged blocking reads
    - _Requirements: 2.1, 2.5_

  - [ ]* 5.8 Write property test for cache-tag scoping and mutation superset
    - **Property 3: Cache-tag scoping and mutation superset**
    - **Validates: Requirements 4.2, 7.1**
    - Target `getBusinessInquiryListCacheTags`, `getBusinessInquiryDetailCacheTags`, and `getInquiryMutationCacheTags`; expose `getInquiryMutationCacheTags` as a pure helper (e.g. in `lib/cache/business-tags.ts`) without changing its computed tags. fast-check, min 100 iterations; assert `business:<id>` scope-tag presence, that the mutation tag set is a superset of both query tag sets, and that returned arrays are duplicate-free

  - [ ]* 5.9 Write component tests for region isolation and incidental fallback
    - Force a Suspense child to throw/reject and assert the structural shell and sibling regions stay rendered while only the affected region shows an error/fallback; assert the slow/failed tour-flag region renders a fallback without failing navigation
    - _Requirements: 1.7, 5.4_

  - [ ]* 5.10 Write integration tests for pilot access control and read-after-write
    - Run the existing business-scoped access-control suite against the migrated pilot routes plus non-member and unauthenticated redirect cases; assert the first read after a successful mutation returns mutated data, and a failed mutation leaves cached content unchanged
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 4.6, 7.2, 7.5_

  - [ ]* 5.11 Add `@next/playwright` `instant()` assertions for pilot navigation
    - Assert instant sibling navigation (e.g. inquiries -> home, inquiries list -> inquiry detail) for the pilot flows
    - _Requirements: 9.7, 1.3, 1.5_

- [x] 6. Phase 1 (Pilot) checkpoint - Verification_Gate
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npm run check` and `npm run build`; treat the gate as passed only when both complete with zero errors and instant validation reports no blocking components on the pilot routes.
  - _Requirements: 9.2, 9.4, 2.2, 2.3, 9.6_

- [x] 7. Phase 2 — Migrate remaining `(main)` dashboard routes
  - [x] 7.1 Migrate `(main)` list pages
    - Apply the non-blocking structural-shell pattern and remove the disable flag on `quotes`, `jobs`, `invoices`, `follow-ups`, `members`, `knowledge`, and `forms` list pages; route data through their existing `businessId`-keyed Cached_Content_Query helpers behind per-region `<Suspense>` boundaries
    - _Requirements: 1.1, 1.2, 1.4, 1.6, 2.1, 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.3, 10.6_

  - [x] 7.2 Migrate `(main)` detail and create pages
    - Apply the same pattern and remove the disable flag on `quotes/[id]`, `quotes/new`, `jobs/[id]`, `invoices/[id]`, `forms/[formSlug]`, and `inquiries/new`; add co-located error boundaries for independently-failing regions
    - _Requirements: 1.1, 1.2, 1.4, 1.6, 1.7, 2.1, 4.1, 4.3, 4.5, 6.1, 6.3, 10.6_

  - [ ]* 7.3 Write integration tests for migrated `(main)` routes
    - Run access-control and read-after-write integration checks across the migrated `(main)` routes
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 4.6, 7.5_

- [x] 8. Phase 2 checkpoint - Verification_Gate for `(main)` routes
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npm run check` and `npm run build`; do not begin the next phase until both pass with zero errors.
  - _Requirements: 9.2, 9.3, 9.6, 2.2, 2.3_

- [x] 9. Phase 3 — Migrate `settings` routes
  - [x] 9.1 Migrate settings group A
    - Apply the non-blocking structural-shell pattern and remove the disable flag on `general`, `profile`, `notifications`, `quote`, `email`, and `support` settings pages
    - _Requirements: 1.1, 1.2, 1.4, 1.6, 2.1, 4.4, 6.1, 6.3, 10.6_

  - [x] 9.2 Migrate settings group B
    - Apply the pattern and remove the disable flag on `pricing`, `pricing-library`, `members`, `invoices`, `knowledge`, `billing`, `audit-log`, `forms`, and `forms/[formSlug]` settings pages
    - _Requirements: 1.1, 1.2, 1.4, 1.6, 2.1, 4.4, 6.1, 6.3, 10.6_

  - [ ]* 9.3 Write integration tests for migrated settings routes
    - Run access-control checks across the migrated settings routes
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 10. Phase 3 checkpoint - Verification_Gate for `settings` routes
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npm run check` and `npm run build`; do not begin the next phase until both pass with zero errors.
  - _Requirements: 9.2, 9.3, 9.6, 2.2, 2.3_

- [x] 11. Phase 4 — Migrate `admin`, `onboarding`, `(business)/new`, and businesses hub
  - [x] 11.1 Migrate `admin/(console)` pages
    - Apply the non-blocking structural-shell pattern and remove the disable flag on the admin console `page`, `system`, `users`, `subscriptions`, `audit-logs`, and `businesses` pages
    - _Requirements: 1.1, 1.2, 1.4, 1.6, 2.1, 6.1, 6.3, 10.6_

  - [x] 11.2 Migrate onboarding, new-business, and businesses hub
    - Apply the pattern and remove the disable flag on `app/onboarding/page.tsx`, `app/(business)/new/page.tsx`, and the businesses hub
    - _Requirements: 1.1, 1.2, 1.4, 1.6, 2.1, 6.1, 6.3, 10.6_

  - [x] 11.3 Record any required escape-hatch entries
    - For any Phase 4 route that genuinely cannot satisfy validation this phase, add a single-route entry to `lib/instant-navigation/escape-hatch-registry.ts` and `escape-hatches.md` (with `reason` and `targetReviewDate`), validated by `validateEscapeHatch`; do not re-add the disable flag as a default
    - _Requirements: 3.1, 3.2, 3.3, 3.6_

  - [ ]* 11.4 Write integration tests for migrated admin/onboarding/new routes
    - Run access-control checks across the migrated admin, onboarding, new-business, and hub routes
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 12. Phase 4 checkpoint - Verification_Gate for admin/onboarding/new/hub
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npm run check` and `npm run build`; do not begin the final phase until both pass with zero errors.
  - _Requirements: 9.2, 9.3, 9.6, 2.2, 2.3_

- [x] 13. Final Phase — Migrate `(auth)` pages and remove disable flags
  - [x] 13.1 Migrate `(auth)` pages and remove the disable flag
    - Apply the non-blocking structural-shell pattern and set `unstable_instant = { prefetch: "static" }` (remove `unstable_disableValidation`) on `login`, `signup`, `forgot-password`, `reset-password`, and `check-email`; this phase begins only after every other in-scope phase has passed its gate
    - _Requirements: 9.5, 2.1, 1.1, 1.2, 1.4, 1.6, 10.6_

  - [ ]* 13.2 Run e2e smoke tests for migrated auth flows
    - Confirm identical reachable destinations and step sequence for sign-in and related auth flows after migration
    - _Requirements: 10.5_

- [x] 14. Final checkpoint - Verification_Gate and scope/coverage guards
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npm run check` and `npm run build` (zero errors); run the migration-coverage check script; confirm a file-level `git diff` shows zero changes across the public route trees (`inquire`, `quote`, `b`), marketing pages, API handlers, the auth system, and migrations/schema.
  - _Requirements: 9.2, 9.6, 2.2, 2.3, 2.5, 3.3, 7.4, 10.1, 10.2, 10.3, 10.4_

## Notes

- Tasks marked with `*` are optional test tasks and can be skipped for a faster MVP; core implementation tasks are never optional.
- Each task references specific requirement sub-clauses for traceability.
- Property-based tests (Properties 1-7) target only the pure decision logic (escape-hatch validator/overdue, migration-coverage derivation, cache-tag relationships, stale-times bounds, verification-gate/phase-advancement, phase-ordering). All other criteria are framework-enforced by build-time instant validation, asserted by `instant()`/e2e, or covered by DB-backed access-control and read-after-write integration tests.
- Every property-based test uses fast-check with a minimum of 100 iterations and a `// Feature: instant-navigation-rollout, Property <n>: ...` tag comment.
- Verification_Gate checkpoints (`npm run check` + `npm run build`, both zero-error) end every phase; a phase must not advance until its gate passes (Req 9.6).
- Requirement 9.4 (manual Next.js instant DevTools verification) is an operator-performed check, not a coding task; programmatic pilot-navigation verification is covered by the `instant()` e2e assertions in task 5.11.
- The bundled Next.js docs under `node_modules/next/dist/docs/` are the source of truth for all Next-specific behavior.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1", "3.1", "3.3", "3.5"] },
    { "id": 1, "tasks": ["1.3", "2.2", "2.3", "2.5", "3.2", "3.4", "3.6", "3.7"] },
    { "id": 2, "tasks": ["2.4", "5.1", "5.4", "5.6"] },
    { "id": 3, "tasks": ["5.2", "5.5", "5.7", "5.8"] },
    { "id": 4, "tasks": ["5.3", "5.9", "5.10"] },
    { "id": 5, "tasks": ["5.11", "7.1", "7.2"] },
    { "id": 6, "tasks": ["7.3", "9.1", "9.2"] },
    { "id": 7, "tasks": ["9.3", "11.1", "11.2", "11.3"] },
    { "id": 8, "tasks": ["11.4", "13.1"] },
    { "id": 9, "tasks": ["13.2"] }
  ]
}
```
