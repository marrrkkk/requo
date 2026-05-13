# Implementation Plan: Non-Blocking Route Transitions

## Overview

Shift the navigation model from blocking (hold current page until next is ready) to non-blocking (navigate immediately, show destination shell with skeleton fallbacks). This involves: simplifying the `useProgressRouter` hook to remove `startTransition` wrapping, adding `unstable_instant` exports to all async pages, creating a missing `loading.tsx` for the account route, and validating correctness with property-based and unit tests.

## Tasks

- [x] 1. Simplify `useProgressRouter` hook to remove blocking behavior
  - [x] 1.1 Remove `startTransition` wrapping from `useProgressRouter`
    - Remove `useTransition`, `startTransition`, `awaitingCompletionRef`, and `trackTransition` from `hooks/use-progress-router.ts`
    - Call `router.push` and `router.replace` directly without wrapping in `startTransition`
    - Remove the `useEffect` that dispatches `dispatchRouteProgressComplete` based on `isPending`
    - Keep `refresh` calling `router.refresh` directly (no transition wrapper)
    - Retain all progress-bar event dispatching logic (`dispatchRouteProgressStart`)
    - Retain the `isSamePathQueryUpdate` guard that skips progress start for same-path navigations
    - _Requirements: 5.2, 1.1, 1.2_

  - [ ]* 1.2 Write property test: non-blocking navigation via useProgressRouter (Property 4)
    - **Property 4: Non-blocking navigation via useProgressRouter**
    - **Validates: Requirements 5.2**
    - Create `tests/unit/route-transitions.test.ts`
    - Use `fast-check` to generate arbitrary href strings and verify `push`/`replace` never wrap in `startTransition`
    - Verify the hook calls `router.push`/`router.replace` directly for any valid href
    - Minimum 100 iterations

  - [ ]* 1.3 Write unit tests for `useProgressRouter` hook behavior
    - Verify `push` calls `router.push` directly without `startTransition`
    - Verify `replace` calls `router.replace` directly without `startTransition`
    - Verify progress start events are dispatched for cross-path navigations
    - Verify same-path query updates skip progress start dispatch
    - Verify `refresh` dispatches progress start with `force: true`
    - Add tests to `tests/unit/route-transitions.test.ts`
    - _Requirements: 5.2, 4.1_

- [x] 2. Checkpoint - Verify hook changes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Add `unstable_instant` exports to pages without it
  - [x] 3.1 Add `unstable_instant` to auth route pages
    - Add `export const unstable_instant = { prefetch: 'static' }` to:
      - `app/(auth)/login/page.tsx`
      - `app/(auth)/signup/page.tsx`
      - `app/(auth)/forgot-password/page.tsx`
      - `app/(auth)/reset-password/page.tsx`
      - `app/(auth)/check-email/page.tsx`
    - _Requirements: 1.3, 5.1_

  - [x] 3.2 Add `unstable_instant` to admin route pages
    - Add `export const unstable_instant = { prefetch: 'static' }` to:
      - `app/admin/page.tsx`
      - All admin sub-route pages (users, businesses, subscriptions, audit-logs)
    - _Requirements: 1.3, 5.1_

  - [x] 3.3 Add `unstable_instant` to onboarding and businesses pages
    - Add `export const unstable_instant = { prefetch: 'static' }` to:
      - `app/onboarding/page.tsx`
      - `app/businesses/page.tsx`
    - _Requirements: 1.3, 5.1_

  - [x] 3.4 Update account pages from `false` to `{ prefetch: 'static' }`
    - Change `export const unstable_instant = false` to `export const unstable_instant = { prefetch: 'static' }` in:
      - `app/account/profile/page.tsx`
      - `app/account/security/page.tsx`
      - `app/account/billing/page.tsx`
    - Add `export const unstable_instant = { prefetch: 'static' }` to `app/account/page.tsx`
    - _Requirements: 1.3, 5.1_

  - [x] 3.5 Update settings members page from `false` to `{ prefetch: 'static' }`
    - Change `export const unstable_instant = false` to `export const unstable_instant = { prefetch: 'static' }` in:
      - `app/businesses/[slug]/(main)/settings/members/page.tsx`
    - Add `export const unstable_instant = { prefetch: 'static' }` to any other settings sub-route pages that perform async data fetching and lack the export
    - _Requirements: 1.3, 5.1_

- [x] 4. Add missing `loading.tsx` for account route
  - [x] 4.1 Create `app/account/loading.tsx` skeleton fallback
    - Create `app/account/loading.tsx` with a skeleton that matches the account page layout structure
    - Include skeleton elements for: page heading, description, and content rows (form fields / cards)
    - Use the existing `Skeleton` component from `@/components/ui/skeleton`
    - Ensure skeleton dimensions match the resolved account page to prevent CLS
    - _Requirements: 3.1, 3.2, 3.4_

- [x] 5. Checkpoint - Verify page exports and skeleton
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Property-based tests for progress bar timing
  - [ ]* 6.1 Write property test: progress bar hidden for fast navigations (Property 2)
    - **Property 2: Progress bar hidden for fast navigations**
    - **Validates: Requirements 4.3**
    - Add to `tests/unit/route-transitions.test.ts`
    - Use `fast-check` to generate completion times in range [0, 179]ms
    - Verify the progress bar never transitions to visible state for any completion time under 180ms
    - Minimum 100 iterations

  - [ ]* 6.2 Write property test: progress bar reset on interrupted navigation (Property 3)
    - **Property 3: Progress bar reset on interrupted navigation**
    - **Validates: Requirements 4.6**
    - Add to `tests/unit/route-transitions.test.ts`
    - Use `fast-check` to generate sequences of two navigations with varying timing
    - Verify the progress bar resets and tracks the new navigation without a full hide-then-show cycle
    - Minimum 100 iterations

- [ ] 7. Static validation and E2E smoke tests
  - [ ]* 7.1 Write unit test to validate `unstable_instant` coverage
    - Add to `tests/unit/route-transitions.test.ts`
    - Verify all async pages listed in Requirement 3.2 export `unstable_instant` with correct config
    - Verify layouts that should keep `unstable_instant = false` still have it set to `false`
    - _Requirements: 1.3, 3.2_

  - [ ]* 7.2 Write E2E smoke test for non-blocking navigation
    - Create `tests/e2e/route-transitions.spec.ts`
    - Test navigation between sibling dashboard tabs preserves shared layout (no unmount)
    - Test navigation to account pages shows skeleton immediately
    - Test browser back/forward renders cached content without skeleton flash
    - _Requirements: 5.3, 5.5, 6.2_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The `RouteProgressBar` component requires no code changes — its existing timing logic (180ms delay, 15s stall timeout, reset on interrupt) already satisfies Requirements 4.3–4.6
- Layouts with auth gates (`businesses/[slug]/(main)/layout.tsx`, `settings/layout.tsx`) intentionally keep `unstable_instant = false`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "4.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "3.1", "3.2", "3.3", "3.4", "3.5"] },
    { "id": 2, "tasks": ["6.1", "6.2", "7.1"] },
    { "id": 3, "tasks": ["7.2"] }
  ]
}
```
