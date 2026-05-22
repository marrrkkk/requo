# Implementation Plan: Business Routing Refactor

## Overview

Promote business slugs to top-level route segments, enhance the business switcher with additional actions, add a dedicated new business creation page, consolidate settings into a unified area with its own sidebar, and clean up navigation. This is primarily a routing and UI shell change — no schema changes required.

## Tasks

- [x] 1. Set up routing infrastructure and reserved segments
  - [x] 1.1 Create reserved route segments module
    - Create `lib/routing/reserved-segments.ts` with the `RESERVED_ROUTE_SEGMENTS` set and `isReservedRouteSegment()` helper
    - Include all static segments: login, signup, forgot-password, reset-password, check-email, pricing, privacy, terms, refund-policy, onboarding, admin, api, invite, account, verify-email, businesses, quote, inquire, not-found, .well-known
    - Export as `ReadonlySet<string>`
    - _Requirements: 1.5, 1.6, 1.8_

  - [x] 1.2 Create business slug validation module
    - Create `features/businesses/validation.ts` with `validateBusinessSlug()` function
    - Validate slug format (lowercase alphanumeric + hyphens) and reject reserved segments
    - Integrate with existing `createBusinessSchema` in business mutations
    - _Requirements: 1.8_

  - [x] 1.3 Update route path helpers
    - Modify `features/businesses/routes.ts` to change `getBusinessPath(slug)` to return `/${slug}` instead of `/businesses/${slug}`
    - Verify all downstream helpers (`getBusinessDashboardPath`, `getBusinessSettingsPath`, etc.) compose correctly
    - _Requirements: 1.1, 1.2_

  - [x]* 1.4 Write property tests for reserved segments and slug validation
    - **Property 2: Reserved path segments take priority over business slugs**
    - **Property 4: Slug collision rejection on create/update**
    - **Validates: Requirements 1.5, 1.6, 1.8**

  - [x]* 1.5 Write property test for slug generation
    - **Property 8: Slug generation produces valid URL-safe slugs**
    - **Validates: Requirements 3.7**

- [x] 2. Implement top-level business route group
  - [x] 2.1 Create `app/(business)/[businessSlug]/layout.tsx`
    - Create the route group directory structure `app/(business)/[businessSlug]/`
    - Implement the layout that resolves `businessSlug` param, looks up the business in DB, and calls `notFound()` if not found
    - Reuse existing `getAppShellContext` / `getBusinessContextForMembershipSlug` patterns for auth gating and membership checks
    - Render the dashboard shell (sidebar + content area)
    - _Requirements: 1.1, 1.7_

  - [x] 2.2 Move existing business sub-routes to new location
    - Relocate all pages from `app/businesses/[slug]/` (dashboard, inquiries, quotes, follow-ups, analytics, members, forms, knowledge, assistant, jobs, invoices) into `app/(business)/[businessSlug]/`
    - Preserve existing page components and layouts — only change file locations
    - Update any hardcoded route references within these pages
    - _Requirements: 1.2_

  - [x] 2.3 Create legacy business URL redirect handler
    - Create `app/businesses/[slug]/[...path]/route.ts` catch-all route handler
    - Issue 308 permanent redirect from `/businesses/:slug/*` to `/:slug/*`
    - Retain `app/businesses/page.tsx` (hub page) and `app/businesses/layout.tsx` unchanged
    - _Requirements: 1.3, 1.4_

  - [x]* 2.4 Write property test for legacy redirect computation
    - **Property 1: Legacy business URL redirect computation**
    - **Validates: Requirements 1.3**

- [x] 3. Checkpoint - Verify routing infrastructure
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement enhanced business switcher
  - [x] 4.1 Extend BusinessSwitcher component with full dropdown menu
    - Modify `components/shell/dashboard-shell.tsx` BusinessSwitcher section
    - Display current business name + avatar (initials fallback) in sidebar header
    - Truncate long business names with ellipsis
    - Use shadcn/ui `DropdownMenu` for the switcher dropdown
    - _Requirements: 2.1_

  - [x] 4.2 Implement business list section in switcher dropdown
    - Render all user memberships (up to 50) with business name, slug, role badge
    - Show checkmark on the currently active business
    - Show "Locked" badge for businesses with locked record state
    - Navigate to selected business dashboard on click
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 4.3 Add action items to switcher dropdown
    - Add "New business" action → navigates to `/businesses/new`
    - Add "Business settings" action → navigates to `/${activeSlug}/settings/general`
    - Add "Account settings" action → navigates to `/${activeSlug}/settings/profile`
    - Add "Invite team members" action → navigates to `/${activeSlug}/members`
    - Add "Sign out" action → calls sign-out and redirects to login
    - _Requirements: 2.5, 2.6, 2.7, 2.8, 2.9_

  - [x] 4.4 Handle mobile viewport behavior for switcher
    - Close mobile sidebar overlay after any switcher navigation action
    - Ensure dropdown is accessible and keyboard-navigable
    - _Requirements: 2.10_

  - [x]* 4.5 Write unit tests for business switcher
    - **Property 5: Business switcher renders complete membership list**
    - Test locked badge rendering, action items presence, and active business indicator
    - **Validates: Requirements 2.2, 2.4, 2.5–2.9**

- [x] 5. Implement new business creation page
  - [x] 5.1 Create new business page at `app/businesses/new/page.tsx`
    - Create page component with standalone layout (similar to hub page header)
    - Check user's plan quota — if exceeded, render `UpgradePrompt` instead of form
    - Otherwise render `CreateBusinessForm` (reuse existing component from `features/businesses/components/`)
    - _Requirements: 3.1, 3.5_

  - [x] 5.2 Enhance CreateBusinessForm for standalone use
    - Ensure form includes: business name input (2–80 chars), default currency selector, starter template selector
    - Add field-level inline validation error messages for invalid inputs
    - Auto-generate URL slug from business name on blur/change
    - Integrate `validateBusinessSlug()` to reject reserved segments
    - On success, navigate to new business dashboard
    - On server error, show error message and preserve form input
    - _Requirements: 3.2, 3.3, 3.4, 3.6, 3.7, 3.8_

  - [x]* 5.3 Write property tests for business creation validation
    - **Property 6: Quota exceeded blocks business creation**
    - **Property 7: Invalid business creation input produces field-level errors**
    - **Validates: Requirements 3.5, 3.6**

- [x] 6. Checkpoint - Verify switcher and creation page
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement unified settings area
  - [x] 7.1 Create settings navigation helper
    - Create `features/settings/navigation.ts` with `getUnifiedSettingsNavigation(slug)` function
    - Return grouped navigation: Personal (Profile, Appearance, Notifications) and Business (General, Members, Plans, Billing, Quote defaults, Email, Pricing, Knowledge, Integrations, Audit log)
    - Define `SettingsNavigationGroup` and `SettingsNavigationItem` types
    - _Requirements: 4.2, 4.3_

  - [x] 7.2 Create settings layout with SettingsSidebar
    - Create `app/(business)/[businessSlug]/settings/layout.tsx`
    - Implement two-column layout: left SettingsSidebar + right content area
    - SettingsSidebar renders grouped navigation with visible section headings
    - Highlight active item based on current pathname
    - _Requirements: 4.1, 4.9, 4.10_

  - [x] 7.3 Create personal settings pages under unified area
    - Create `app/(business)/[businessSlug]/settings/profile/page.tsx` — reuse existing profile settings content from `app/account/profile/`
    - Create `app/(business)/[businessSlug]/settings/appearance/page.tsx` — new appearance/theme page
    - Create `app/(business)/[businessSlug]/settings/notifications/page.tsx` — new notifications preferences page
    - Default route (`/settings`) redirects to `/settings/profile`
    - _Requirements: 4.4, 4.5_

  - [x] 7.4 Move business settings pages to unified area
    - Relocate existing business settings pages from `app/(business)/[businessSlug]/settings/` sub-routes (general, members, plans, billing, quote, email, pricing, knowledge, integrations, audit-log)
    - Ensure they render within the new settings layout
    - _Requirements: 4.6_

  - [x] 7.5 Create legacy account URL redirect handler
    - Create `app/account/[...path]/route.ts` catch-all route handler
    - Resolve user's most-recently-active business slug (from `user_recent_businesses`), fall back to first alphabetically
    - Issue 308 redirect from `/account/:section` to `/${activeSlug}/settings/:section`
    - Handle no-business case by redirecting to `/onboarding`
    - _Requirements: 4.7, 4.8_

  - [x]* 7.6 Write property test for account settings redirect
    - **Property 9: Account settings legacy redirect uses active business**
    - **Validates: Requirements 4.7, 4.8**

- [x] 8. Implement navigation cleanup
  - [x] 8.1 Remove standalone settings link from sidebar
    - Remove any "Settings" entry from the main sidebar navigation list
    - Ensure sidebar retains exactly: Dashboard, Inquiries, Quotes, Follow-ups, Analytics, Forms, Jobs, Invoices, Assistant, Knowledge
    - Verify no duplicate paths to settings content exist
    - _Requirements: 5.1, 5.2, 5.3_

  - [x]* 8.2 Write property test for sidebar navigation links
    - **Property 10: Sidebar contains exactly the specified workflow links**
    - **Validates: Requirements 5.1, 5.2, 5.5**

- [x] 9. Integration wiring and final cleanup
  - [x] 9.1 Update all internal navigation references
    - Grep for remaining `/businesses/[slug]` or `/businesses/${` patterns and update to new `/${slug}` format
    - Update breadcrumbs, back links, and any hardcoded paths in features/components
    - Verify `getBusinessPath` is used consistently throughout the codebase
    - _Requirements: 1.1, 1.2_

  - [x] 9.2 Update hub page with new business creation link
    - Add "New business" button/link on the businesses hub page (`app/businesses/page.tsx`) pointing to `/businesses/new`
    - Ensure hub page still lists all businesses with updated links to `/${slug}/dashboard`
    - _Requirements: 3.1_

  - [x]* 9.3 Write integration tests for routing and redirects
    - Test legacy `/businesses/:slug/dashboard` issues 308 to `/:slug/dashboard`
    - Test legacy `/account/profile` issues 308 to `/:slug/settings/profile`
    - Test non-existing slug returns 404
    - Test reserved slug creation is rejected at mutation level
    - **Validates: Requirements 1.3, 1.7, 1.8, 4.7**

- [x] 10. Final checkpoint - Full verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- No database schema changes are required — existing `businesses.slug` column and `user_recent_businesses` table are sufficient
- The `app/(business)` route group ensures Next.js resolves static segments before the dynamic `[businessSlug]`
- Existing `CreateBusinessForm` component is reused for the new business page
- The legacy redirect grace period (Requirement 5.4) is a deployment concern handled at the infrastructure level after 30 days

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2", "1.4", "1.5"] },
    { "id": 2, "tasks": ["2.1", "7.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "7.2"] },
    { "id": 4, "tasks": ["2.4", "4.1", "7.3", "7.4"] },
    { "id": 5, "tasks": ["4.2", "4.3", "5.1", "7.5"] },
    { "id": 6, "tasks": ["4.4", "4.5", "5.2", "7.6"] },
    { "id": 7, "tasks": ["5.3", "8.1"] },
    { "id": 8, "tasks": ["8.2", "9.1", "9.2"] },
    { "id": 9, "tasks": ["9.3"] }
  ]
}
```
