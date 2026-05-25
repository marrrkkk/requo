# Requirements Document

## Introduction

Redesign the analytics page from a vertically stacked, cluttered single-page layout into a clean tabbed interface that separates "Basic" analytics (available to all plans) from "Advanced" analytics (gated behind paid plans). The redesign replaces the current three-section scroll with a tab or combobox selector, decluttering the experience and making each tier feel intentional rather than overwhelming.

## Glossary

- **Analytics_Page**: The business-scoped analytics dashboard rendered at the `/{businessSlug}/analytics` route.
- **Navigation_Selector**: A tab bar or combobox component that switches between analytics views without a full page reload.
- **Basic_View**: The analytics view available to all users regardless of plan, showing key conversion metrics and counts.
- **Advanced_View**: The analytics view gated behind paid plans, containing trend charts, funnel visualization, form breakdown, workflow timing, operational alerts, follow-up stats, revenue, and AI usage.
- **Paywall_Gate**: The entitlement check that restricts access to Advanced_View for free-plan users and displays an upgrade prompt.
- **Business_Plan**: The effective subscription tier for a business (free, pro, business).

## Requirements

### Requirement 1: Tab-Based Navigation

**User Story:** As a business owner, I want to switch between basic and advanced analytics using a tab or combobox, so that the page feels organized rather than cluttered.

#### Acceptance Criteria

1. WHEN the Analytics_Page loads, THE Navigation_Selector SHALL render with exactly two options labeled "Basic" and "Advanced", in that order.
2. WHEN a user selects an option in the Navigation_Selector, THE Analytics_Page SHALL display the corresponding view within 300 milliseconds without a full page navigation.
3. THE Navigation_Selector SHALL visually distinguish the currently active option from the inactive option using a distinct visual state such as highlighted background or underline.
4. WHEN the Analytics_Page loads for the first time in a session, THE Navigation_Selector SHALL default to the "Basic" option as the active view.
5. IF the user selects the option that is already active, THEN THE Analytics_Page SHALL remain on the current view with no visible change or reload.

### Requirement 2: Basic Analytics View

**User Story:** As a business owner on any plan, I want to see essential conversion metrics at a glance, so that I can understand my inquiry-to-quote pipeline without upgrading.

#### Acceptance Criteria

1. THE Basic_View SHALL display the following metrics: form views, unique visitors, inquiry submissions, inquiries with quote, quotes sent, quotes viewed, quotes accepted, quotes rejected, form conversion rate (inquiry submissions divided by form views, expressed as a percentage with one decimal place), inquiry-to-quote rate (inquiries with quote divided by inquiry submissions, expressed as a percentage with one decimal place), and quote acceptance rate (quotes accepted divided by quotes accepted plus quotes rejected, expressed as a percentage with one decimal place).
2. THE Basic_View SHALL be accessible to users on all Business_Plan tiers (free, pro, and business) without requiring the analyticsConversion or analyticsWorkflow entitlements.
3. WHEN the Basic_View is loaded and the business has zero recorded analytics events, THE Basic_View SHALL display each metric with a value of zero rather than an empty or error state.
4. WHEN the Basic_View is active, THE Analytics_Page SHALL render metric cards in a responsive grid layout that displays a single column on viewports narrower than 640px, two columns between 640px and 1024px, and three or more columns on viewports wider than 1024px.
5. IF the analytics data fails to load, THEN THE Basic_View SHALL display an error indication and retain the layout structure without crashing the page.

### Requirement 3: Advanced Analytics View

**User Story:** As a paid business owner, I want to access in-depth analytics including trends, funnels, form performance, workflow timing, alerts, follow-ups, revenue, and AI usage, so that I can make data-driven operational decisions.

#### Acceptance Criteria

1. THE Advanced_View SHALL include the following sections: trend charts displaying data for the prior 12 weeks with one data point per week, funnel visualization showing inquiry-to-acceptance conversion steps, form performance table with one row per inquiry form, period-over-period comparison showing deltas (up, down, or flat) against the prior 12-week window, workflow timing metrics (average first response time, average time to first quote, average time from sent to decision, and response rate), operational alerts (stale inquiry count, pending quotes older than 7 days), follow-up summary (created, completed, skipped, overdue counts, completion rate, and average days to complete), revenue summary (accepted value, average accepted value, and completed value in cents), and AI usage summary (total invocations, total tokens, and estimated cost in cents).
2. WHEN a user on a free Business_Plan selects the "Advanced" tab, THE Paywall_Gate SHALL display an upgrade prompt instead of analytics data and SHALL NOT render any advanced analytics sections.
3. WHEN a user on a pro Business_Plan selects the "Advanced" tab, THE Advanced_View SHALL display performance analytics sections (trend charts, funnel visualization, form performance table, and period-over-period comparison) and operations analytics sections (workflow timing, operational alerts, follow-up summary, revenue summary, and AI usage summary) without restriction, provided the plan includes the analyticsConversion and analyticsWorkflow entitlements.
4. WHEN a user on a business Business_Plan selects the "Advanced" tab, THE Advanced_View SHALL display all advanced analytics sections enumerated in criterion 1 without restriction.
5. IF the Advanced_View receives no data for a given section within the selected 12-week period, THEN THE Advanced_View SHALL render that section with a zero-state indicating no activity was recorded for the period rather than hiding the section.
6. WHEN the Advanced_View loads, THE Advanced_View SHALL resolve all section data within 3 seconds under normal operating conditions and SHALL display a loading indicator for each section until its data is available.

### Requirement 4: Plan-Based Access Control

**User Story:** As a product owner, I want analytics access to respect existing plan entitlements, so that advanced analytics serve as upgrade incentive for free users.

#### Acceptance Criteria

1. WHEN the Analytics_Page renders the Performance section, THE Paywall_Gate SHALL call `hasFeatureAccess(plan, "analyticsConversion")` to determine whether to display live performance analytics or the locked state.
2. WHEN the Analytics_Page renders the Operations section, THE Paywall_Gate SHALL call `hasFeatureAccess(plan, "analyticsWorkflow")` to determine whether to display live operations analytics or the locked state.
3. IF `hasFeatureAccess` returns false for a given analytics section, THEN THE Analytics_Page SHALL render a `PremiumContentBlur` component containing a skeleton placeholder of the gated section, along with an upgrade call-to-action that initiates the checkout flow or navigates to the billing settings page when no checkout context is available.
4. IF a user's subscription changes while viewing the Analytics_Page, THEN THE Analytics_Page SHALL reflect the updated access on the next full page load without requiring a manual cache purge or sign-out.
5. WHILE a user is on the free plan, THE Analytics_Page SHALL still display the free-tier Overview metrics (counts and rates) without any paywall gating.

### Requirement 5: UI Overhaul and Layout

**User Story:** As a business owner, I want the analytics page to feel clean, modern, and uncluttered, so that I can focus on the data that matters.

#### Acceptance Criteria

1. THE Analytics_Page SHALL use the existing `DashboardPage` and `PageHeader` shared wrappers for layout consistency.
2. THE Analytics_Page SHALL remove the vertically stacked three-section layout and replace it with the Navigation_Selector pattern where only one view is visible at a time.
3. THE Navigation_Selector SHALL be implemented using the `Tabs` component from the existing shadcn/ui library, falling back to a `Select` (combobox) on viewports narrower than 640px.
4. THE Analytics_Page SHALL maintain responsive behavior across mobile (< 640px), tablet (640px–1024px), and desktop (> 1024px) viewports with no horizontal overflow or content clipping.
5. THE Analytics_Page SHALL follow the project design system tokens (`surface-*`, `control-*`, `section-panel`, `meta-label`) and avoid custom palette utilities or noisy decoration.
6. WHEN switching between tabs, THE Analytics_Page SHALL not re-fetch data that has already been loaded and cached for the current page session.

### Requirement 6: Data Retention and Query Compatibility

**User Story:** As a developer, I want the redesign to reuse existing analytics queries and types, so that the refactor is a UI-only change with no backend disruption.

#### Acceptance Criteria

1. THE Analytics_Page SHALL import and invoke `getFreeAnalytics`, `getProAnalytics`, and `getBusinessAnalytics` from `features/analytics/queries` with the same `businessId` parameter signature and without wrapping, overriding, or duplicating their logic.
2. THE Analytics_Page SHALL consume the existing `FreeAnalyticsData`, `ProAnalyticsData`, and `BusinessAnalyticsData` type definitions from `features/analytics/types` as the sole data contracts for rendering analytics content, with no additional transformation types introduced between query result and component props.
3. THE Analytics_Page SHALL preserve all existing caching behavior by retaining the `"use cache"` directive, `hotBusinessCacheLife` cache life, and `getBusinessAnalyticsCacheTags` cache tags within the query functions, verified by the analytics integration test suite passing without modification.
4. IF the Analytics_Page is rendered and a query function returns an error, THEN THE Analytics_Page SHALL display an error indication to the user without crashing, and SHALL NOT modify the query function's error propagation behavior.
5. WHEN the Analytics_Page is loaded, THE Analytics_Page SHALL pass the `businessId` from the current business context to each query function, ensuring business-scoped data isolation is maintained.
