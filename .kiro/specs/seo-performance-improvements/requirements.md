# Requirements Document

## Introduction

Improve SEO + perf across Requo. SEO: complete metadata, canonical, OG/Twitter, sitemap, robots, structured data, indexability rules. Perf: streaming, Suspense, parallel fetches, two-layer cache, images, fonts, bundle, prefetch. Baseline infra exists (root metadata, sitemap, robots, Org/WebSite JSON-LD, `next/font`, Speed Insights). Gaps: per-route metadata coverage, dynamic metadata + structured data for public entity routes, sitemap breadth, private-route `noindex`, Suspense coverage in layouts, parallel fetch discipline, bundle trimming, Core Web Vitals targets. Scope = public + private App Router routes under `app/`, shared SEO libs under `lib/seo/` + `components/seo/`, cache helpers under `lib/cache/`, shared UI under `components/`. No schema changes. No new auth surfaces.

## Glossary

- **Requo**: SaaS app covered by this spec.
- **App**: Next.js 16 App Router codebase under `app/`.
- **Metadata_Layer**: Root + per-route `metadata` / `generateMetadata` exports + `viewport` export.
- **Structured_Data_Layer**: JSON-LD emitters under `lib/seo/structured-data.ts` + `<StructuredData>` component.
- **Sitemap_Generator**: `app/sitemap.ts` producing `MetadataRoute.Sitemap`.
- **Robots_Policy**: `app/robots.ts` producing `MetadataRoute.Robots`.
- **Social_Preview_Route**: `app/opengraph-image.tsx` + `app/twitter-image.tsx` + per-route equivalents.
- **Image_Pipeline**: All `<Image>` usage via `next/image`.
- **Font_Loader**: `next/font` configuration in `app/layout.tsx`.
- **Cache_Layer**: Two-layer cache = `React.cache()` wrapping an inner `"use cache"` fn w/ `cacheTag` via `lib/cache/shell-tags.ts` + `lib/cache/business-tags.ts`.
- **Streaming_Layer**: `<Suspense>` boundaries + `loading.tsx` files rendering non-blocking segments.
- **Bundle_Builder**: Next.js build output; `dynamic()` + tree-shaking + `modularizeImports`.
- **Web_Vitals_Monitor**: `@vercel/speed-insights` + Lighthouse budgets.
- **Public_Route**: Route reachable without auth (marketing, `/inquire`, `/pricing`, legal, public business pages under `/businesses/[slug]`, public quote at `/quote/...`).
- **Private_Route**: Auth-gated route (`/account/`, `/admin/`, `/onboarding`, `/businesses/` dashboard, `/invite/`, auth flows, `/api/`).
- **LCP / INP / CLS**: Core Web Vitals metrics.
- **Core_Web_Vitals_Budget**: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 at p75 on public routes.

## Requirements

### Requirement 1: Root Metadata Baseline

**User Story:** As search crawler, want complete root metadata, so that every route inherits title, description, canonical, social cards, theme color, icons.

#### Acceptance Criteria

1. THE App SHALL export `metadata` from `app/layout.tsx` containing `metadataBase`, `title.default`, `title.template`, `description`, `alternates.canonical`, `openGraph`, `twitter`, `robots`, `icons`, and `applicationName`.
2. THE App SHALL export `viewport` as a separate export from `app/layout.tsx` containing `width`, `initialScale`, `maximumScale`, `userScalable`, and `themeColor` entries for light and dark color schemes.
3. WHERE `env.GOOGLE_SITE_VERIFICATION` is set, THE Metadata_Layer SHALL include `verification.google` in root metadata.
4. WHERE the Metadata_Layer emits relative `openGraph` or `twitter` URLs, THE Metadata_Layer SHALL resolve `metadataBase` from `lib/seo/site.getSiteUrl()` so that those URLs resolve to the deployed origin.
5. IF `metadataBase` cannot be resolved due to a permanent configuration error, THEN THE Metadata_Layer SHALL fail the build rather than emit a relative OG URL.
6. IF `metadataBase` resolution fails due to transient service unavailability during build, THEN THE Metadata_Layer SHALL retry resolution and SHALL NOT fail the build on transient failures alone.

### Requirement 2: Per-Route Metadata Coverage

**User Story:** As search crawler, want unique metadata per public route, so that each indexable page ranks on its own keywords.

#### Acceptance Criteria

1. THE Metadata_Layer SHALL export `metadata` or `generateMetadata` from every Public_Route page file, producing a unique `title`, `description`, and `alternates.canonical` per route.
2. THE Metadata_Layer SHALL produce `openGraph.title`, `openGraph.description`, `openGraph.url`, and `openGraph.images` for every Public_Route.
3. THE Metadata_Layer SHALL produce `twitter.card` set to `summary_large_image` with matching `title`, `description`, and `images` for every Public_Route.
4. WHERE a route represents a Private_Route, THE Metadata_Layer SHALL set `robots.index` to `false` and `robots.follow` to `false` on that route.
5. WHEN two Public_Routes share identical `title` or `description` values, THE Metadata_Layer SHALL treat duplication as a requirements violation and SHALL be updated to differentiate them.

### Requirement 3: Dynamic Metadata for Parameterised Public Routes

**User Story:** As owner, want each public business and quote page to surface its own title, description, and canonical, so that individual pages rank and share well.

#### Acceptance Criteria

1. THE Metadata_Layer SHALL export `generateMetadata` from `app/businesses/[slug]/page.tsx` and from the public quote page file under `app/(public)/quote/...`, awaiting `params` as a `Promise`.
2. WHEN `generateMetadata` runs for a public business slug, THE Metadata_Layer SHALL set `title` to the business name when present, `description` to a ≤ 160-character summary derived from business data, and `alternates.canonical` to the business pathname, using documented fallback values for any missing field rather than rejecting.
3. WHEN `generateMetadata` runs for a public quote pathname, THE Metadata_Layer SHALL set `robots.index` to `false`, `robots.follow` to `false`, and `alternates.canonical` to the quote pathname.
4. IF the target entity does not exist or is not public, THEN THE Metadata_Layer SHALL return metadata with `robots.index` set to `false` and `robots.follow` set to `false`.
5. THE Metadata_Layer SHALL reuse the same query used by the page component via `React.cache()` so that `generateMetadata` does not double-fetch entity data within one request.

### Requirement 4: Sitemap Coverage

**User Story:** As search crawler, want one sitemap listing every indexable route, so that crawl budget covers the whole public surface.

#### Acceptance Criteria

1. THE Sitemap_Generator SHALL emit entries for `/`, `/pricing`, `/privacy`, `/terms`, `/refund-policy`, and `/inquire` with `changeFrequency`, `lastModified`, and `priority` values.
2. THE Sitemap_Generator SHALL emit one entry per indexable public business slug, with `url` equal to the absolute business pathname and `lastModified` derived from the business updated-at timestamp.
3. WHERE a public entity route is configured as `noindex` by the Metadata_Layer, THE Sitemap_Generator SHALL omit that route from sitemap output.
4. THE Sitemap_Generator SHALL revalidate at most every 3600 seconds via `export const revalidate = 3600`.
5. THE Sitemap_Generator SHALL include an `images` array for the site root entry pointing to the OG preview URL.

### Requirement 5: Robots Policy

**User Story:** As search crawler, want clear robots rules, so that only public content is crawled and render-critical assets stay reachable.

#### Acceptance Criteria

1. THE Robots_Policy SHALL emit one rule with `userAgent` equal to `*`, an `allow` list containing every Public_Route prefix (empty if none exist), and a `disallow` list containing every Private_Route prefix (empty if none exist).
2. THE Robots_Policy SHALL NOT add `/_next/` to any `disallow` list.
3. THE Robots_Policy SHALL emit `sitemap` pointing to the absolute `/sitemap.xml` URL and `host` equal to the site origin.
4. WHEN the Metadata_Layer sets `robots.index` to `false` for a Private_Route, THE Robots_Policy SHALL still list that route under `disallow` as a defence-in-depth rule.
5. THE Robots_Policy SHALL NOT emit bot-specific rules for Googlebot or Bingbot except when overriding the wildcard rule.

### Requirement 6: Structured Data Coverage

**User Story:** As search crawler, want structured data on rich routes, so that results show rich snippets and entity relationships.

#### Acceptance Criteria

1. THE Structured_Data_Layer SHALL emit `Organization` and `WebSite` JSON-LD on every route inheriting `app/layout.tsx`.
2. THE Structured_Data_Layer SHALL emit `SoftwareApplication` and `FAQPage` JSON-LD on the marketing home route.
3. THE Structured_Data_Layer SHALL emit `Product` JSON-LD with `offers` entries on `/pricing`, one offer per plan × interval pair.
4. THE Structured_Data_Layer SHALL emit `LocalBusiness` or `ProfessionalService` JSON-LD on public business slug routes when the business profile contains name, URL, and description fields.
5. THE Structured_Data_Layer SHALL emit `BreadcrumbList` JSON-LD on every Public_Route deeper than one path segment.
6. WHEN JSON-LD is emitted, THE Structured_Data_Layer SHALL use `<script type="application/ld+json">` via the existing `<StructuredData>` component and SHALL NOT serialise user-supplied values without escaping.

### Requirement 7: Social Preview Images

**User Story:** As social platform, want 1200×630 preview images per public route, so that shared links render richly.

#### Acceptance Criteria

1. THE Social_Preview_Route SHALL render a 1200×630 PNG at `/opengraph-image` and at `/twitter-image` on the root layout.
2. THE Social_Preview_Route SHALL include the site name, tagline, and description and SHALL use fonts that render inside the edge image runtime.
3. WHERE a Public_Route overrides social preview content, THE Social_Preview_Route SHALL co-locate `opengraph-image.tsx` or `twitter-image.tsx` in that route segment.
4. THE Metadata_Layer SHALL reference the generated preview image URLs in `openGraph.images` and `twitter.images` for every Public_Route.
5. IF social preview image rendering throws, THEN THE Social_Preview_Route SHALL fall back to the static OG image for both `openGraph.images` and `twitter.images`, and THE Metadata_Layer SHALL update the referenced URLs to point at the static fallback image.

### Requirement 8: Streaming And Suspense

**User Story:** As visitor, want the shell to paint immediately and non-critical segments to stream, so that the page feels instant.

#### Acceptance Criteria

1. THE Streaming_Layer SHALL wrap non-shell layout data (billing, upgrade button, admin banners) in `<Suspense>` with a dedicated fallback.
2. THE Streaming_Layer SHALL block layout render only on session and auth-gate data.
3. THE Streaming_Layer SHALL provide a `loading.tsx` file for every App Router segment whose page performs a server data fetch.
4. WHEN a page component depends on page-specific data, THE Streaming_Layer SHALL fetch that data inside the page component and SHALL NOT add a blocking `await` for it in any ancestor layout.
5. WHERE a page component has no page-specific data dependency, THE Streaming_Layer SHALL permit the page to skip server-side data fetching entirely.
6. IF a streamed segment throws, THEN THE Streaming_Layer SHALL render an `error.tsx` boundary or a typed fallback without breaking the surrounding shell.

### Requirement 9: Parallel Data Fetching

**User Story:** As visitor, want independent queries to run concurrently, so that TTFB stays bounded by the slowest query, not the sum.

#### Acceptance Criteria

1. WHEN a server component needs two or more independent queries, THE App SHALL issue them via `Promise.all` rather than sequential `await`.
2. WHERE a server component mixes independent and dependent queries, THE App SHALL parallelise the independent subset via `Promise.all` and chain `await` only for the dependent queries that need a prior result.
3. THE App SHALL measure every server component data fetch in development using `timed()` or `devTiming()` from `lib/dev/server-timing.ts`, regardless of latency.
4. IF a parallelised query rejects, THEN THE App SHALL surface the error through the enclosing `error.tsx` boundary without blocking unrelated streamed segments.

### Requirement 10: Two-Layer Caching For Shell And Business Queries

**User Story:** As visitor, want repeated shell queries to hit cache, so that navigations feel instant and DB load drops.

#### Acceptance Criteria

1. THE Cache_Layer SHALL wrap every shell-level query (theme preference, account profile, business memberships, business context by slug) in a `React.cache()` outer fn plus an inner fn starting with the `"use cache"` directive.
2. THE Cache_Layer SHALL tag each cached inner fn using the helpers in `lib/cache/shell-tags.ts` for user-scoped data and `lib/cache/business-tags.ts` for business-scoped data.
3. WHEN a mutation action changes cached data, THE App SHALL call `revalidateTag` with the matching tag inside the action.
4. THE Cache_Layer SHALL NOT call `cookies()` or `headers()` inside a `"use cache"` fn.
5. WHERE a new shell-level query is added, THE Cache_Layer SHALL follow the same two-layer pattern and SHALL NOT bypass either layer.

### Requirement 11: Image And Font Optimisation

**User Story:** As visitor, want images and fonts to load without layout shift, so that LCP stays low and CLS stays near zero.

#### Acceptance Criteria

1. THE Image_Pipeline SHALL render every image via `next/image`, regardless of whether `width` and `height` are known ahead of time.
2. THE Image_Pipeline SHALL set `width` and `height` or `fill` plus `sizes` on every `<Image>` usage.
3. THE Image_Pipeline SHALL set `priority` only on the single image identified as the Largest Contentful Paint element of each Public_Route and SHALL NOT set `priority` on any other image on that route.
4. WHERE an image source is external, THE Bundle_Builder SHALL list the host under `images.remotePatterns` in `next.config.ts`.
5. THE Font_Loader SHALL load all fonts via `next/font` with `subsets` set, `display` set to `swap`, and CSS variables exposed through `--font-*`.
6. THE Font_Loader SHALL NOT import web fonts via `<link>` or `@import` in CSS.

### Requirement 12: Bundle And Prefetch

**User Story:** As visitor, want a small initial bundle and primed navigations, so that first interaction and route switches stay under 200 ms.

#### Acceptance Criteria

1. THE App SHALL keep `'use client'` components at leaf nodes and SHALL NOT convert server components to client components without a browser-API or interactivity reason.
2. WHERE a client-only component is heavy (AI panel, command menu, chart library), THE App SHALL import it via `next/dynamic` without `ssr: false` unless the component requires browser APIs.
3. THE Bundle_Builder SHALL support `ANALYZE=true npm run build` via `@next/bundle-analyzer` wired in `next.config.ts`.
4. THE App SHALL rely on `<Link>` default prefetching for in-viewport shell navigation by default, and WHERE a specific shell link shows a measured performance bottleneck from eager prefetching, THE App SHALL disable prefetch on that individual link with an inline comment documenting the measurement.
5. WHEN a third-party module supports tree-shaking via subpath imports, THE Bundle_Builder SHALL declare it under `modularizeImports` in `next.config.ts`.

### Requirement 13: Core Web Vitals Budget

**User Story:** As owner, want public routes to meet Core Web Vitals targets, so that ranking and perceived speed both improve.

#### Acceptance Criteria

1. THE Web_Vitals_Monitor SHALL collect LCP, INP, and CLS on every public route via `@vercel/speed-insights`.
2. THE App SHALL target LCP at or below 2.5 seconds, INP at or below 200 milliseconds, and CLS at or below 0.1, measured at the 75th percentile on production traffic.
3. WHEN a production deploy regresses any Core_Web_Vitals_Budget metric by more than 10% at p75 over a seven-day window, THE App SHALL treat the regression as a spec violation and the next change set SHALL restore the metric, unless the regression has an approved waiver recorded under AC 5, in which case restoration SHALL NOT be required.
4. THE App SHALL run Lighthouse against `/`, `/pricing`, `/inquire`, and one representative public business slug before releasing changes to Metadata_Layer, Structured_Data_Layer, Streaming_Layer, Image_Pipeline, or Cache_Layer.
5. IF a Lighthouse run reports a Core_Web_Vitals_Budget violation, THEN THE release SHALL be blocked until the violation is resolved or explicitly waived with a documented rationale, except that violations breaching the critical thresholds (LCP > 4.0s, INP > 500ms, or CLS > 0.25 at p75) SHALL block the release regardless of rationale.
