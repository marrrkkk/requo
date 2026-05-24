# Implementation Plan: Instant Navigation

## Overview

Remove the global progress bar and implement per-route-segment structural loading states across all route groups. Each loading.tsx renders real page chrome (titles, headers, buttons, filter bars) synchronously and uses `<Skeleton>` only for data-dependent content. Page components wrap independent data sections in Suspense boundaries for parallel streaming.

## Tasks

- [x] 1. Remove global progress bar
  - [x] 1.1 Remove RouteProgressBar component and route-progress utilities
    - Delete `components/shared/route-progress-bar.tsx` and `lib/navigation/route-progress.ts`
    - Remove RouteProgressBar import and usage from `app/layout.tsx`
    - Remove any related NProgress or route-progress dependencies from `package.json`
    - _Requirements: 1.1, 1.2_

  - [ ]* 1.2 Write component test verifying progress bar removal
    - Assert root layout does not render a progress bar element
    - Assert no global loading indicator appears in the component tree
    - _Requirements: 1.2_

- [x] 2. Implement dashboard (main) route group loading states
  - [x] 2.1 Create structural loading.tsx for inquiries page
    - Render PageHeader with title "Inquiries", description, and action button placeholder
    - Render filter bar frame and table column headers synchronously
    - Use `<Skeleton>` only for table row content and stat values
    - Match spatial layout of the loaded inquiries page
    - _Requirements: 2.1, 2.2, 5.1, 9.1, 9.2_

  - [x] 2.2 Create structural loading.tsx for quotes page
    - Render PageHeader with title "Quotes", description, and action button placeholder
    - Render filter bar frame and table column headers synchronously
    - Use `<Skeleton>` only for table row content
    - _Requirements: 2.1, 2.2, 5.1, 9.1, 9.2_

  - [x] 2.3 Create structural loading.tsx for follow-ups page
    - Render PageHeader with title "Follow-ups", description, and action button placeholder
    - Render table/list headers synchronously
    - Use `<Skeleton>` only for follow-up items
    - _Requirements: 2.1, 2.2, 5.1, 9.1, 9.2_

  - [x] 2.4 Create structural loading.tsx for analytics page
    - Render PageHeader with title "Analytics" and description
    - Render stat card frames and chart container outlines
    - Use `<Skeleton>` only for stat values and chart areas
    - _Requirements: 2.1, 2.2, 5.1, 9.1, 9.2_

  - [x] 2.5 Create structural loading.tsx for jobs page
    - Render PageHeader with title "Jobs", description, and action button placeholder
    - Render table column headers synchronously
    - Use `<Skeleton>` only for job row content
    - _Requirements: 2.1, 2.2, 5.1, 9.1, 9.2_

  - [x] 2.6 Create structural loading.tsx for invoices page
    - Render PageHeader with title "Invoices", description, and action button placeholder
    - Render table column headers synchronously
    - Use `<Skeleton>` only for invoice row content
    - _Requirements: 2.1, 2.2, 5.1, 9.1, 9.2_

  - [x] 2.7 Create structural loading.tsx for remaining main pages (dashboard, forms, knowledge, members, chat, assistant)
    - Each loading.tsx renders page-specific structural elements (page title, action buttons, section frames)
    - Use `<Skeleton>` only for data-dependent content areas
    - _Requirements: 2.1, 2.2, 5.1, 9.1, 9.2_

  - [ ]* 2.8 Write component tests for dashboard loading states
    - Verify each loading.tsx renders expected structural elements (headings, buttons, table headers)
    - Verify skeletons only appear in data-dependent areas
    - Verify no async operations or data fetching in loading files
    - _Requirements: 2.1, 2.2, 2.3, 5.1_

- [x] 3. Implement settings route group loading states
  - [x] 3.1 Create structural loading.tsx for settings sub-pages
    - Create per-section loading.tsx files for settings routes that lack them (general, billing, members, notifications, etc.)
    - Render settings panel frame, section title, and form field labels synchronously
    - Use `<Skeleton>` only for form field values and dynamic labels
    - _Requirements: 2.1, 2.2, 5.3, 9.1, 9.2_

  - [ ]* 3.2 Write component tests for settings loading states
    - Verify settings loading states render panel structure and labels
    - Verify skeletons only appear for dynamic form values
    - _Requirements: 5.3_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement marketing route group loading states
  - [x] 5.1 Create structural loading.tsx for marketing pages (pricing, home, legal pages)
    - Render hero structure, section headings, and CTA button placeholders synchronously
    - Use `<Skeleton>` only for dynamic pricing values and testimonials
    - Keep marketing header and footer in layout (already persisted)
    - _Requirements: 2.1, 2.2, 7.1, 7.2, 9.1, 9.2_

  - [ ]* 5.2 Write component tests for marketing loading states
    - Verify structural elements render synchronously
    - Verify layout header/footer are not duplicated in loading states
    - _Requirements: 7.1, 7.2_

- [x] 6. Implement remaining route group loading states
  - [x] 6.1 Create structural loading.tsx for (public) routes (inquiry pages, quote pages)
    - Render page frame and section structure synchronously
    - Use `<Skeleton>` only for dynamic inquiry/quote content
    - _Requirements: 2.1, 2.2, 8.1, 9.1, 9.2_

  - [x] 6.2 Create structural loading.tsx for (checkout) routes
    - Render checkout page frame and step indicators synchronously
    - Use `<Skeleton>` only for pricing and plan details
    - _Requirements: 2.1, 2.2, 8.2, 9.1, 9.2_

  - [x] 6.3 Create structural loading.tsx for admin console routes
    - Render console structure and table headers synchronously
    - Use `<Skeleton>` only for data table rows and stats
    - _Requirements: 2.1, 2.2, 8.3, 9.1, 9.2_

  - [x] 6.4 Verify existing (auth) and onboarding loading states meet requirements
    - Review existing `app/(auth)/loading.tsx` and `app/onboarding/loading.tsx`
    - Adjust if they render full-page skeletons instead of structural elements
    - Ensure auth layout frame and onboarding step structure are present
    - _Requirements: 6.1, 6.2, 8.4_

  - [ ]* 6.5 Write component tests for public, checkout, admin, and auth loading states
    - Verify each loading.tsx renders expected structural elements
    - Verify no full-page skeleton patterns
    - _Requirements: 8.1, 8.2, 8.3, 6.1_

- [x] 7. Add Suspense boundaries for parallel data streaming
  - [x] 7.1 Add Suspense boundaries to inquiries page component
    - Wrap independent data sections (stats, table) in separate `<Suspense>` boundaries
    - Provide localized skeleton fallbacks for each section
    - Render structural elements (PageHeader, filters) synchronously outside Suspense
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 7.2 Add Suspense boundaries to quotes page component
    - Wrap independent data sections in separate `<Suspense>` boundaries
    - Provide localized skeleton fallbacks
    - Render structural elements synchronously outside Suspense
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 7.3 Add Suspense boundaries to analytics page component
    - Wrap stat cards and chart sections in independent `<Suspense>` boundaries
    - Provide localized skeleton fallbacks for each analytics section
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 7.4 Add Suspense boundaries to remaining dashboard pages with multiple data sections
    - Apply to jobs, invoices, follow-ups, dashboard overview, and any other pages with independent data sections
    - Render structural elements synchronously outside Suspense
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 7.5 Write component tests for Suspense boundary patterns
    - Verify structural elements render outside Suspense wrappers
    - Verify each independent data section has its own Suspense boundary
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Layout shift prevention and final integration
  - [x] 9.1 Add fixed/minimum height containers to all skeleton areas
    - Audit each loading.tsx for data skeleton areas
    - Add `min-h-*` or fixed-height containers to prevent reflow when data streams in
    - Match dimensions between skeleton placeholders and loaded content
    - _Requirements: 9.1, 9.2_

  - [x] 9.2 Verify layout persistence across all route groups
    - Confirm shared layouts (dashboard shell, auth frame, marketing header/footer) do not render skeleton chrome for their own elements
    - Confirm layouts use Next.js nested layout architecture correctly
    - _Requirements: 3.1, 3.2, 3.3, 5.2_

  - [ ]* 9.3 Write E2E navigation test for instant navigation
    - Test sibling navigation within dashboard routes maintains shell stability
    - Assert no global progress bar element appears during transitions
    - Verify loading states show structural elements before data resolves
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The existing `(auth)/loading.tsx` and `onboarding/loading.tsx` already follow structural patterns and may only need minor adjustments
- The existing `DashboardPageSkeleton` in the (main) loading.tsx is a generic skeleton — each sub-page needs its own purpose-built loading.tsx
- Reuse `components/ui/skeleton.tsx` primitive and `components/shell/` shared compositions
- No new skeleton primitive component is needed — compose existing `<Skeleton>` into page-specific layouts

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "3.1"] },
    { "id": 2, "tasks": ["2.8", "3.2", "5.1", "6.1", "6.2", "6.3", "6.4"] },
    { "id": 3, "tasks": ["5.2", "6.5", "7.1", "7.2", "7.3", "7.4"] },
    { "id": 4, "tasks": ["7.5", "9.1"] },
    { "id": 5, "tasks": ["9.2", "9.3"] }
  ]
}
```
