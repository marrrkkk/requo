# Requirements Document

## Introduction

The Requo authenticated dashboard already uses `prefetch={true}` links, comprehensive `loading.tsx` coverage, `experimental.staleTimes`, and `cacheComponents: true`. Despite this, client navigations between sibling dashboard routes in production still feel delayed: the user sees a skeleton, then waits for a server roundtrip before real content appears, so navigation feels like a loading spinner rather than an instant app.

This feature makes authenticated dashboard navigation genuinely instant by addressing three verified root causes:

1. **Validation is globally disabled.** Every authenticated page exports `unstable_instant` with `unstable_disableValidation: true`, which keeps the export but turns off the dev/build-time validation that is the entire point of the feature. No route is actually verified to produce an instant static shell. (Verified: the flag appears on ~45 page files across `(main)`, `settings`, `admin`, `(business)/new`, `onboarding`, and `(auth)`.)

2. **Pages block on dynamic data above the return.** The repeated pattern awaits `params`, then `getAppShellContext(businessSlug)` (which calls `requireSession` → `getSession` → `await connection()` + `headers()`), and sometimes additional uncached queries, before returning any JSX. Because these blocking awaits sit above the `return`, the page's local `<Suspense>` boundaries never enter the prefetchable static shell. On a sibling navigation, the shared `(main)` layout is the entry point and the router must wait for session + business context + queries before rendering anything beyond `loading.tsx`. This is the "page that blocks" anti-pattern from the bundled `instant-navigation.md`.

3. **Incidental critical-path queries and unbounded staleTimes.** The home page awaits `getDashboardTourCompletedForMembership(membershipId)` — an uncached raw `db.select` — at the top of every home navigation. Separately, `experimental.staleTimes` is set to `dynamic: 86400` / `static: 86400` (24h), which trades freshness for reuse without a deliberate decision.

The fix preserves the existing good patterns: the `(main)/layout.tsx` slot pattern (structural shell rendered instantly, every data-dependent slot in its own `<Suspense>`), the two-layer cache pattern (`React.cache()` + inner `"use cache"` with `cacheTag`/`cacheLife`), and `use cache`-backed business context. Authorization, data scoping, and `revalidateTag` correctness for mutations must be preserved throughout. The rollout is phased and low-risk: prove the pattern on a small representative set of routes, gate on `npm run check` and `npm run build`, then extend across the remaining routes.

The bundled Next.js documentation under `node_modules/next/dist/docs/` is the source of truth for all Next-specific behavior (`instant-navigation.md`, `instant.md`, `prefetching.md`, `caching.md`, `staleTimes.md`), because this Next.js version differs from training data.

## Glossary

- **Instant_Navigation_System**: The collection of route structures, caching configuration, and validation settings that together produce instant client-side navigation across the authenticated dashboard.
- **Dashboard_Page**: An authenticated, business-scoped page or layout file in scope (see Scope). Includes routes under `app/(business)/[businessSlug]/(main)/`, `app/(business)/[businessSlug]/settings/`, `app/admin/(console)/`, `app/onboarding/`, `app/(business)/new/`, and the businesses hub.
- **Static_Shell**: The prerendered, prefetchable UI that Next.js paints immediately on a client navigation before any dynamic data streams in, as defined in the bundled Next docs.
- **Instant_Validation**: The dev-time and build-time check triggered by exporting `unstable_instant` (with validation enabled), which simulates client navigations from every shared-layout entry point and flags components that block navigation.
- **Validation_Export**: The `unstable_instant` route segment config export on a Dashboard_Page.
- **Escape_Hatch**: A documented, temporary configuration that exempts a single route from Instant_Validation (`unstable_instant: false`, or the `unstable_disableValidation: true` flag) accompanied by a tracked follow-up item.
- **App_Shell_Context**: The result of `getAppShellContext(businessSlug)`, which resolves the session and the active business membership and redirects when the user has no access.
- **Cached_Content_Query**: A list or detail data query wrapped with the two-layer cache pattern (`React.cache()` + inner `"use cache"` with `cacheTag` and `cacheLife`), keyed by `businessId`.
- **Live_Data**: Data that must always reflect the latest source-of-truth state and therefore streams behind a `<Suspense>` boundary rather than being cached.
- **Mutation_Action**: A server action that changes business-scoped data and is responsible for calling `revalidateTag` on the affected cache tags.
- **Router_Cache**: The Next.js client-side router cache governed by `experimental.staleTimes`.
- **Verification_Gate**: A required successful run of `npm run check` and `npm run build` (and, where applicable, instant DevTools or `@next/playwright` `instant()` checks) before a rollout phase is considered complete.
- **Rollout_Phase**: A bounded set of Dashboard_Pages migrated together, starting with a representative pilot set.

## Requirements

### Requirement 1: Non-blocking page structure for instant static shells

**User Story:** As a dashboard user, I want sibling dashboard pages to paint their structural shell and skeletons immediately on click, so that navigation feels instant instead of waiting for a server roundtrip.

#### Acceptance Criteria

1. THE Instant_Navigation_System SHALL ensure that each Dashboard_Page within the `(main)` layout segment returns its structural shell and skeleton JSX without awaiting any dynamic read in the page or layout function body before the return statement.
2. WHERE a Dashboard_Page reads the session, the App_Shell_Context, route `params`, route `searchParams`, or an uncached data source, THE Instant_Navigation_System SHALL perform that read inside a `<Suspense>`-wrapped child server component rather than above the page return.
3. WHEN a user performs a client navigation between two sibling Dashboard_Pages that share the `(main)` layout, THE Instant_Navigation_System SHALL render the destination Static_Shell without a server roundtrip.
4. THE Instant_Navigation_System SHALL keep each migrated Dashboard_Page consistent with the existing `(main)/layout.tsx` slot pattern, where the structural shell renders synchronously and every data-dependent region is wrapped in its own `<Suspense>` boundary.
5. WHEN a user performs a client navigation between two sibling Dashboard_Pages that share the `(main)` layout, THE Instant_Navigation_System SHALL make the destination structural shell and its skeleton placeholders visible within 100 milliseconds of the navigation click.
6. WHILE a `<Suspense>`-wrapped child server component on a Dashboard_Page is resolving, THE Instant_Navigation_System SHALL keep the structural shell rendered and display the skeleton placeholder for that data-dependent region.
7. IF a dynamic read inside a `<Suspense>`-wrapped child server component fails, THEN THE Instant_Navigation_System SHALL keep the structural shell rendered and replace only the affected region with an error indication while preserving the remaining rendered regions.

### Requirement 2: Instant validation enabled and enforced

**User Story:** As a developer, I want instant-navigation validation enabled on dashboard routes, so that any route that would block navigation is caught at dev and build time before it reaches users.

#### Acceptance Criteria

1. THE Instant_Navigation_System SHALL set the Validation_Export on each migrated Dashboard_Page to `{ prefetch: 'static' }` with the `unstable_disableValidation` flag absent or set to `false`, so that Instant_Validation runs for every migrated Dashboard_Page.
2. WHEN `npm run build` runs against the migrated routes, THE Instant_Navigation_System SHALL complete the build with zero Instant_Validation errors for every migrated Dashboard_Page.
3. IF Instant_Validation reports an error during the build, THEN THE Instant_Navigation_System SHALL fail the build, identify the affected Dashboard_Page and the blocking component, and produce no successful build artifact.
4. WHEN Instant_Validation runs during development against a migrated Dashboard_Page, THE Instant_Navigation_System SHALL report either a pass or the specific component that blocks navigation.
5. IF Instant_Validation flags a component on a migrated Dashboard_Page as blocking navigation, THEN THE Instant_Navigation_System SHALL resolve the flagged component by caching its data with `use cache` or by moving it inside a `<Suspense>` boundary before that route is counted as migrated.
6. THE Instant_Navigation_System SHALL reference the bundled Next.js docs (`instant.md` and `instant-navigation.md`) as the source of truth for the Validation_Export configuration and validation behavior.

### Requirement 3: Documented, temporary escape hatch for routes that cannot yet be instant

**User Story:** As a developer, I want a controlled way to exempt a route that genuinely cannot be made instant yet, so that one hard route does not block the rollout while still being tracked for follow-up.

#### Acceptance Criteria

1. WHERE a Dashboard_Page has a recorded justification documenting that it cannot satisfy Instant_Validation within its current Rollout_Phase, THE Instant_Navigation_System SHALL allow an Escape_Hatch to be applied to that single Dashboard_Page.
2. WHEN an Escape_Hatch is applied to a Dashboard_Page, THE Instant_Navigation_System SHALL record a tracked follow-up item that captures the affected route, the reason for the exemption, and a target review date by which the exemption is removed.
3. THE Instant_Navigation_System SHALL apply each Escape_Hatch to exactly one Dashboard_Page and SHALL apply an Escape_Hatch only as a per-route exception, never as a default across multiple Dashboard_Pages.
4. IF an Escape_Hatch is applied without both a recorded reason and a target review date, THEN THE Instant_Navigation_System SHALL reject the Escape_Hatch, leave the Dashboard_Page subject to Instant_Validation, and return an error indication identifying the missing information.
5. IF an Escape_Hatch is configured to apply to more than one Dashboard_Page, THEN THE Instant_Navigation_System SHALL reject the configuration and return an error indication that the Escape_Hatch must target a single route.
6. WHEN an active Escape_Hatch reaches its recorded target review date without being removed, THE Instant_Navigation_System SHALL flag the exemption as overdue in its tracked follow-up item.

### Requirement 4: Cached real content on navigation

**User Story:** As a dashboard user, I want real list and detail content to appear on navigation rather than only skeletons, so that the app feels populated immediately while genuinely live data continues to stream.

#### Acceptance Criteria

1. WHEN a user navigates to a Dashboard_Page for which list or detail content was previously cached, THE Instant_Navigation_System SHALL serve that cached content from a Cached_Content_Query keyed by the requested `businessId`, returning only content matching the active business context.
2. THE Instant_Navigation_System SHALL apply `cacheTag` and `cacheLife` to each Cached_Content_Query using the existing helpers in `lib/cache/business-tags.ts` and `lib/cache/shell-tags.ts`.
3. WHERE a Dashboard_Page displays Live_Data, THE Instant_Navigation_System SHALL stream that Live_Data behind a `<Suspense>` boundary, rendering the boundary's loading fallback until the Live_Data resolves rather than serving it from a Cached_Content_Query.
4. THE Instant_Navigation_System SHALL follow the two-layer cache pattern (`React.cache()` for within-request deduplication plus an inner `"use cache"` function for cross-request caching) for each Cached_Content_Query.
5. IF a user navigates to a Dashboard_Page for which no cached content exists, THEN THE Instant_Navigation_System SHALL render skeleton placeholders for the list and detail regions until the requested content becomes available.
6. WHEN a mutation revalidates the `cacheTag` associated with a Dashboard_Page's content, THE Instant_Navigation_System SHALL serve refreshed content from the Cached_Content_Query on the next navigation rather than the previously cached content.

### Requirement 5: Non-blocking incidental critical-path queries

**User Story:** As a dashboard user, I want incidental flags and metadata to never block the page paint, so that one small query does not delay an entire navigation.

#### Acceptance Criteria

1. WHEN the home page renders, THE Instant_Navigation_System SHALL read the dashboard tour completion flag inside a `<Suspense>`-wrapped child component rather than awaiting it in the home page body before the return statement.
2. WHERE an incidental critical-path query value changes no more than once per 60 seconds, THE Instant_Navigation_System SHALL cache that query using the two-layer cache pattern with a `cacheTag` scoped to the data the query reads and a `cacheLife` retaining the value for at least 60 seconds.
3. WHEN a migrated Dashboard_Page renders, THE Instant_Navigation_System SHALL produce the Static_Shell without any incidental critical-path query blocking the page return.
4. IF an incidental critical-path query fails or does not resolve within 5000 milliseconds, THEN THE Instant_Navigation_System SHALL keep the Static_Shell rendered, render a fallback for the affected region, and complete the navigation without failure.

### Requirement 6: Preserved authorization and data scoping

**User Story:** As a business owner, I want the navigation changes to preserve access control, so that users can still only reach their own business data and unauthorized access still redirects.

#### Acceptance Criteria

1. WHEN a user navigates to a migrated Dashboard_Page, THE Instant_Navigation_System SHALL resolve the user's session and business membership into an App_Shell_Context equivalent to the App_Shell_Context that `getAppShellContext` produces for that page.
2. IF an authenticated user is not a member of the business identified in the requested route, THEN THE Instant_Navigation_System SHALL redirect that user to the businesses hub consistent with the current `getAppShellContext` redirect behavior, and SHALL render no content scoped to the requested business.
3. WHEN a migrated Dashboard_Page renders for an authorized user, THE Instant_Navigation_System SHALL display only content scoped to the business identified in the requested route.
4. WHEN the existing business-scoped access control integration tests execute against migrated routes, THE Instant_Navigation_System SHALL produce the same pass result for every one of those tests as before migration.
5. IF an unauthenticated user requests a migrated Dashboard_Page, THEN THE Instant_Navigation_System SHALL redirect that user to the authentication entry point consistent with the current `getAppShellContext` behavior, and SHALL render no business-scoped content.
6. IF a migrated Dashboard_Page would include data belonging to any business other than the one identified in the requested route, THEN THE Instant_Navigation_System SHALL exclude that data from what it renders.

### Requirement 7: Preserved cache invalidation on mutations

**User Story:** As a dashboard user, I want my data to update immediately after I make a change, so that caching never shows me stale content following a mutation.

#### Acceptance Criteria

1. WHEN a Mutation_Action successfully changes data backing one or more Cached_Content_Query instances, THE Mutation_Action SHALL call `revalidateTag` on every cache tag affected by that change before the Mutation_Action reports completion to its caller.
2. IF a Mutation_Action fails before persisting its change, THEN THE Mutation_Action SHALL NOT call `revalidateTag` for the affected cache tags, and THE Instant_Navigation_System SHALL continue serving the previously cached content unchanged.
3. THE Instant_Navigation_System SHALL associate each Cached_Content_Query with at least one cache tag, and each such cache tag SHALL be revalidated by at least one existing or new Mutation_Action.
4. IF a Cached_Content_Query is added without a corresponding `revalidateTag` call in the relevant Mutation_Action, THEN THE Instant_Navigation_System SHALL exclude that route from the set of migrated routes and flag it as not yet migrated in the migration coverage check.
5. WHEN a mutation integration test performs a Mutation_Action against a migrated route, THE Instant_Navigation_System SHALL return the mutated data on the first read of the affected Cached_Content_Query after the Mutation_Action completes, and SHALL serve no content cached before that Mutation_Action.

### Requirement 8: Deliberate router cache stale times

**User Story:** As a product owner, I want the client router cache to enable fast back/forward navigation without serving long-stale data, so that reuse and freshness are balanced by an explicit decision rather than an arbitrary 24-hour default.

#### Acceptance Criteria

1. THE Instant_Navigation_System SHALL set `experimental.staleTimes.dynamic` to a value between 0 and 60 seconds, documented with a written freshness-versus-reuse rationale.
2. THE Instant_Navigation_System SHALL set `experimental.staleTimes.static` to a value between 60 and 300 seconds, documented with a written freshness-versus-reuse rationale.
3. WHEN a user navigates back or forward to a page segment whose Router_Cache entry is within its configured stale window, THE Instant_Navigation_System SHALL render the cached entry without issuing a network request for that segment.
4. IF a navigation targets a page segment whose Router_Cache entry has exceeded its configured stale window, THEN THE Instant_Navigation_System SHALL refetch that segment from the server before rendering it.
5. WHEN a Mutation_Action revalidates a cache tag associated with a Router_Cache entry, THE Instant_Navigation_System SHALL serve the revalidated data on the next navigation that targets the affected segment rather than the pre-mutation cached entry.
6. THE Instant_Navigation_System SHALL document, alongside the configured stale times, the reference to the bundled `staleTimes.md` and `prefetching.md` guidance used to justify the chosen values.

### Requirement 9: Phased, verified rollout

**User Story:** As a developer, I want the instant-navigation pattern proven on a small representative set of routes before a broad rollout, so that risk stays low and a green build provides a structural guarantee at each step.

#### Acceptance Criteria

1. THE Instant_Navigation_System SHALL migrate a pilot Rollout_Phase consisting of the home page, the inquiries list page, and one inquiry detail page before migrating any of the remaining in-scope Dashboard_Pages.
2. WHEN a Rollout_Phase completes, THE Instant_Navigation_System SHALL run the Verification_Gate commands `npm run check` and `npm run build`, and SHALL treat the Verification_Gate as passed only when both commands complete with zero reported errors.
3. WHEN the pilot Rollout_Phase passes its Verification_Gate, THE Instant_Navigation_System SHALL extend the migration to the remaining `(main)`, `settings`, `admin`, `onboarding`, `(business)/new`, and businesses hub routes.
4. WHERE a Dashboard_Page is part of the pilot Rollout_Phase (the home page, the inquiries list page, or the inquiry detail page), THE Instant_Navigation_System SHALL verify that page's navigation with the Next.js instant DevTools.
5. WHERE the in-scope routes include the `(auth)` pages that carry the `unstable_disableValidation` flag, THE Instant_Navigation_System SHALL migrate those pages and remove the flag in a Rollout_Phase scheduled to begin only after every other in-scope Dashboard_Page Rollout_Phase has passed its Verification_Gate.
6. IF a Rollout_Phase's Verification_Gate does not pass, THEN THE Instant_Navigation_System SHALL NOT begin the next Rollout_Phase until the reported errors are resolved and the Verification_Gate passes.
7. WHERE a Dashboard_Page is part of the pilot Rollout_Phase, THE Instant_Navigation_System SHALL support an `@next/playwright` `instant()` assertion for that page's navigation flow.

### Requirement 10: Scope boundaries preserved

**User Story:** As a developer, I want the rollout to touch only the intended routes and leave product behavior unchanged, so that the change stays surgical and does not alter the UI or unrelated systems.

#### Acceptance Criteria

1. THE Instant_Navigation_System SHALL restrict all code and configuration modifications to the in-scope Dashboard_Pages and the `experimental.staleTimes` configuration, making no source modifications outside that set.
2. THE Instant_Navigation_System SHALL leave the public route trees (`inquire`, `quote`, `b`), marketing pages, and API route handlers such that a file-level comparison shows zero changed, added, or removed files across those trees.
3. THE Instant_Navigation_System SHALL make no changes to the authentication system itself.
4. THE Instant_Navigation_System SHALL introduce no database schema changes, adding or altering no migration files and leaving the schema definition identical before and after.
5. WHEN a user performs a workflow on a migrated Dashboard_Page, THE Instant_Navigation_System SHALL preserve identical reachable destinations and an identical step sequence to the pre-migration behavior.
6. THE Instant_Navigation_System SHALL render each migrated Dashboard_Page with the same components, structure, and styling as before migration, making no changes to the rendered output.
