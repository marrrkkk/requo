# Requirements Document

## Introduction

Non-blocking route transitions shift the navigation model from "hold the current page until the next page is ready" to "navigate immediately and show the destination shell with skeleton fallbacks while content loads." The existing `RouteProgressBar` is demoted from primary loading indicator to supplemental feedback. This leverages Next.js 16's `unstable_instant` API and the existing `loading.tsx` skeleton infrastructure already present across route segments.

## Glossary

- **Router**: The Next.js App Router responsible for client-side navigation between route segments
- **Route_Transition**: The period between a navigation trigger (link click, programmatic push) and the destination page becoming fully interactive
- **Destination_Shell**: The layout and structural chrome (header, sidebar, navigation) of the target route that can render without waiting for page-level data
- **Skeleton_Fallback**: A placeholder UI (via `loading.tsx` or inline `<Suspense>` boundaries) that mirrors the shape of the content being loaded
- **Progress_Bar**: The `RouteProgressBar` component rendered at the top of the viewport providing a thin animated indicator during navigation
- **Instant_Navigation**: The Next.js 16 `unstable_instant` page export that causes the router to immediately show the destination route's loading state instead of holding the current page
- **Transition_Wrapper**: The `useProgressRouter` hook that wraps `router.push`/`router.replace` in `startTransition`, currently causing blocking behavior on some routes

## Requirements

### Requirement 1: Immediate Route Activation on Navigation

**User Story:** As a user, I want to see the destination page shell immediately when I click a link, so that I perceive the app as responsive and fast.

#### Acceptance Criteria

1. WHEN a user triggers a same-origin navigation via link click, `router.push`, or `router.replace`, THE Router SHALL activate the destination route segment and display its `loading.tsx` Skeleton_Fallback within one animation frame (16ms) without waiting for page-level data fetches to resolve
2. WHEN a navigation is triggered, THE Router SHALL unmount the current page content and mount the destination route's loading state within one animation frame rather than holding the previous page visible until data resolves
3. THE Router SHALL apply instant navigation behavior to all route segments in the application by exporting `unstable_instant` from every page that performs async data fetching, covering auth, marketing, dashboard, admin, onboarding, account, public, and all business-scoped sub-routes (quotes, inquiries, follow-ups, analytics, knowledge, forms, members, settings)
4. IF a destination route segment does not define a `loading.tsx` Skeleton_Fallback, THEN THE Router SHALL still activate the destination route immediately and render the nearest ancestor layout while the page content resolves

### Requirement 2: Destination Shell Renders Instantly

**User Story:** As a user, I want to see the destination page's layout and navigation chrome immediately, so that I have spatial context about where I am in the app.

#### Acceptance Criteria

1. WHEN a navigation targets a route with a parent layout, THE Destination_Shell SHALL render the layout (header, sidebar, navigation) in the initial streamed HTML response without awaiting page-level data fetches, such that shell markup is present before any page-content Suspense boundary resolves
2. WHILE the destination page content is loading, THE Destination_Shell SHALL remain visible and interactive — navigation links shall be clickable and route correctly, and user-menu and theme-toggle controls shall respond to input — so the user can continue interacting with the shell
3. IF a layout requires authentication data to render its shell, THEN THE Router SHALL display the nearest ancestor `loading.tsx` Skeleton_Fallback until the auth gate resolves, where the Skeleton_Fallback preserves the same header height, sidebar width, and content-area dimensions as the resolved shell to prevent cumulative layout shift
4. IF the auth gate does not resolve within 10 seconds, THEN THE Router SHALL continue displaying the Skeleton_Fallback and shall not render the shell or page content until the auth check either succeeds or fails with an error boundary

### Requirement 3: Skeleton Fallbacks for Loading Content

**User Story:** As a user, I want to see skeleton placeholders that match the shape of the content being loaded, so that I understand what is coming and the page does not feel empty.

#### Acceptance Criteria

1. WHEN a route segment is loading, THE Router SHALL render the corresponding `loading.tsx` Skeleton_Fallback that reproduces the destination content's top-level layout structure (header, navigation, content sections, and grid/list arrangement) using placeholder elements that match the approximate dimensions and positions of the real content blocks
2. THE Skeleton_Fallback SHALL be present for every route segment that performs async data fetching, covering: `(auth)`, `admin`, `businesses`, `businesses/[slug]`, `businesses/[slug]/(main)`, `onboarding`, and `account` routes
3. WHEN a nested route segment loads within an already-rendered layout, THE Router SHALL show only the nested Skeleton_Fallback while the parent layout remains mounted in the DOM without unmounting, remounting, or causing a visible layout shift in the parent shell (header, sidebar, and navigation remain stable)
4. THE Skeleton_Fallback SHALL contain at minimum one Skeleton element per distinct content region (e.g., page header area, primary content area, navigation area) present in the destination page, so that the placeholder is visually distinguishable from an empty or blank page

### Requirement 4: Progress Bar as Supplemental Feedback

**User Story:** As a user, I want a subtle progress indicator during navigation so that I know the app is working, without it being the primary signal that blocks my view of the destination.

#### Acceptance Criteria

1. WHILE a Route_Transition is in progress, THE Progress_Bar SHALL render as a fixed 4px animated bar at the top of the viewport, layered above all page content including the Skeleton_Fallback
2. THE Progress_Bar SHALL serve as supplemental visual feedback only, appearing alongside the destination Skeleton_Fallback rather than as a replacement for it
3. WHEN a navigation completes in under 180 milliseconds, THE Progress_Bar SHALL remain hidden to avoid unnecessary visual noise for fast transitions
4. WHEN the destination page content mounts and the route key changes, THE Progress_Bar SHALL animate to 100% progress and then fade out within 500 milliseconds
5. IF a Route_Transition does not complete within 15 seconds, THEN THE Progress_Bar SHALL complete its animation and fade out gracefully rather than remaining in a stalled state indefinitely
6. WHEN a new navigation is triggered while the Progress_Bar is already visible from a prior navigation, THE Progress_Bar SHALL reset its progress and begin tracking the new navigation without requiring a full hide-then-show cycle

### Requirement 5: Consistent Behavior Across All Route Transitions

**User Story:** As a user, I want every navigation in the app to feel the same — instant shell, skeletons for content — so that the experience is predictable.

#### Acceptance Criteria

1. THE Router SHALL apply non-blocking instant navigation to all internal route transitions including: link clicks, `router.push`, `router.replace`, browser back/forward, and redirect-based navigations (both middleware redirects and `redirect()` calls from server components or server actions)
2. THE Transition_Wrapper (`useProgressRouter` hook) SHALL NOT wrap navigations in `startTransition` in a way that holds the current page visible while the destination route's `loading.tsx` Skeleton_Fallback is suppressed; the destination loading state SHALL become visible within one animation frame of the navigation trigger
3. WHEN navigating between sibling routes that share the same immediate parent layout segment (e.g., between dashboard tabs within `businesses/[slug]/(main)/`), THE Router SHALL preserve the shared layout without unmounting or re-rendering it and SHALL swap only the page-level content slot with its corresponding Skeleton_Fallback
4. WHEN navigating between routes whose nearest common layout ancestor is the root layout (e.g., from a `(marketing)` route to a `businesses` route), THE Router SHALL unmount the source layout and render the destination layout's full Skeleton_Fallback within one animation frame of the navigation trigger
5. IF a browser back/forward navigation restores a route from the client-side router cache, THEN THE Router SHALL render the cached page content directly without showing a Skeleton_Fallback

### Requirement 6: No Regression in Perceived Performance

**User Story:** As a user, I want the new navigation behavior to feel faster or equivalent to the current experience, never slower or more jarring.

#### Acceptance Criteria

1. THE Router SHALL NOT introduce additional layout shifts (CLS) during route transitions beyond what the existing Skeleton_Fallback structure produces, measured as a CLS delta of no more than 0.01 compared to the baseline skeleton rendering
2. WHEN prefetched data is available from the client-side router cache, THE Router SHALL render the destination page content within a single animation frame (16ms) without showing a Skeleton_Fallback
3. THE Router SHALL NOT unmount a shared parent layout component during navigation between sibling routes that share that layout, ensuring the layout remains continuously present in the DOM throughout the transition
4. IF a navigation fails due to a network error, THEN THE Router SHALL display an error boundary within 10 seconds of the failure, indicating the navigation could not be completed and preserving any user input entered prior to the navigation attempt
5. IF a Skeleton_Fallback is displayed during a non-error navigation and the destination page content has not rendered within 10 seconds, THEN THE Router SHALL display an error boundary indicating the page could not be loaded
