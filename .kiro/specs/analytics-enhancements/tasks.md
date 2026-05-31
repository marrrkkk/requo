# Implementation Plan: Analytics Enhancements

## Overview

This plan implements 18 analytics enhancements across three priority tiers. Tasks are grouped by feature cluster (schema + query + component) and ordered by tier priority. The implementation extends the existing `features/analytics/` module, Drizzle schema, and the tabbed analytics dashboard. All code is TypeScript with Next.js App Router conventions.

## Tasks

- [x] 1. Database schema changes and migrations
  - [x] 1.1 Add metadata JSONB column to analytics_events table
    - Create a Drizzle migration adding `metadata jsonb` column to `analytics_events`
    - Update the `analyticsEvents` schema definition in `lib/db/schema`
    - _Requirements: 4.2, 15.1_

  - [x] 1.2 Create analytics_daily_rollups table
    - Add Drizzle schema for `analytics_daily_rollups` with columns: id, business_id, date, form_views, unique_visitors, inquiry_submissions, quotes_sent, quotes_accepted, quotes_rejected, revenue_cents, created_at, updated_at
    - Add unique index on (business_id, date) and index on date
    - Generate and apply migration
    - _Requirements: 9.1_

  - [x] 1.3 Create analytics_goal_thresholds table
    - Add Drizzle schema with id, business_id, metric_key, target_value, created_at, updated_at
    - Add unique index on (business_id, metric_key)
    - Generate and apply migration
    - _Requirements: 11.5_

  - [x] 1.4 Create analytics_annotations table
    - Add Drizzle schema with id, business_id, date, label, color, created_by, created_at, updated_at
    - Add index on (business_id, date)
    - Generate and apply migration
    - _Requirements: 17.3_

  - [x] 1.5 Create analytics_scheduled_reports table
    - Add Drizzle schema with id, business_id, recipient_emails (text array), schedule, timezone, enabled, last_sent_at, created_at, updated_at
    - Add index on business_id
    - Generate and apply migration
    - _Requirements: 16.1_

  - [x] 1.6 Create analytics_benchmarks table
    - Add Drizzle schema with id, industry_category, size_tier, metric_key, median_value, business_count, computed_at
    - Add unique index on (industry_category, size_tier, metric_key)
    - Generate and apply migration
    - _Requirements: 18.2_

  - [x] 1.7 Add analytics_digest_enabled and industry_category to businesses table
    - Add `analytics_digest_enabled boolean default true` and `industry_category text` columns
    - Generate and apply migration
    - _Requirements: 13.4, 18.2_

- [x] 2. Checkpoint - Ensure migrations run cleanly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Tier 1 — Date range selector, sparklines, and timestamp
  - [x] 3.1 Extend query functions with since/until parameters
    - Update `getFreeAnalytics`, `getProAnalytics`, and `getBusinessAnalytics` signatures to accept optional `since` and `until` Date parameters
    - Replace hardcoded `SUMMARY_DAYS` with parameterized date window
    - Update cache tag strategy to include range suffix for preset ranges
    - _Requirements: 1.5, 1.6_

  - [x]* 3.2 Write property test for date range validation (Property 1)
    - **Property 1: Date range validation**
    - Test that for any pair of dates, the validator accepts iff start < end AND difference ≤ 365 days
    - **Validates: Requirements 1.4**

  - [x]* 3.3 Write property test for query scoping to date range (Property 2)
    - **Property 2: Query scoping to date range**
    - Test that all records in query results have timestamps within [since, until]
    - **Validates: Requirements 1.5**

  - [x] 3.4 Implement DateRangeSelector client component
    - Create `features/analytics/components/date-range-selector.tsx`
    - Render ToggleGroup with 7d, 30d, 90d presets and a custom option with Calendar popover
    - Use `useRouter` + `useSearchParams` to update URL params
    - Validate start < end and range ≤ 365 days client-side
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 3.5 Integrate DateRangeSelector into analytics page
    - Read `searchParams` in the analytics server component to derive `since`/`until`
    - Pass derived dates to all query functions
    - Update page header description to reflect selected period
    - Default to 30 days when no range is selected
    - _Requirements: 1.2, 1.6, 1.7_

  - [x] 3.6 Implement MiniSparkline component
    - Create `features/analytics/components/mini-sparkline.tsx`
    - Pure SVG polyline component with 7 points, 24px height, full card width
    - Stroke color mapped from direction: up→success, down→destructive, flat→muted-foreground
    - _Requirements: 2.1, 2.3, 2.4_

  - [x] 3.7 Implement sparkline data interpolation utility
    - Create `features/analytics/utils/sparkline-interpolation.ts`
    - Given daily metric values and a date range, produce exactly 7 evenly-spaced interval averages
    - Handle cases where fewer than 7 data points exist
    - _Requirements: 2.2, 2.5_

  - [x]* 3.8 Write property test for sparkline interpolation (Property 3)
    - **Property 3: Sparkline interpolation**
    - Test that for any array of daily values (length ≥ 1), output is exactly 7 numeric points
    - **Validates: Requirements 2.2, 2.5**

  - [x] 3.9 Integrate sparklines into BasicAnalyticsView metric cards
    - Compute sparkline data from daily rollups or raw events for each metric
    - Pass sparkline points and direction to MiniSparkline within MetricCard
    - _Requirements: 2.1_

  - [x] 3.10 Implement LastUpdatedTimestamp component
    - Create `features/analytics/components/last-updated-timestamp.tsx`
    - Display "Refreshed X ago" below page header
    - Render in warning color when cache age > 15 minutes
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x]* 3.11 Write property test for staleness warning threshold (Property 4)
    - **Property 4: Staleness warning threshold**
    - Test that warning state is active iff age > 900 seconds
    - **Validates: Requirements 3.3**

- [x] 4. Checkpoint - Tier 1 complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Tier 2 — Referrer tracking, AI summary, revenue forecast, pipeline velocity
  - [x] 5.1 Update tracking payload to include referrer and UTM params
    - Modify the public form/quote view tracking to send `document.referrer` and UTM query params
    - Update `recordAnalyticsEvent` to store referrer/UTM in the `metadata` JSONB column
    - Normalize referrer: empty or same-origin → "direct", otherwise extract domain
    - _Requirements: 4.1, 4.2, 4.3, 15.1, 15.3_

  - [x]* 5.2 Write property test for referrer normalization (Property 5)
    - **Property 5: Referrer normalization**
    - Test that empty/null/same-origin → "direct", all others → extracted domain
    - **Validates: Requirements 4.1, 4.3**

  - [x]* 5.3 Write property test for UTM parameter capture (Property 16)
    - **Property 16: UTM parameter capture**
    - Test that all non-null UTM values are stored in metadata, null when absent
    - **Validates: Requirements 15.1, 15.3**

  - [x] 5.4 Implement TopSourcesCard component and query
    - Create `features/analytics/components/top-sources-card.tsx`
    - Query top 5 referrer domains from metadata within date range
    - Render horizontal bar chart with percentage labels
    - Gate behind `analyticsConversion` entitlement
    - _Requirements: 4.4, 4.5_

  - [x] 5.5 Implement AISummaryCard and server-side generation
    - Create `features/analytics/components/ai-summary-card.tsx`
    - Replace AI usage section in the business panel
    - Generate summary by passing current metrics and deltas to AI provider
    - Fall back to "Summary unavailable." on failure
    - Regenerate on cache refresh
    - Gate behind `analyticsWorkflow` entitlement
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 5.6 Implement RevenueForecastCard and query
    - Create `features/analytics/components/revenue-forecast-card.tsx`
    - Compute: pendingQuoteCount × historicalAcceptanceRate × avgAcceptedValueCents
    - Display "Insufficient data" when no historical data
    - Gate behind `analyticsWorkflow` entitlement
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x]* 5.7 Write property test for revenue forecast computation (Property 6)
    - **Property 6: Revenue forecast computation**
    - Test the formula and null-return conditions
    - **Validates: Requirements 6.2, 6.3**

  - [x] 5.8 Implement PipelineVelocityCard and query
    - Create `features/analytics/components/pipeline-velocity-card.tsx`
    - Compute median days from inquiry submission to quote acceptance
    - Only include inquiries with accepted quotes in selected range
    - Display "Insufficient data" when < 3 data points
    - Gate behind `analyticsWorkflow` entitlement
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x]* 5.9 Write property test for pipeline velocity calculation (Property 7)
    - **Property 7: Pipeline velocity calculation**
    - Test median computation with ≥ 3 elements and null when < 3
    - **Validates: Requirements 7.1, 7.2, 7.3**

  - [x] 5.10 Consolidate trend queries into single conditional aggregation
    - Rewrite `getProAnalytics` trend section to use one SQL query with conditional aggregation
    - Verify identical results to current 4 separate queries
    - _Requirements: 8.1, 8.2, 8.3_

  - [x]* 5.11 Write property test for consolidated trend query equivalence (Property 8)
    - **Property 8: Consolidated trend query equivalence**
    - Test that single-query results match 4 separate query results for any date range
    - **Validates: Requirements 8.1, 8.2**

  - [x] 5.12 Implement daily rollup cron job
    - Create `app/api/cron/analytics-rollup/route.ts`
    - Aggregate prior day's raw events into `analytics_daily_rollups`
    - Use upsert (ON CONFLICT UPDATE) for idempotence
    - Process per-business to allow partial progress on failure
    - _Requirements: 9.2, 9.3_

  - [x]* 5.13 Write property test for daily rollup idempotence (Property 9)
    - **Property 9: Daily rollup idempotence**
    - Test that multiple executions produce exactly one row with correct values
    - **Validates: Requirements 9.3**

  - [x]* 5.14 Write property test for daily rollup round-trip (Property 10)
    - **Property 10: Daily rollup round-trip**
    - Test that rollup values match direct aggregation of raw events
    - **Validates: Requirements 9.5**

  - [x] 5.15 Update trend queries to read from daily rollup table
    - Modify trend queries to prefer `analytics_daily_rollups` for complete-day ranges
    - Fall back to raw event scan for partial/current day
    - _Requirements: 9.4_

  - [x] 5.16 Implement drill-down navigation from metric cards
    - Create `features/analytics/components/drill-down-link.tsx`
    - Wrap countable metric cards (stale inquiries, quotes sent, etc.) in links to filtered list pages
    - Disable for rate/percentage metrics
    - Respect business scoping and entitlements
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x]* 5.17 Write property test for drill-down count equivalence (Property 11)
    - **Property 11: Drill-down count equivalence**
    - Test that filtered list count equals metric card value
    - **Validates: Requirements 10.2**

- [x] 6. Checkpoint - Tier 2 complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Tier 3 — Goal thresholds, cohort analysis, drill-down refinement
  - [x] 7.1 Implement GoalThresholdOverlay component
    - Create `features/analytics/components/goal-threshold-overlay.tsx`
    - Render thin progress bar beneath metric value
    - Color: success when ≥ target, destructive when < 50% target, warning otherwise
    - _Requirements: 11.2, 11.3, 11.4_

  - [x] 7.2 Implement goal threshold API routes
    - Create `app/api/business/[slug]/analytics/goals/route.ts` (GET/PUT)
    - Allow users to set/update numeric targets per metric
    - Gate behind `analyticsConversion` entitlement
    - Validate input with Zod
    - _Requirements: 11.1, 11.5, 11.6_

  - [x]* 7.3 Write property test for goal threshold color classification (Property 12)
    - **Property 12: Goal threshold color classification**
    - Test color assignment for all ranges of currentValue relative to targetValue
    - **Validates: Requirements 11.3, 11.4**

  - [x] 7.4 Implement CohortAnalysisSection component and query
    - Create `features/analytics/components/cohort-analysis-section.tsx`
    - Group customers by first inquiry month
    - Track return rates at 3, 6, and 12 month intervals
    - Render retention matrix with color-coded cells
    - Hide section with note when < 3 months of data
    - Gate behind `analyticsWorkflow` entitlement
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x]* 7.5 Write property test for cohort bucketing and return rate (Property 13)
    - **Property 13: Cohort bucketing and return rate**
    - Test that each customer is assigned to exactly one cohort and return rates compute correctly
    - **Validates: Requirements 12.1, 12.2**

- [x] 8. Tier 3 — Digest email, export, UTM campaign view
  - [x] 8.1 Implement weekly digest email cron and template
    - Create `app/api/cron/analytics-digest/route.ts`
    - Send digest every Monday at 9:00 AM in business timezone
    - Include week-over-week metric deltas and 1-3 AI-generated action recommendations
    - Send via Resend using branded template
    - Respect `analytics_digest_enabled` business setting
    - Gate behind `analyticsWorkflow` entitlement
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [x]* 8.2 Write property test for digest metric deltas (Property 14)
    - **Property 14: Digest metric deltas**
    - Test delta = current - prior and direction classification
    - **Validates: Requirements 13.2**

  - [x] 8.3 Implement ExportButton and export API route
    - Create `features/analytics/components/export-button.tsx` with PDF/CSV dropdown
    - Create `app/api/business/[slug]/analytics/export/route.ts` (POST)
    - CSV: generate file with all visible metrics for selected date range
    - PDF: generate formatted report with metric cards and charts
    - Include business name, date range, and generation timestamp
    - Gate behind `exports` entitlement
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x]* 8.4 Write property test for export completeness (Property 15)
    - **Property 15: Export completeness**
    - Test that export output contains all metric key-value pairs, business name, date range, and timestamp
    - **Validates: Requirements 14.2, 14.4**

  - [x] 8.5 Implement CampaignPerformanceCard component and query
    - Create `features/analytics/components/campaign-performance-card.tsx`
    - Query inquiry counts grouped by utm_source and utm_campaign from metadata
    - Gate behind `analyticsConversion` entitlement
    - _Requirements: 15.2, 15.5_

- [x] 9. Tier 3 — Scheduled reports, annotations, benchmarking
  - [x] 9.1 Implement scheduled reports API routes
    - Create `app/api/business/[slug]/analytics/scheduled-reports/route.ts` (GET/POST/PUT/DELETE)
    - Allow configuration of up to 5 recipient emails with daily/weekly/monthly schedule
    - Validate email format and list length with Zod
    - Gate behind `analyticsWorkflow` entitlement
    - _Requirements: 16.1, 16.2, 16.5_

  - [x] 9.2 Implement scheduled reports cron job
    - Create `app/api/cron/analytics-scheduled-reports/route.ts`
    - Send analytics summary emails on configured schedule
    - Include same metrics as Advanced analytics view
    - _Requirements: 16.2, 16.3, 16.4_

  - [x]* 9.3 Write property test for scheduled report recipient validation (Property 17)
    - **Property 17: Scheduled report recipient validation**
    - Test that validation accepts iff list length ≤ 5 AND all emails are valid format
    - **Validates: Requirements 16.1, 16.5**

  - [x] 9.4 Implement annotations API routes
    - Create `app/api/business/[slug]/analytics/annotations/route.ts` (GET/POST/PUT/DELETE)
    - CRUD operations for annotations with date, label, optional color
    - Gate behind `analyticsConversion` entitlement
    - _Requirements: 17.1, 17.3, 17.5, 17.6_

  - [x] 9.5 Implement AnnotationMarker component
    - Create `features/analytics/components/annotation-marker.tsx`
    - Render vertical dashed lines at annotation positions on trend chart
    - Show tooltip with label on hover
    - Calculate x-position proportional to (date - since) / (until - since) × chartWidth
    - _Requirements: 17.2, 17.4_

  - [x]* 9.6 Write property test for annotation position calculation (Property 18)
    - **Property 18: Annotation position calculation**
    - Test that x-position is proportional to (annotationDate - since) / (until - since)
    - **Validates: Requirements 17.4**

  - [x] 9.7 Implement benchmarking cron and display
    - Create `app/api/cron/analytics-benchmarks/route.ts`
    - Monthly aggregation of anonymized metrics grouped by industry category and size tier
    - Only display when comparison group has ≥ 10 businesses
    - Show "above average", "average", or "below average" indicators
    - Gate behind `analyticsWorkflow` entitlement
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

  - [x]* 9.8 Write property test for benchmark group threshold (Property 19)
    - **Property 19: Benchmark group threshold**
    - Test that benchmark data displays iff group has ≥ 10 businesses
    - **Validates: Requirements 18.4**

  - [x]* 9.9 Write property test for benchmark position classification (Property 20)
    - **Property 20: Benchmark position classification**
    - Test "above" when > median × 1.1, "below" when < median × 0.9, "average" otherwise
    - **Validates: Requirements 18.6**

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation between tiers
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- All new components go in `features/analytics/components/`
- All new API routes follow existing patterns in `app/api/`
- Entitlement gating uses existing `hasFeatureAccess` from `lib/plans/entitlements.ts`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7"] },
    { "id": 1, "tasks": ["3.1", "3.4", "3.6", "3.7", "3.10"] },
    { "id": 2, "tasks": ["3.2", "3.3", "3.5", "3.8", "3.9", "3.11"] },
    { "id": 3, "tasks": ["5.1", "5.5", "5.6", "5.8", "5.10"] },
    { "id": 4, "tasks": ["5.2", "5.3", "5.4", "5.7", "5.9", "5.11", "5.12"] },
    { "id": 5, "tasks": ["5.13", "5.14", "5.15", "5.16"] },
    { "id": 6, "tasks": ["5.17", "7.1", "7.2", "7.4"] },
    { "id": 7, "tasks": ["7.3", "7.5", "8.1", "8.3", "8.5"] },
    { "id": 8, "tasks": ["8.2", "8.4", "9.1", "9.4", "9.5"] },
    { "id": 9, "tasks": ["9.2", "9.3", "9.6", "9.7"] },
    { "id": 10, "tasks": ["9.8", "9.9"] }
  ]
}
```
