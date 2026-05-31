# Requirements Document

## Introduction

Implement an "instant navigation" pattern across all routes in the Requo application. Navigation between pages should feel immediate by rendering page structure (headings, action buttons, table headers, filter bars, section panels) synchronously and deferring only data-dependent content to localized skeleton loading states. The global progress bar is removed entirely. This pattern mirrors how Linear, Vercel Dashboard, and Notion handle client-side transitions.

## Glossary

- **App**: The Requo Next.js application including all route groups
- **Loading_State**: A `loading.tsx` file that renders while a route segment is resolving its page component
- **Structural_Elements**: Static page chrome that does not depend on fetched data — page titles, descriptions, action buttons, table/list column headers, filter bars, section panel frames, and tab bars
- **Data_Skeleton**: A shimmer placeholder rendered in place of data-dependent content (table rows, list items, stat values, chart areas, dynamic text)
- **Progress_Bar**: The existing global NProgress-style loading indicator shown during route transitions
- **Shared_Layout**: A layout component that persists across sibling route navigations (dashboard shell, settings frame, marketing header, auth frame)
- **Suspense_Boundary**: A React Suspense wrapper that allows a subtree to stream in independently with a fallback UI
- **Route_Group**: A Next.js parenthesized folder that groups routes under a shared layout without affecting the URL — includes (business), (auth), (marketing), (public), (checkout), admin, and onboarding

## Requirements

### Requirement 1: Remove Global Progress Bar

**User Story:** As a user, I want navigation between pages to feel instant, so that the app does not signal waiting or slowness during transitions.

#### Acceptance Criteria

1. WHEN a route transition is initiated, THE App SHALL render the destination page structure without displaying a global progress bar or top-of-page loading indicator
2. THE App SHALL not include the Progress_Bar component or its provider in the component tree
3. WHEN a route transition is initiated, THE App SHALL not render a full-page skeleton that covers Shared_Layout chrome

### Requirement 2: Structural Loading States

**User Story:** As a user, I want to see the page structure immediately when I navigate, so that I know where I am and what actions are available before data loads.

#### Acceptance Criteria

1. WHEN a route segment is loading, THE Loading_State SHALL render the Structural_Elements of the destination page including page title, description text, action button placeholders, table or list column headers, filter bar frames, and section panel outlines
2. WHEN a route segment is loading, THE Loading_State SHALL render Data_Skeleton placeholders only for content areas that depend on fetched data
3. THE Loading_State SHALL match the spatial layout of the fully-loaded page so that content does not shift when data resolves

### Requirement 3: Layout Persistence

**User Story:** As a user, I want shared navigation and layout elements to remain stable during navigation, so that I have spatial continuity across pages.

#### Acceptance Criteria

1. WHILE navigating between sibling routes within a Route_Group, THE Shared_Layout SHALL remain mounted and visually unchanged
2. WHILE navigating between sibling routes within a Route_Group, THE Shared_Layout SHALL not render skeleton placeholders for its own chrome elements
3. THE App SHALL use the Next.js App Router nested layout architecture to ensure Shared_Layout components are not unmounted during sibling navigation

### Requirement 4: Page-Level Suspense Boundaries

**User Story:** As a user, I want independent data sections on a page to load in parallel, so that I see each section as soon as its data is ready rather than waiting for all data.

#### Acceptance Criteria

1. WHEN a page has multiple independent data sections, THE page component SHALL wrap each independent data section in a Suspense_Boundary with a localized Data_Skeleton fallback
2. WHEN a page uses Suspense_Boundary for independent sections, THE page component SHALL render Structural_Elements synchronously outside of Suspense_Boundary wrappers
3. WHEN a page has multiple independent data sections, THE page component SHALL not block rendering on a single top-level data fetch that gates all sections

### Requirement 5: Dashboard Route Group Coverage

**User Story:** As a business owner, I want all dashboard pages (inquiries, quotes, follow-ups, analytics, forms, jobs, invoices, knowledge, chat, members, dashboard) to use instant navigation, so that moving between workflow pages feels seamless.

#### Acceptance Criteria

1. WHEN navigating to any route within the (business)/[businessSlug]/(main) group, THE Loading_State SHALL render the specific page Structural_Elements with Data_Skeleton only for data-dependent rows, items, or values
2. WHILE navigating within the (main) group, THE dashboard shell frame (sidebar and topbar) SHALL remain rendered and stable
3. WHEN navigating to any route within the (business)/[businessSlug]/settings group, THE Loading_State SHALL render settings section panel structure with Data_Skeleton only for form field values and dynamic labels

### Requirement 6: Auth Route Group Coverage

**User Story:** As a user signing up or logging in, I want auth pages to render instantly, so that the login and signup experience feels responsive.

#### Acceptance Criteria

1. WHEN navigating to any route within the (auth) group, THE Loading_State SHALL render the auth page frame and form structure without a full-page skeleton
2. WHILE navigating between auth routes, THE auth layout frame SHALL remain mounted and stable

### Requirement 7: Marketing Route Group Coverage

**User Story:** As a visitor, I want marketing pages to render instantly, so that browsing the public site feels fast and polished.

#### Acceptance Criteria

1. WHEN navigating to any route within the (marketing) group, THE Loading_State SHALL render the page Structural_Elements immediately
2. WHILE navigating between marketing routes, THE marketing layout header and footer SHALL remain mounted and stable

### Requirement 8: Remaining Route Group Coverage

**User Story:** As a user, I want consistent instant navigation across all remaining route groups (public, checkout, admin, onboarding), so that the entire app feels cohesive.

#### Acceptance Criteria

1. WHEN navigating to any route within the (public) group, THE Loading_State SHALL render page Structural_Elements with Data_Skeleton only for dynamic inquiry or quote content
2. WHEN navigating to any route within the (checkout) group, THE Loading_State SHALL render checkout page structure with Data_Skeleton only for pricing and plan details
3. WHEN navigating to any route within the admin group, THE Loading_State SHALL render admin console structure with Data_Skeleton only for data tables and stats
4. WHEN navigating to any route within the onboarding group, THE Loading_State SHALL render onboarding step structure with Data_Skeleton only for dynamic business or template content

### Requirement 9: No Layout Shift

**User Story:** As a user, I want page content to appear without visual jumping, so that the loading-to-loaded transition is smooth and predictable.

#### Acceptance Criteria

1. WHEN data resolves and replaces a Data_Skeleton, THE rendered content SHALL occupy the same spatial dimensions as the skeleton it replaces, preventing cumulative layout shift
2. THE Loading_State SHALL use fixed or minimum height containers for Data_Skeleton areas to prevent content reflow when data streams in
