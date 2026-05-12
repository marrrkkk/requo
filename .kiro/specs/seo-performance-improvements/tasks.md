# Implementation Plan: SEO & Performance Improvements

Convert the feature design into a series of prompts for a code-generation LLM that will implement each step with incremental progress. Make sure that each prompt builds on the previous prompts, and ends with wiring things together. There should be no hanging or orphaned code that isn't integrated into a previous step. Focus ONLY on tasks that involve writing, modifying, or testing code.

## Overview

Implementation proceeds bottom-up through the SEO + perf layers described in the design:

1. Foundational shared surfaces (route registry, `site.ts` extensions, JSON-LD escaper, extended emitters).
2. Root metadata + viewport + social preview fallback wiring.
3. Sitemap + robots consolidation.
4. Per-route metadata coverage (public, private, parameterised).
5. Structured data on rich routes.
6. Streaming, Suspense, parallel fetching, and error boundaries.
7. Two-layer cache for the new public business slug query.
8. Image + font + bundle + prefetch rules.
9. Audit scripts + `check:seo` + `seo-budget` Lighthouse CI.
10. Property, example, and integration tests.

Every code change stays inside the existing layout (`app/`, `lib/seo/`, `components/seo/`, `lib/cache/`, `features/*/queries.ts`, `next.config.ts`, `scripts/`, `tests/`). No schema or auth changes.

## Tasks

- [x] 1. Shared SEO foundations
  - [x] 1.1 Add public/private route registry
    - Create `lib/seo/route-registry.ts` exporting `PUBLIC_ROUTE_PREFIXES`, `PRIVATE_ROUTE_PREFIXES`, `PublicRoutePrefix`, `PrivateRoutePrefix`, `isPublicRoutePrefix(pathname)`, `isPrivateRoutePrefix(pathname)` matching the design's prefix lists.
    - Keep the registry dependency-free so `robots.ts`, `sitemap.ts`, audit scripts, and tests can import it.
    - _Requirements: 2.1, 2.4, 5.1, 5.4_

  - [x] 1.2 Extend `lib/seo/site.ts`
    - Add `assertMetadataBaseResolvable(): URL` that throws a typed error with the remediation message "Set `BETTER_AUTH_URL` in production or `VERCEL_URL` on preview deploys." when none of the fallback sources resolves.
    - Export `normalizePathname(pathname)` publicly and extend `PageMetadataOptions` with `openGraphOverrides` and `twitterOverrides`.
    - Call `assertMetadataBaseResolvable()` from module evaluation so build fails on permanent misconfiguration.
    - _Requirements: 1.1, 1.4, 1.5, 1.6_

  - [ ]* 1.3 Property test `getSiteUrl` fallback ladder and OG URL resolution
    - **Property 16: metadataBase fallback ladder always resolves to a valid URL**
    - **Property 17: metadataBase resolves relative OG URLs to the deployed origin**
    - **Validates: Requirements 1.4, 1.6**
    - Use `fast-check` to generate env-var records with at-least-one valid source and assert `origin`/`pathname` shape; generate paths and assert `createPageMetadata` `openGraph.url` resolves via `new URL(P, S)`.

  - [ ]* 1.4 Unit test permanent `metadataBase` failure
    - Clear all fallback env sources and assert `assertMetadataBaseResolvable()` throws.
    - _Requirements: 1.5_

  - [x] 1.5 Add `encodeJsonLd` and extend structured-data emitters
    - In `lib/seo/structured-data.ts` add `encodeJsonLd(data)` doing `JSON.stringify` then replacing `</` with `<\/`.
    - Add `getProductPricingStructuredData`, `getLocalBusinessStructuredData` (falls back to `ProfessionalService` when address absent, returns `null` when `name`/`url`/`description` missing), `getBreadcrumbListStructuredData`, and `buildBreadcrumbsForPathname(pathname, labels)`.
    - Update `components/seo/structured-data.tsx` to route its JSON serialisation through `encodeJsonLd`.
    - _Requirements: 6.3, 6.4, 6.5, 6.6_

  - [ ]* 1.6 Property test JSON-LD escaper
    - **Property 13: JSON-LD escaping resists script-tag termination**
    - **Validates: Requirements 6.6**
    - `fast-check` `fullUnicodeString` + adversarial inserts (`</script>`, `</`, `<!--`, backslashes); assert no `</` in output, valid JSON round-trip, safe for `<script type="application/ld+json">` insertion.

  - [ ]* 1.7 Property test Product offers and LocalBusiness gating
    - **Property 10: Product offers emitter covers every plan × interval pair**
    - **Property 11: LocalBusiness / ProfessionalService emitter is gated on profile sufficiency**
    - **Validates: Requirements 6.3, 6.4**

  - [ ]* 1.8 Property test breadcrumb reconstruction
    - **Property 12: Breadcrumbs reconstruct the pathname**
    - **Validates: Requirements 6.5**

- [x] 2. Root metadata, viewport, and conditional verification
  - [x] 2.1 Complete `app/layout.tsx` metadata + viewport exports
    - Ensure root `metadata` contains `metadataBase`, `title.default`, `title.template`, `description`, `alternates.canonical`, `openGraph`, `twitter`, `robots`, `icons`, `applicationName`.
    - Export `viewport` separately with `width`, `initialScale`, `maximumScale`, `userScalable`, and `themeColor` entries for light/dark.
    - Conditionally set `verification.google` from `env.GOOGLE_SITE_VERIFICATION` when present (read via existing env parsing in `lib/env.ts`; do not introduce a new env loader).
    - Keep `SpeedInsights` rendered in the root layout.
    - _Requirements: 1.1, 1.2, 1.3, 13.1_

  - [ ]* 2.2 Unit test root metadata + viewport + verification branches
    - Assert required fields present, viewport shape, and conditional `verification.google` inclusion based on env.
    - _Requirements: 1.1, 1.2, 1.3, 13.1_

- [x] 3. Sitemap and robots consolidation
  - [x] 3.1 Extend sitemap with public business entries and root image
    - In `features/businesses/queries.ts` add `listPublicBusinessSitemapEntries()` returning `{ slug, pathname, lastModified, noIndex }[]`, catching DB errors and returning `[]` on failure with an `error`-level log.
    - Update `app/sitemap.ts` to: include static entries for `/`, `/pricing`, `/privacy`, `/terms`, `/refund-policy`, `/inquire` with `changeFrequency`/`lastModified`/`priority`; append indexable business slug entries; omit entries where `noIndex === true`; add `images: [{ url: absoluteUrl("/opengraph-image") }]` to the root entry; keep `export const revalidate = 3600`.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 3.2 Property + unit tests for sitemap
    - **Property 7: Sitemap reflects public business visibility**
    - **Validates: Requirements 4.2, 4.3**
    - Add one unit test covering static entries, `revalidate`, and root `images` array (R4.1/R4.4/R4.5).

  - [x] 3.3 Align robots policy with the route registry
    - Update `app/robots.ts` to build `allow`/`disallow` arrays from `PUBLIC_ROUTE_PREFIXES` and `PRIVATE_ROUTE_PREFIXES`, emit `sitemap` as the absolute `/sitemap.xml` URL and `host` as the site origin, and avoid bot-specific rules.
    - Keep `/_next/` out of `disallow`.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 3.4 Property + unit tests for robots
    - **Property 8: Robots allow/disallow mirror the route registry**
    - **Property 9: Robots and metadata agree on private-route indexability**
    - **Validates: Requirements 5.1, 5.4**
    - One unit test asserts R5.2 (no `/_next/`), R5.3 (sitemap + host), R5.5 (no bot-specific rules).

- [x] 4. Checkpoint - Foundations, root metadata, sitemap, robots
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Per-route metadata coverage
  - [x] 5.1 Add metadata to every Public_Route page module
    - Export `metadata` (or `generateMetadata` where params are required) from every page under `app/(marketing)/`, `app/(public)/inquire/`, legal routes, and `app/businesses/` public entries.
    - Use `createPageMetadata` so each route has unique `title`, `description`, `alternates.canonical`, `openGraph.{title,description,url,images}`, and `twitter.{card:"summary_large_image",title,description,images}`.
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [x] 5.2 Add `noindex` metadata to every Private_Route page module
    - Export `metadata` via `createNoIndexMetadata` from every page under `app/account/`, `app/admin/`, `app/onboarding/`, `app/businesses/` dashboard, `app/invite/`, and auth flows.
    - _Requirements: 2.4, 5.4_

  - [x] 5.3 Add dynamic metadata for `/businesses/[slug]`
    - In `features/businesses/metadata.ts` add `getPublicBusinessPageMetadata(business)` and `getMissingPublicBusinessMetadata()`.
    - Export `generateMetadata` from `app/businesses/[slug]/page.tsx` awaiting `params` as a `Promise`, calling the cached `getPublicBusinessProfileBySlug` query (task 8.1), returning brand-suffixed title, ≤160-char description, `alternates.canonical` equal to `/businesses/<slug>`, documented fallbacks for missing fields, and `robots.{index:false,follow:false}` when absent/non-public.
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [x] 5.4 Add dynamic metadata for the public quote route
    - In `features/quotes/metadata.ts` extract `getPublicQuotePageMetadata(input)` and `getMissingPublicQuoteMetadata()`.
    - Export `generateMetadata` from the public quote page (under `app/(public)/quote/...`) awaiting `params`, always returning `robots.{index:false,follow:false}` and `alternates.canonical` equal to the quote pathname.
    - _Requirements: 3.1, 3.3, 3.4_

  - [ ]* 5.5 Property test business slug metadata correctness
    - **Property 4: Business slug metadata correctness**
    - **Validates: Requirements 3.1, 3.2, 3.4**

  - [ ]* 5.6 Property test public quote metadata always noindex
    - **Property 5: Quote page metadata always noindex**
    - **Validates: Requirements 3.1, 3.3, 3.4**

- [ ] 6. Structured data coverage
  - [x] 6.1 Emit `SoftwareApplication` + `FAQPage` on the marketing home
    - Use `<StructuredData>` with new emitters from `lib/seo/structured-data.ts` inside `app/(marketing)/page.tsx`.
    - _Requirements: 6.2_

  - [x] 6.2 Emit `Product` with plan × interval offers on `/pricing`
    - Call `getProductPricingStructuredData` with the existing plan catalog (no new pricing source) and render via `<StructuredData>`.
    - _Requirements: 6.3_

  - [x] 6.3 Emit `LocalBusiness`/`ProfessionalService` on public business slug pages
    - Render via `<StructuredData>` only when the profile has `name`, `url`, and `description`.
    - _Requirements: 6.4_

  - [-] 6.4 Emit `BreadcrumbList` on every Public_Route deeper than one segment
    - Use `buildBreadcrumbsForPathname` and `getBreadcrumbListStructuredData` in the relevant layouts/pages.
    - _Requirements: 6.5_

  - [x] 6.5 Confirm `Organization` + `WebSite` remain on every inheriting route
    - Verify emission happens through `app/layout.tsx` and `<StructuredData>` without duplication; serialisation already routes through `encodeJsonLd` via task 1.5.
    - _Requirements: 6.1, 6.6_

  - [ ]* 6.6 Component tests for structured-data emission
    - Render-based checks for root layout (R6.1) and marketing page (R6.2) asserting presence of the expected JSON-LD scripts.
    - _Requirements: 6.1, 6.2_

- [x] 7. Social preview images
  - [x] 7.1 Extend `SocialPreviewImage` with `title`/`subtitle`/`body` props
    - Default to siteName/siteTagline/siteDescription when unset so co-located routes can override per segment.
    - _Requirements: 7.2_

  - [x] 7.2 Add per-route `opengraph-image.tsx` + `twitter-image.tsx`
    - Create for `app/(marketing)/`, `app/(marketing)/pricing/`, `app/(public)/inquire/`, and `app/businesses/[slug]/`.
    - Export `alt`, `contentType`, `size` from each route module by re-exporting from `components/seo/social-preview-image.tsx`.
    - Wrap rendering in try/catch and return bytes from `public/og/fallback.png` on throw; read bytes once at module load.
    - _Requirements: 7.1, 7.3, 7.5_

  - [x] 7.3 Add static fallback image and wire `openGraph`/`twitter` references
    - Check in `public/og/fallback.png` (1200×630).
    - Ensure every Public_Route's metadata points `openGraph.images` and `twitter.images` at the dynamic OG route paths (which fall back to the static PNG bytes internally).
    - _Requirements: 7.4, 7.5_

  - [ ]* 7.4 Unit + snapshot-ish tests for social previews
    - Cover constants, default content, colocation, and fallback behaviour on render throw.
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [x] 8. Two-layer cache for the public business slug query
  - [x] 8.1 Add cached `getPublicBusinessProfileBySlug`
    - In `features/businesses/queries.ts` add `_getPublicBusinessProfileBySlugCached` with `"use cache"`, `cacheTag(...getPublicBusinessProfileCacheTags(slug))`, and `cacheLife(hotBusinessCacheLife)`, wrapped in `React.cache()` as `getPublicBusinessProfileBySlug`.
    - Add `getPublicBusinessProfileCacheTags(slug)` in `lib/cache/business-tags.ts` following the existing naming convention (`business:<id>` + `public-profile`).
    - Consume the query from both the page component and `generateMetadata` (task 5.3) so they dedupe in one request.
    - Do not call `cookies()` or `headers()` inside the `"use cache"` body.
    - _Requirements: 3.5, 10.1, 10.2, 10.4, 10.5_

  - [x] 8.2 Add `revalidateTag` calls to business-profile mutation actions
    - In the server actions that change public business profile data, call `revalidateTag(...getPublicBusinessProfileCacheTags(slug))` after the write.
    - _Requirements: 10.3_

  - [ ]* 8.3 Property tests for cache dedup and tag helper discipline
    - **Property 6: React.cache deduplicates shell-level cached queries**
    - **Property 14: Shell-level cached queries use tag helpers**
    - **Property 15: No `cookies()` or `headers()` inside `"use cache"` blocks**
    - **Validates: Requirements 3.5, 10.1, 10.2, 10.4**

  - [ ]* 8.4 Integration test for shell cache invalidation
    - DB-backed test that a business-profile mutation invalidates the matching public-profile tag (R10.3).
    - _Requirements: 10.3_

- [~] 9. Checkpoint - Metadata, structured data, social previews, cache
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Streaming, Suspense, and parallel fetching
  - [ ] 10.1 Add `loading.tsx` coverage for every data-fetching page
    - Add a colocated `loading.tsx` next to every `page.tsx` that performs a server data fetch and does not already have one.
    - _Requirements: 8.3_

  - [-] 10.2 Audit and unblock layouts
    - Remove any blocking `await` in layouts for data that only a page needs; push those fetches into the page component.
    - Keep only session and auth-gate data blocking layout render; wrap non-shell data (billing, upgrade button, admin banners) in `<Suspense>` with a dedicated fallback.
    - Add `error.tsx` siblings for any streaming segment without one, including `app/(public)/error.tsx`.
    - _Requirements: 8.1, 8.2, 8.4, 8.5, 8.6_

  - [-] 10.3 Parallelise independent server-component fetches
    - For every server component that awaits two or more independent queries, switch to `Promise.all`; only chain `await` when a query depends on a prior result.
    - Wrap each fetch in `timed()`/`devTiming()` from `lib/dev/server-timing.ts` so development surfacing works.
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 10.4 Integration tests for streamed error boundaries
    - Add a purpose-built failing server component and assert the enclosing `error.tsx` catches it without breaking sibling `<Suspense>` segments (R8.6, R9.4).
    - _Requirements: 8.6, 9.4_

- [x] 11. Image and font pipeline
  - [x] 11.1 Normalise image usage
    - Replace any raw `<img>` under `app/` and `components/` (excluding email templates and `ImageResponse` content) with `<Image>` from `next/image`.
    - Ensure every `<Image>` sets either (`width` and `height`) or (`fill` and `sizes`).
    - Keep `priority` on at most one image per public route (the LCP element).
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 11.2 Configure `images.remotePatterns`
    - In `next.config.ts` declare `images.remotePatterns` (start empty; add hosts only when a remote image is introduced).
    - _Requirements: 11.4_

  - [x] 11.3 Confirm font loader rules
    - Ensure all fonts load via `next/font` in `app/layout.tsx` with `subsets`, `display: "swap"`, and `--font-*` CSS variables; remove any `<link>` or CSS `@import` web-font usage discovered by the audit (task 13.2).
    - _Requirements: 11.5, 11.6_

  - [ ]* 11.4 Unit test `images.remotePatterns` shape
    - Assert the exported `next.config.ts` has an `images.remotePatterns` array.
    - _Requirements: 11.4_

- [ ] 12. Bundle and prefetch
  - [x] 12.1 Wire `@next/bundle-analyzer`
    - Add `@next/bundle-analyzer` as a dev dependency and wrap `next.config.ts` export with `withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })`.
    - _Requirements: 12.3_

  - [x] 12.2 Configure `modularizeImports` where it wins
    - Add `modularizeImports` entries in `next.config.ts` only when measurement shows a bundle win (e.g., `lucide-react`); keep the block present and documented.
    - _Requirements: 12.5_

  - [x] 12.3 Keep `<Link>` default prefetch
    - Ensure no `<Link prefetch={false}>` exists without an inline comment referencing a Speed Insights measurement; fix any violations discovered by the audit (task 13.2).
    - _Requirements: 12.4_

  - [x] 12.4 Keep `'use client'` at leaves and use `next/dynamic` only for client-only heavy leaves
    - Fix any `'use client'` at the top of `app/**/page.tsx` or `app/**/layout.tsx` found by the audit (task 13.2).
    - Keep `next/dynamic` reserved for client-only heavy leaves (AI panel, command menu, charts) and without `ssr: false` unless the component requires browser APIs (annotated in code).
    - _Requirements: 12.1, 12.2_

  - [ ]* 12.5 Unit test `modularizeImports` shape
    - Assert the exported `next.config.ts` has a `modularizeImports` object (empty is acceptable).
    - _Requirements: 12.5_

- [x] 13. Audit scripts and `check:seo` composite command
  - [x] 13.1 Add the audit scripts
    - Create `scripts/audit-loading-coverage.ts`, `scripts/audit-image-priority.ts`, `scripts/audit-metadata-uniqueness.ts`, `scripts/audit-use-cache-purity.ts`, `scripts/audit-image-usage.ts`, `scripts/audit-use-client-placement.ts`, `scripts/audit-next-dynamic-comments.ts`.
    - Each script exits non-zero on violation and prints file/line offenders; keep implementations small (grep/AST walk, no new deps beyond what `tsx` already provides).
    - _Requirements: 2.5, 8.3, 10.4, 11.1, 11.2, 11.3, 12.1, 12.2, 12.4_

  - [x] 13.2 Add `check:seo` composite command
    - Add `"check:seo"` to `package.json` running all audit scripts sequentially via the existing `scripts/test/run-sequential.mjs`.
    - Fold `check:seo` into the existing `check` script so `npm run check` runs lint, typecheck, and SEO audits.
    - _Requirements: 2.5, 8.3, 10.4, 11.1, 11.2, 11.3, 12.1, 12.2, 12.4_

  - [ ]* 13.3 Unit tests for audit script helpers
    - Cover the AST/regex helpers used by the audits with small fixtures.
    - _Requirements: 2.5, 8.3, 10.4, 11.1, 11.2, 11.3, 12.1, 12.2, 12.4_

- [x] 14. Lighthouse CI `seo-budget` GitHub Actions job
  - [x] 14.1 Add the Lighthouse budget script
    - Create `scripts/lighthouse-budget.ts` that runs Lighthouse against `/`, `/pricing`, `/inquire`, and one representative public business slug, emitting pass/fail against LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at p75.
    - Fail unconditionally on critical thresholds (LCP > 4.0 s, INP > 500 ms, CLS > 0.25); for non-critical violations, allow a `seo-budget-waiver: <reason>` annotation in the PR description via a parsed input.
    - _Requirements: 13.2, 13.3, 13.4, 13.5_

  - [x] 14.2 Add the `seo-budget` GitHub Actions job
    - In `.github/workflows/ci.yml` (or a sibling workflow file) add a `seo-budget` job that runs `scripts/lighthouse-budget.ts` against the preview deployment when changes touch `app/layout.tsx`, `app/sitemap.ts`, `app/robots.ts`, `lib/seo/**`, `components/seo/**`, `lib/cache/**`, or `next.config.ts`.
    - Pass the PR description to the script so waiver annotations are honoured.
    - _Requirements: 13.4, 13.5_

  - [ ]* 14.3 Unit tests for waiver parsing and threshold classification
    - Cover critical vs non-critical classification and the `seo-budget-waiver` regex.
    - _Requirements: 13.5_

- [ ] 15. End-to-end smoke coverage for rendered SEO markup
  - [ ]* 15.1 Add Playwright smoke checks for public metadata
    - Under `tests/e2e/` (tagged `@smoke`) assert the rendered HTML on `/`, `/pricing`, `/inquire`, and one business slug contains the expected `<title>`, `<meta name="description">`, `<link rel="canonical">`, and JSON-LD scripts.
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 6.1, 6.2, 6.3, 6.4, 6.5_

- [~] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP. Core implementation is never optional.
- Each task references specific acceptance criteria for traceability.
- Property tests map to the design's Property 1-22 and are placed next to the implementation they validate to catch errors early.
- Audit scripts run under `npm run check:seo` and are folded into `npm run check`.
- Lighthouse CI runs as the `seo-budget` GitHub Actions job against preview deployments for SEO-touching PRs.
- No schema or auth changes are introduced. All caching stays on the two-layer pattern; all new shell-level queries use `lib/cache/shell-tags.ts` or `lib/cache/business-tags.ts`.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.5"] },
    { "id": 1, "tasks": ["1.3", "1.4", "1.6", "1.7", "1.8", "2.1", "3.3", "7.1", "8.1", "11.2"] },
    { "id": 2, "tasks": ["2.2", "3.1", "3.4", "5.1", "5.2", "5.4", "7.2", "8.2", "10.1", "10.3", "11.1", "11.3", "12.1", "13.1"] },
    { "id": 3, "tasks": ["3.2", "5.3", "5.6", "6.1", "6.2", "6.4", "6.5", "7.3", "8.3", "8.4", "10.2", "12.2", "13.2", "14.1"] },
    { "id": 4, "tasks": ["5.5", "6.3", "6.6", "7.4", "10.4", "11.4", "12.3", "12.4", "12.5", "13.3", "14.2"] },
    { "id": 5, "tasks": ["14.3", "15.1"] }
  ]
}
```
