# Implementation Plan: Analytics Redesign

## Overview

Replace the vertically stacked analytics layout with a tabbed interface (Basic/Advanced). This is a UI-only refactor: create new client components for tab state management and navigation, wrap existing panels in new view components, and update the page server component to compose the tabbed layout. No backend or query changes needed.

## Tasks

- [x] 1. Create AnalyticsNavSelector and AnalyticsTabbedDashboard client components
  - [x] 1.1 Create `AnalyticsNavSelector` client component
    - Create `features/analytics/components/analytics-nav-selector.tsx`
    - Render shadcn/ui `Tabs` using `TabsList` and `TabsTrigger` (from `components/ui/tabs`) for viewports ≥ 640px
    - Render shadcn/ui `Select` using `SelectTrigger`, `SelectValue`, `SelectContent`, and `SelectItem` (from `components/ui/select`) for viewports < 640px
    - Accept `activeTab` and `onTabChange` props typed as `"basic" | "advanced"`
    - Labels: "Basic" and "Advanced" in that order
    - Active tab trigger uses `control-*` tokens for interactive states (e.g. `bg-control-active`, `text-control-active-foreground`)
    - Inactive trigger uses `surface-muted` / `text-meta-label` for subdued appearance
    - Container uses `section-panel` background token for visual grouping
    - Use Tailwind responsive utilities (`hidden sm:flex` / `flex sm:hidden`) for breakpoint switching
    - _Requirements: 1.1, 1.3, 5.3, 5.5_

  - [x] 1.2 Create `AnalyticsTabbedDashboard` client component
    - Create `features/analytics/components/analytics-tabbed-dashboard.tsx`
    - Accept `basicContent` and `advancedContent` as `React.ReactNode` props
    - Manage tab state (`"basic" | "advanced"`) defaulting to `"basic"`
    - Render `AnalyticsNavSelector` with active tab and change handler
    - Show/hide content panels based on active tab (CSS display toggle or conditional render)
    - Follow existing app patterns: wrap in `DashboardPage` and `PageHeader` wrapper structure where appropriate
    - Use `surface-default` token for the content area background
    - Use design system spacing tokens consistent with other dashboard pages
    - No-op when selecting the already-active tab
    - Switch must complete within 300ms (no network round-trips)
    - _Requirements: 1.2, 1.4, 1.5, 5.1, 5.6_

- [x] 2. Create BasicAnalyticsView and AdvancedAnalyticsView wrapper components
  - [x] 2.1 Create `BasicAnalyticsView` component
    - Create `features/analytics/components/basic-analytics-view.tsx`
    - Wrap existing `AnalyticsFreePanel` metrics in shadcn/ui `Card` components (from `components/ui/card`) for each metric card
    - Use `Card`, `CardHeader`, `CardTitle`, `CardContent` to structure each metric
    - Apply `surface-card` or `soft-panel` token for card backgrounds
    - Use `meta-label` token for metric labels and `text-foreground` for metric values
    - Layout in a responsive CSS grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (1 col < 640px, 2 cols 640–1024px, 3+ cols > 1024px)
    - Use `gap-4` or project-standard grid gap spacing
    - No entitlement check — always accessible
    - Pass through `FreeAnalyticsData` props to render metrics
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.5_

  - [x] 2.2 Create `AdvancedAnalyticsView` component
    - Create `features/analytics/components/advanced-analytics-view.tsx`
    - Accept plan, businessId, businessSlug, currency, and data props
    - If free plan: render `PremiumContentBlur` (from shared components) with skeleton placeholder and upgrade CTA
    - If entitled: render `AnalyticsProPanel` (Performance) and `AnalyticsBusinessPanel` (Operations)
    - Wrap sections using `DashboardSection` shared wrapper for consistent heading/spacing
    - Use `section-panel` token for section container backgrounds
    - Use `surface-muted` for skeleton placeholder areas within `PremiumContentBlur`
    - Check `hasFeatureAccess(plan, "analyticsConversion")` for Performance section
    - Check `hasFeatureAccess(plan, "analyticsWorkflow")` for Operations section
    - Wrap each section in `Suspense` with skeleton fallbacks for loading states
    - Follow existing `DashboardSection` heading patterns with `meta-label` for section titles
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 5.5_

- [x] 3. Refactor the analytics page server component
  - [x] 3.1 Update `app/(business)/[businessSlug]/(main)/analytics/page.tsx`
    - Replace stacked layout with `AnalyticsTabbedDashboard` composition
    - Use `DashboardPage` + `PageHeader` shared wrappers (retain existing pattern from other pages)
    - Follow DESIGN.md patterns: page title in `PageHeader`, content in `DashboardPage` body slot
    - Apply `surface-default` as the page background token
    - Fetch `getFreeAnalytics` always for Basic view
    - Fetch `getProAnalytics` and `getBusinessAnalytics` only when entitled
    - Pass `basicContent` and `advancedContent` as server-rendered ReactNode children
    - Retain error handling: try/catch with graceful fallback UI (no crash)
    - Pass `businessId` from current business context to each query
    - Do not modify query functions, caching, or type contracts
    - Remove old vertically stacked three-section layout
    - _Requirements: 1.4, 2.5, 4.4, 4.5, 5.1, 5.2, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 3.2 Update loading skeleton in `analytics/loading.tsx`
    - Use shadcn/ui `Skeleton` component (from `components/ui/skeleton`) for all placeholder elements
    - Show a `Skeleton` bar matching the tab navigation shape (TabsList width/height)
    - Show a grid of `Skeleton` cards matching the BasicAnalyticsView card layout (3-column grid)
    - Apply `surface-muted` token for skeleton container background
    - Use `rounded-lg` and appropriate height/width to match the actual card dimensions
    - _Requirements: 5.4_

- [x] 4. Checkpoint - Verify build and type check
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Write component tests
  - [ ]* 5.1 Write component tests for `AnalyticsTabbedDashboard`
    - Test: renders Basic view by default
    - Test: clicking "Advanced" tab switches to Advanced content
    - Test: selecting already-active tab causes no visible change
    - Test: mobile viewport renders Select instead of Tabs
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 5.3_

  - [ ]* 5.2 Write component tests for `AdvancedAnalyticsView`
    - Test: free plan shows `PremiumContentBlur` with upgrade CTA
    - Test: pro plan shows Performance + Operations sections
    - Test: business plan shows all advanced analytics sections
    - Test: error state renders fallback UI without crashing
    - _Requirements: 3.2, 3.3, 3.4, 4.1, 4.2, 4.3_

  - [ ]* 5.3 Write component tests for `BasicAnalyticsView`
    - Test: renders metric cards with zero values when no data
    - Test: responsive grid classes applied correctly
    - _Requirements: 2.2, 2.3, 2.4_

- [ ] 6. Write E2E smoke test
  - [ ]* 6.1 Write Playwright smoke test for analytics tabbed interface
    - Navigate to analytics page → Basic tab active, metrics visible
    - Switch to Advanced tab → content changes without page reload
    - Free-plan user sees upgrade prompt on Advanced tab
    - Mobile viewport: combobox selector renders instead of tabs
    - _Requirements: 1.1, 1.2, 1.4, 3.2, 5.3, 5.4_

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- No property-based tests needed — this is a UI layout refactor with no new business logic or data transformations
- Existing `AnalyticsFreePanel`, `AnalyticsProPanel`, and `AnalyticsBusinessPanel` are reused as-is
- No backend changes — existing query functions, types, and caching are preserved
- shadcn/ui components used: `Tabs` (TabsList, TabsTrigger, TabsContent), `Select` (SelectTrigger, SelectValue, SelectContent, SelectItem), `Card` (CardHeader, CardTitle, CardContent), `Skeleton`
- Design system tokens used: `surface-*`, `control-*`, `section-panel`, `soft-panel`, `meta-label`, `surface-muted`, `surface-default`, `surface-card`
- Shared wrappers used: `DashboardPage`, `PageHeader`, `DashboardSection`, `PremiumContentBlur`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "2.2"] },
    { "id": 2, "tasks": ["3.1", "3.2"] },
    { "id": 3, "tasks": ["5.1", "5.2", "5.3"] },
    { "id": 4, "tasks": ["6.1"] }
  ]
}
```
