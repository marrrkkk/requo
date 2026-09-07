# Instant Navigation and Progressive Data Loading

## Problem Statement

Requo's authenticated dashboard already has a persistent business shell and several progressive-loading patterns, but the architecture is inconsistent. Some dashboard and settings routes still await authentication, business context, database queries, analytics, or AI summaries at page level. These waits can delay useful UI, produce route-level blank states, and make sidebar navigation feel slower than a modern SaaS application.

The repository runs Next.js 16.3.2 with Cache Components enabled. The codebase currently exports `unstable_instant`, which is not the supported route configuration in the installed version. Partial Prefetching is also not enabled, despite existing comments and architecture assuming App Shell-style prefetching.

The goal is to make authenticated navigation feel immediate while preserving server-first rendering, authorization, tenant isolation, URL state, caching, mutations, and the existing Requo design system.

## Solution

Use the shared business dashboard shell as the persistent navigation boundary. Make static page structure render immediately, move dynamic reads into async Server Components, and stream related data behind appropriately sized Suspense boundaries with matching skeletons.

Activate Next.js 16.3's supported instant-navigation model by migrating applicable routes to the `instant` export and enabling Partial Prefetching. Continue using native tenant-aware `<Link>` navigation and existing prefetch behavior.

Add subtle non-blocking navigation feedback using Next.js's `useLinkStatus`, without replacing the sidebar or page content with a global loader.

Refactor the remaining blocking dashboard/settings destinations, prioritizing Analytics and settings pages that still perform top-level awaits. Use grouped progressive regions for Analytics: static header/date controls first, core metrics next, and advanced analytics/AI-derived content separately.

Validate the result through production-mode Playwright navigation tests, static audits, build/check commands, and representative manual flows.

## User Stories

1. As a business owner, I want the sidebar to remain visible while navigating between dashboard routes, so that the application feels continuous instead of reloading as separate pages.
2. As a business member, I want the URL to update immediately after clicking a sidebar item, so that I know my navigation was accepted.
3. As a business member, I want the destination page title and description to appear before database results arrive, so that I can orient myself immediately.
4. As a business member, I want page controls such as buttons, filters, tabs, search fields, and static labels to render without waiting for unrelated queries, so that I can understand and prepare the page quickly.
5. As a business member, I want data-dependent sections to show dimensionally accurate skeletons, so that the layout remains stable while records load.
6. As a business member, I want fast sections to resolve before slow sections, so that one slow database query does not hold back the entire route.
7. As a business member, I want the Quotes page to show its header and controls immediately, so that I can begin interacting while quote records load.
8. As a business member, I want the Inquiries page to show its structural layout immediately, so that the inbox does not appear blank during a slow query.
9. As a business member, I want Follow-ups to show its page structure and appropriate board/list fallback immediately, so that navigation does not wait for follow-up records or reassignment data.
10. As a business member, I want Analytics to show its title and date-range controls immediately, so that I can see which reporting period is selected before metrics are available.
11. As a business member, I want core Analytics metrics to appear before advanced charts or AI summaries, so that useful information is available as soon as possible.
12. As a business member, I want advanced Analytics content to remain correctly paywalled, so that progressive loading does not expose plan-restricted data.
13. As a business member, I want Assistant navigation to preserve its existing streaming and error behavior, so that the owner-facing Assistant remains usable while its server region resolves.
14. As a business member, I want Products, Members, Forms, Notifications, and other dashboard destinations to use the same immediate-shell pattern where their data is dynamic, so that navigation feels consistent across the product.
15. As a business administrator, I want settings pages to display their heading and static structure before business settings queries finish, so that settings navigation does not show a blank route.
16. As a business administrator, I want settings forms to retain their existing authorization and plan gating while loading progressively, so that performance improvements do not weaken access control.
17. As a business member, I want legacy redirect routes to continue redirecting correctly, so that existing bookmarked URLs remain compatible.
18. As a business member, I want print and preview routes to preserve their existing behavior without being forced into the dashboard shell architecture, so that specialized document views remain stable.
19. As a mobile user, I want the mobile navigation drawer to close after selecting a destination while the new page loads, so that the destination is visible immediately.
20. As a keyboard user, I want sidebar links and navigation feedback to remain accessible, so that instant navigation does not reduce keyboard usability.
21. As a business member, I want a subtle progress indication when a navigation is genuinely pending, so that a slow transition does not feel like an ignored click.
22. As a business member, I do not want a large blocking spinner to replace the persistent shell, so that navigation retains context.
23. As a business member, I want back and forward navigation to preserve the correct URL state, so that filters, pagination, tabs, sorting, and date ranges continue to behave as before.
24. As a business member, I want mutations to continue refreshing or invalidating affected data correctly, so that streaming does not leave stale records visible after create, update, archive, or delete actions.
25. As a business member, I want unauthorized routes to remain blocked, so that progressive rendering does not expose protected page structure or data incorrectly.
26. As a business member of one business, I want navigation to remain scoped to that business, so that moving between routes cannot reveal another tenant's records.
27. As a product engineer, I want Next.js instant-navigation validation to reflect the installed version's actual API, so that future regressions are detected instead of hidden by ignored exports.
28. As a product engineer, I want production browser tests to verify the initial visible UI during navigation, so that compilation alone is not treated as proof of a responsive experience.
29. As a product engineer, I want loading fallbacks to reuse Requo's existing skeletons and semantic tokens, so that progressive loading does not introduce a second visual language.
30. As a product engineer, I want independent streamed regions to have selective error isolation, so that a failed table or chart does not unnecessarily destroy a usable page shell.

## Implementation Decisions

- Keep the business-scoped `(main)` layout as the persistent shell boundary.
- Preserve the existing dashboard shell, sidebar, top bar, mobile navigation, business switcher, user menu, notification slot, and shell providers across sibling route navigation.
- Continue using native tenant-aware links for ordinary internal navigation.
- Preserve active route styling, mobile drawer behavior, permission visibility, analytics behavior, and existing URL construction.
- Enable Next.js Partial Prefetching alongside the existing Cache Components configuration.
- Replace applicable `unstable_instant` route exports with the supported Next.js 16.3 `instant` export.
- Keep instant validation opt-in through the existing manual-warning configuration.
- Add a shared navigation feedback component in the persistent shell using `useLinkStatus`.
- Make the progress indicator subtle, non-blocking, accessible, and effectively invisible for fast transitions through a short CSS delay.
- Do not add manual prefetching unless production measurements demonstrate that native link prefetching is insufficient.
- Keep Server Components as Server Components unless browser interaction genuinely requires a client boundary.
- Move authentication, business-context, and dynamic query work into async child Server Components where page-level awaits currently block static content.
- Preserve business-aware context helpers, role checks, plan checks, and server-side tenant filtering.
- Refactor Analytics into grouped progressive regions: static header/date controls, core analytics data, advanced analytics/chart data, and AI-generated summary with its related advanced region.
- Keep Analytics URL search parameters as the source of truth for date ranges.
- Reuse existing fallback components and skeleton primitives wherever possible.
- Add route-specific skeletons only where current fallbacks do not approximate the final layout.
- Add route/component error isolation only for streamed regions where failure should leave the surrounding page shell usable.
- Leave print routes, preview routes, and redirect-only legacy routes outside the dashboard progressive-loading refactor unless validation exposes a direct navigation regression.
- Preserve existing cache directives, cache tags, stale-time configuration, mutation invalidation, and private authenticated cache headers.
- Do not introduce React Query, SWR, a global client store, a replacement database layer, or a new caching system.
- Record the durable architecture decision in an ADR covering persistent business shell boundaries, static page structure versus progressive data regions, supported Next.js instant-navigation configuration, and server-side protected reads.
- Extend the domain glossary with implementation-independent terms for static shell, progressive region, and instant navigation.

## Testing Decisions

- Use the highest-level behavioral seam: production-mode Playwright navigation through the real authenticated dashboard shell.
- Add focused instant-navigation coverage for Dashboard to Inquiries, Inquiries to Quotes, Quotes to Follow-ups, Follow-ups to Analytics, and Analytics to Quotes.
- Assert URL changes without a full document reload, persistent sidebar visibility, immediate destination title and controls, skeleton visibility while dynamic regions are held, eventual dynamic resolution, independent fast-region resolution, back/forward URL state, direct URL navigation, and mobile navigation behavior.
- Use the Next.js `@next/playwright` instant-navigation helper where supported.
- Expose the production testing API so instant assertions can run against `next start`.
- Extend static audits to detect unsupported `unstable_instant` exports on targeted routes, missing supported `instant` exports, blocking page-level awaits without intentional exceptions, and missing loading coverage where a dynamic route requires a route-level fallback.
- Run the repository's existing check, unit/component tests, build, and relevant end-to-end smoke coverage.
- Run focused integration tests where route refactoring touches authorization-sensitive server data composition.
- Manually inspect the Navigation Inspector with representative slow data responses to verify the actual visible shell.
- Treat authorization, tenant isolation, plan gating, mutation invalidation, and URL-state preservation as mandatory regression scenarios.

## Out of Scope

- Rewriting the routing system.
- Replacing Better Auth, Supabase, Drizzle, or the existing database architecture.
- Moving protected queries into the browser.
- Introducing a new client data-fetching library.
- Rewriting the design system.
- Redesigning dashboard pages.
- Refactoring print or public preview document rendering.
- Refactoring redirect-only legacy routes beyond preserving behavior.
- Adding a workflow automation engine, jobs product, invoicing, scheduling, or CRM functionality.
- Adding broad per-card Suspense boundaries that create visual popcorn.
- Adding artificial delays to make skeletons visible.
- Replacing legitimate authentication, authorization, billing, or plan-gating states with generic loading UI.
- Adding aggressive manual prefetching without measurement.
- Migrating the entire application to a new caching model.

## Further Notes

The repository already contains substantial progressive-loading work in Quotes, Inquiries, Follow-ups, Assistant, Products, Members, Notifications, and many settings pages. This spec should complete and standardize the architecture rather than rewrite those routes.

The most important known blocker is the API mismatch: Next.js 16.3.2 documents `instant`, while the current code uses `unstable_instant`. This must be validated during implementation and corrected before relying on instant-navigation validation.

The working tree is already dirty with unrelated changes. Implementation should preserve those changes and keep this feature's diff isolated.
