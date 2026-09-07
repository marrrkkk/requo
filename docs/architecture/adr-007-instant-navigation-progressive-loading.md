# ADR 007: Instant Navigation and Progressive Data Loading

**Status**: Accepted
**Date**: 2026-09-05
**Deciders**: Implementation team
**Context**: `docs/specs/instant-navigation-progressive-data-loading.md`,
`docs/architecture/instant-navigation.md`

---

## Context

Authenticated dashboard navigation felt slow: several routes awaited the
session, business context, database queries, analytics rollups, or AI
summaries at page level, delaying useful UI and producing route-level blank
states. The repo runs Next.js 16.3 with Cache Components, whose supported
route configuration is the `instant` export — the codebase used the legacy
`unstable_instant` export, which the installed version does not read — and
Partial Prefetching was not enabled.

## Decision 1: Persistent business shell boundary

The business-scoped `(main)` layout (sidebar, top bar, mobile navigation,
business switcher, user menu, notification slot, shell providers) stays
mounted across sibling route navigation. Pages never replace it with a
global loader; only data-dependent slots stream via `<Suspense>`.

### Rationale

1. Continuity: the shell is the product's spatial anchor; keeping it mounted
   makes navigation feel continuous instead of page-like.
2. Cheap: the shell renders from the URL slug alone; data slots resolve
   independently behind their own boundaries.
3. Mobile/keyboard behavior (drawer close on select, focusable links, active
   styling) lives in the shell once, not per page.

### Consequences

- Positive: sibling navigations paint chrome instantly from the router cache.
- Negative: shell-owned slots must each suspend independently or they block
  first paint — new slots require a `<Suspense>` fallback by convention.
- Navigation feedback is per-link (`useLinkStatus` hint dots), never a
  shell-replacing spinner.

## Decision 2: Static page structure versus progressive data regions

Every dashboard/settings page returns its structural shell synchronously —
`PageHeader`, static labels, controls chrome, and skeleton fallbacks. All
dynamic reads (`params`, `searchParams`, session, business context, queries)
live in async child Server Components behind `<Suspense>` boundaries with
dimensionally accurate skeletons. Independently-failing regions add
`<RegionErrorBoundary>` so one failed table or chart leaves the shell and
sibling regions usable.

Analytics is grouped, not per-card: static header/date controls first, core
metrics next, advanced charts after, and the AI summary streaming in place
inside its advanced region (it must never hold back charts).

### Rationale

1. Orientation before data: title, description, and controls tell the member
   where they are while records load.
2. Fast regions resolve before slow ones: one slow query cannot hold back
   the route.
3. No visual popcorn: boundaries are region-sized, reusing existing
   skeletons and semantic tokens — never broad per-card Suspense or
   artificial delays.

### Consequences

- Positive: back/forward, filters, pagination, tabs, sorting, and date
  ranges keep working — URL search params stay the source of truth and
  mutations keep invalidating via existing cache tags.
- Negative: more components per page (region + fallback). Mitigated by
  reusing shared fallbacks.
- Risk: optimistic shell content going stale (e.g. a static header
  description). Mitigated by keeping dynamic copy inside regions that read
  the URL.

## Decision 3: Supported Next.js instant-navigation configuration

- `export const instant = true` on applicable routes (validated at warning
  level in development via `experimental.instantInsights.validationLevel:
  "manual-warning"` — opt-in per route).
- `instant = false` only as a tracked escape-hatch exemption
  (`lib/instant-navigation/escape-hatch-registry.ts`), never to silence a
  fixable failure.
- Partial Prefetching enabled app-wide (`partialPrefetching: true`), so each
  `<Link>` prefetches its route's App Shell; `<Link prefetch={true}>`
  additionally resolves per-link runtime data. No manual prefetching unless
  production measurements prove native prefetching insufficient.
- Router cache `experimental.staleTimes = { dynamic: 30, static: 180 }`.
- Production testing API exposed
  (`experimental.exposeTestingApiInProductionBuild: true`) so
  `@next/playwright` `instant()` assertions run against `next start`.
- No React Query/SWR/global client store/replacement database or caching
  layer. Print routes, preview routes, and redirect-only legacy routes stay
  outside this architecture.

### Rationale

1. The framework — not hand-rolled caching — owns prefetching, shells, and
   validation; the repo's job is structuring pages so the framework can do
   its job.
2. Opt-in validation keeps signal high: only migrated routes are checked.
3. E2E `instant()` tests assert what the user actually sees during
   navigation, which structural validation alone cannot.

### Consequences

- Positive: regressions surface as dev-overlay insights, static audits
  (`audit:instant-navigation`), and production browser tests.
- Negative: Cache Components semantics (static shell vs. dynamic regions)
  must be understood by every contributor touching routes — recorded here
  and in `docs/architecture/instant-navigation.md`.

## Decision 4: Server-side protected reads

Progressive rendering changes *when* content appears, never *who* may see
it. Authorization (membership/role checks), tenant scoping
(`getAppShellContext` and business-aware helpers), and plan gating
(`hasFeatureAccess` + paywall components) stay server-side inside each
region, before expensive work. A streamed region emits no business-scoped
content before its redirect/paywall decision.

### Rationale

1. Streaming boundaries are a rendering detail; trust boundaries must not
   move with them.
2. Per-region checks compose: each region independently denies, redirects,
   or paywalls without leaking through a sibling's faster load.

### Consequences

- Positive: authorization, tenant isolation, plan gating, mutation
  invalidation, and URL-state preservation hold as mandatory regression
  scenarios (covered by integration + E2E tests).
- Negative: regions repeat cheap context reads — mitigated by
  `React.cache()` dedup in `getAppShellContext`.

---

## References

- `docs/specs/instant-navigation-progressive-data-loading.md`
- `docs/architecture/instant-navigation.md`
- Bundled Next.js docs (source of truth): `node_modules/next/dist/docs/`
  (`01-app/02-guides/instant-navigation.md`,
  `01-app/03-api-reference/03-file-conventions/02-route-segment-config/instant.md`,
  `01-app/02-guides/adopting-partial-prefetching.md`)
- `CONTEXT.md` — Language (static shell, progressive region, instant
  navigation)

---

## Revision History

- **2026-09-05**: Accepted (implemented: `instant` migration, Partial
  Prefetching, shell navigation feedback, Analytics progressive regions,
  remaining settings refactors, audits, E2E coverage).
