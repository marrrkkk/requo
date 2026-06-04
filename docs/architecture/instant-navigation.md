# Instant Navigation

How authenticated dashboard navigation works in Requo without waiting for server roundtrips.

## The Problem

Before this system, every authenticated page awaited `params`, `getAppShellContext()` (session + business context), and often additional queries **above the return statement**. On a client-side navigation between sibling dashboard routes (e.g. inquiries → quotes), the router had to wait for a full server roundtrip before painting anything beyond `loading.tsx`. Users saw a skeleton then waited — navigation felt slow.

Three root causes:

1. **Validation globally disabled.** Every page exported `unstable_instant` with `unstable_disableValidation: true`, turning off the build-time check that verifies routes produce an instant static shell.
2. **Pages block on dynamic data above the return.** The awaits for session, params, and queries sat above `return`, so `<Suspense>` boundaries inside the JSX never reached the prefetchable static shell.
3. **Unbounded router stale times.** `experimental.staleTimes` was set to 24 hours for both dynamic and static segments.

## How It Works Now

### The Static Shell Model

With Cache Components enabled, Next.js produces a **static shell** for each route — the UI it can paint immediately on a client navigation before any dynamic data streams in. Anything that suspends (awaiting params, reading cookies/headers, awaiting uncached data) must sit inside a `<Suspense>` boundary, or it blocks navigation.

The key insight: validation checks **every shared-layout entry point**, not just the initial page load. On a sibling navigation (e.g. `inquiries` → `home`), only the page segment re-renders. A `<Suspense>` above the shared layout is invisible to that navigation.

### Page Structure

Every authenticated dashboard page follows this pattern:

```tsx
// Route segment config — enables instant validation at dev and build time
export const unstable_instant = {
  prefetch: "static",
  samples: [
    {
      params: { businessSlug: "demo" },
      headers: [["rsc", "1"], ["next-action", null]],
    },
  ],
};

// Page function is SYNCHRONOUS — returns immediately
export default function SomeDashboardPage({ params, searchParams }) {
  return (
    <DashboardPage>
      <PageHeader title="..." description="..." />

      <Suspense fallback={<ControlsSkeleton />}>
        <ControlsRegion params={params} searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<ListSkeleton />}>
        <ListRegion params={params} searchParams={searchParams} />
      </Suspense>
    </DashboardPage>
  );
}

// Dynamic reads live in async child server components, BELOW Suspense
async function ListRegion({ params, searchParams }) {
  const { businessSlug } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const items = await getCachedListForBusiness(businessContext.business.id);
  return <List items={items} />;
}
```

What the user experiences:

1. **Click a link** → the structural shell (headers, skeletons, layout chrome) paints in <100ms from the client cache.
2. **Cached data streams in** → list/detail content appears almost instantly from the two-layer cache.
3. **Live data streams behind its own boundary** → genuinely fresh data resolves separately.

### Router Cache (Stale Times)

```ts
// next.config.ts
experimental: {
  staleTimes: {
    dynamic: 30,   // seconds — dynamic RSC payloads reuse for back/forward
    static: 180,   // seconds — static shell segments reuse
  },
}
```

- Within the stale window, back/forward navigation renders from the client cache with no network request.
- Past the window, the segment refetches from the server.
- A `revalidateTag` call from a mutation causes the next navigation to serve fresh data regardless of the stale window.

### Cache Invalidation

Mutations continue to call `updateTag` (via `updateCacheTags`) on every affected tag after a successful persist. The framework's prefetch-invalidation silently refreshes associated prefetches, so the next navigation serves the mutated data.

No new invalidation primitives were introduced.

## Validation

### Build-time (`npm run build`)

With `unstable_disableValidation` removed, the build simulates client navigations from every shared-layout entry point for each route. If a component blocks (awaits without being inside Suspense), the build fails naming the page and component.

The `samples` array in `unstable_instant` provides the params and headers needed for the validator to render dynamic routes.

### Dev-time

The instant DevTools (enabled via `experimental.instantNavigationDevToolsToggle: true`) show which routes pass or fail validation during development.

### CI

`npm run check` (lint + typecheck + SEO audits) and `npm run build` both pass with zero errors. The coverage check script (`scripts/instant-navigation/check-coverage.ts`) verifies every in-scope route either has validation enabled or has a valid escape-hatch entry.

## Error Handling

### Region-level failures

Each data-dependent region streams behind its own `<Suspense>`. Independently-failing regions are additionally wrapped in `<RegionErrorBoundary>`:

```tsx
<RegionErrorBoundary fallback={<ErrorIndication />}>
  <Suspense fallback={<Skeleton />}>
    <DataRegion params={params} />
  </Suspense>
</RegionErrorBoundary>
```

If the child throws, only that region shows the error fallback. The structural shell and sibling regions stay rendered.

### Authorization

`getAppShellContext` still calls `redirect()` for non-members and unauthenticated users. The redirect fires from inside the Suspense child — no business-scoped content is emitted before the redirect.

### Cold cache

When no cached content exists yet, regions render skeleton placeholders until content resolves. No error state.

## Escape Hatches

Some routes genuinely cannot pass validation (e.g. admin pages with cookie-based auth that always redirects during build). These get a tracked exemption:

- **Registry:** `lib/instant-navigation/escape-hatch-registry.ts`
- **Human-readable log:** `.kiro/specs/instant-navigation-rollout/escape-hatches.md`
- **Validator:** `lib/instant-navigation/escape-hatches.ts`

Each entry carries `route`, `reason`, `targetReviewDate`, and `active`. The coverage check script rejects any page that lacks both validation and a valid registry entry.

Current escape hatches: 6 admin console pages (cookie-based JWT auth incompatible with build-time validation).

## File Map

| File/Directory | Purpose |
|---|---|
| `next.config.ts` | `staleTimes` configuration |
| `lib/instant-navigation/stale-times.ts` | Bounds validator |
| `lib/instant-navigation/escape-hatches.ts` | Escape-hatch validator + overdue detection |
| `lib/instant-navigation/escape-hatch-registry.ts` | Tracked exemption entries |
| `lib/instant-navigation/migration-coverage.ts` | Coverage derivation |
| `lib/instant-navigation/rollout.ts` | Verification gate, phase ordering |
| `scripts/instant-navigation/check-coverage.ts` | CI coverage check |
| `components/shared/region-error-boundary.tsx` | Error boundary for independently-failing regions |
| `features/auth/components/auth-form-skeleton.tsx` | Skeleton for auth form Suspense fallbacks |

## Common Tasks

### Adding a new dashboard page

1. Make the default export function synchronous (no `async`, no awaits above return).
2. Return the structural shell with `<Suspense>` boundaries and skeleton fallbacks.
3. Put all dynamic reads (`params`, `getAppShellContext`, queries) in async child server components inside those boundaries.
4. Export `unstable_instant` with `prefetch: "static"` and appropriate `samples`.
5. Run `npm run build` to verify validation passes.

### Fixing a validation failure

The build error names the page and the blocking component. Either:
- Move the blocking read into a `<Suspense>`-wrapped child, or
- Cache the data with `"use cache"` so it doesn't suspend.

Never re-add `unstable_disableValidation: true`.

### Adding an escape hatch

1. Add an entry to `lib/instant-navigation/escape-hatch-registry.ts` with `route`, `reason`, `targetReviewDate`, `active: true`.
2. Verify it passes `validateEscapeHatch`.
3. Update `.kiro/specs/instant-navigation-rollout/escape-hatches.md`.
4. Set `export const unstable_instant = false` on the page file.

### Checking migration coverage

```bash
npx tsx scripts/instant-navigation/check-coverage.ts
```

Reports which in-scope routes have validation enabled, which have valid escape hatches, and which are failing.

## Reference

- Bundled Next.js docs (source of truth): `node_modules/next/dist/docs/`
  - `01-app/02-guides/instant-navigation.md`
  - `01-app/03-api-reference/03-file-conventions/02-route-segment-config/instant.md`
  - `01-app/02-guides/prefetching.md`
  - `01-app/03-api-reference/05-config/01-next-config-js/staleTimes.md`
- Spec: `.kiro/specs/instant-navigation-rollout/` (requirements, design, tasks)
