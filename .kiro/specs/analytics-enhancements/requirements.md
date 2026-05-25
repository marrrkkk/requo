# Requirements Document

## Introduction

This specification covers 18 enhancements to Requo's existing analytics dashboard, organized across three priority tiers: immediate wins, high-impact changes, and advanced future ideas. The enhancements improve data freshness controls, visual feedback, traffic attribution, revenue forecasting, performance optimization, interactivity, and long-term analytical depth. All changes build on the existing tabbed Basic/Advanced analytics interface, Drizzle ORM queries, and the free/pro/business plan entitlement model.

## Glossary

- **Dashboard**: The analytics page at `/{businessSlug}/analytics` containing the tabbed Basic/Advanced views.
- **Metric_Card**: A UI card displaying a single KPI value with optional icon, description, delta badge, and tooltip.
- **Sparkline**: A minimal 7-point inline SVG chart showing a metric's trend over the selected period.
- **Date_Range_Selector**: A UI control allowing users to choose a predefined or custom time window for analytics queries.
- **Analytics_Query**: A server-side function in `features/analytics/queries.ts` that fetches aggregated analytics data from PostgreSQL via Drizzle ORM.
- **Daily_Rollup_Table**: A pre-computed `analytics_daily_rollups` table storing per-business, per-day metric counts for efficient trend queries.
- **AI_Summary**: A one-sentence AI-generated insight describing the most notable trend or anomaly in the analytics data.
- **Revenue_Forecast**: A computed projection of expected revenue based on pending quotes, historical acceptance rate, and average quote value.
- **Pipeline_Velocity**: The median number of days from inquiry submission to quote acceptance for a given business.
- **Referrer**: The `document.referrer` value captured during a public form or quote view event, indicating the traffic source.
- **Goal_Threshold**: A user-defined target value for a metric (e.g., acceptance rate > 50%) with visual progress indication.
- **Drill_Down**: Navigation from a metric card to a filtered list view showing the underlying records.
- **Cohort**: A group of customers segmented by their inquiry month, tracked for return behavior over 3, 6, and 12 months.
- **Annotation**: A user-created marker on a trend chart tied to a specific date, explaining a trend change.
- **UTM_Parameters**: URL query parameters (utm_source, utm_medium, utm_campaign) used for marketing attribution.
- **Digest_Email**: A weekly AI-generated summary of key metric changes and recommended actions sent via Resend.
- **Benchmark**: An anonymized comparison of a business's metrics against aggregated metrics from similar Requo businesses.

## Requirements

### Requirement 1: Date Range Selector

**User Story:** As a business owner, I want to select different time ranges for my analytics dashboard, so that I can analyze performance over periods that matter to me.

#### Acceptance Criteria

1. THE Dashboard SHALL display a Date_Range_Selector control below the page header with preset options: 7 days, 30 days, and 90 days.
2. WHEN a user selects a preset date range, THE Dashboard SHALL re-fetch all analytics data scoped to the selected time window.
3. WHERE the custom range option is enabled, THE Date_Range_Selector SHALL allow the user to pick arbitrary start and end dates using a calendar picker.
4. WHEN a custom date range is selected, THE Date_Range_Selector SHALL validate that the start date precedes the end date and that the range does not exceed 365 days.
5. THE Analytics_Query functions SHALL accept `since` and `until` parameters to scope all aggregations to the specified window.
6. WHEN no date range is explicitly selected, THE Dashboard SHALL default to 30 days.
7. WHEN the date range changes, THE Dashboard SHALL update the page header description to reflect the selected period.

### Requirement 2: Mini Sparklines on Basic Metric Cards

**User Story:** As a business owner, I want to see small trend indicators on each metric card in Basic view, so that I can quickly identify upward or downward patterns without switching to the Advanced tab.

#### Acceptance Criteria

1. THE Metric_Card component in Basic view SHALL render a 7-point SVG Sparkline below the metric value.
2. THE Sparkline SHALL represent the metric value at 7 evenly spaced intervals across the selected date range.
3. THE Sparkline SHALL use a stroke color derived from the metric's delta direction: positive trend uses the success semantic color, negative uses the destructive semantic color, and flat uses the muted foreground color.
4. THE Sparkline SHALL have a fixed height of 24px and occupy the full card width minus horizontal padding.
5. WHEN the selected date range contains fewer than 7 data points, THE Sparkline SHALL interpolate available points across the 7-point grid.

### Requirement 3: Last Updated Timestamp

**User Story:** As a business owner, I want to see when the analytics data was last refreshed, so that I can trust the data freshness.

#### Acceptance Criteria

1. THE Dashboard SHALL display a "Refreshed X ago" timestamp below the page header.
2. THE timestamp SHALL reflect the time when the cached analytics data was last computed.
3. WHEN the analytics data is older than 15 minutes, THE timestamp SHALL render in a warning color to indicate potential staleness.
4. THE timestamp SHALL update its relative time display on each page load without requiring a manual refresh.

### Requirement 4: Referrer Tracking on Form View Events

**User Story:** As a business owner, I want to know where my form visitors come from, so that I can understand which channels drive traffic to my inquiry pages.

#### Acceptance Criteria

1. WHEN a public inquiry form or public quote page is viewed, THE tracking payload SHALL include the `document.referrer` value.
2. THE analytics event route SHALL store the referrer in the `analyticsEvents.metadata` JSONB column.
3. IF the referrer is empty or same-origin, THEN THE tracking system SHALL record the source as "direct".
4. THE Dashboard SHALL display a "Top sources" breakdown card showing the top 5 referrer domains by visit count within the selected date range.
5. THE "Top sources" card SHALL be available on the pro plan and above as part of the `analyticsConversion` entitlement.

### Requirement 5: Replace AI Usage Section with AI Summary

**User Story:** As a business owner, I want to see a concise AI-generated insight about my analytics instead of raw token usage, so that I get actionable information without needing to interpret developer metrics.

#### Acceptance Criteria

1. THE Dashboard business panel SHALL replace the current AI usage section (invocations, tokens, estimated cost) with an AI_Summary card.
2. THE AI_Summary card SHALL display a single sentence describing the most notable trend or anomaly from the current analytics data.
3. WHEN generating the AI_Summary, THE system SHALL pass the current period's key metrics and their deltas to the AI provider.
4. IF the AI provider fails to generate a summary, THEN THE AI_Summary card SHALL display a graceful fallback message: "Summary unavailable."
5. THE AI_Summary SHALL be regenerated each time the analytics cache is refreshed for the business.
6. THE AI_Summary card SHALL be available on the business plan as part of the `analyticsWorkflow` entitlement.

### Requirement 6: Revenue Forecast Card

**User Story:** As a business owner, I want to see a projected revenue figure based on my pending quotes, so that I can plan ahead with confidence.

#### Acceptance Criteria

1. THE Dashboard business panel SHALL display a Revenue_Forecast card alongside the existing revenue section.
2. THE Revenue_Forecast SHALL compute expected revenue as: (count of pending quotes) × (historical acceptance rate over the last 90 days) × (average accepted quote value over the last 90 days).
3. WHEN no historical acceptance data exists, THE Revenue_Forecast card SHALL display "Insufficient data" instead of a monetary value.
4. THE Revenue_Forecast card SHALL update when the date range or underlying quote data changes.
5. THE Revenue_Forecast card SHALL be available on the business plan as part of the `analyticsWorkflow` entitlement.

### Requirement 7: Pipeline Velocity Metric

**User Story:** As a business owner, I want to know how many days it typically takes from receiving an inquiry to getting a quote accepted, so that I can identify bottlenecks in my workflow.

#### Acceptance Criteria

1. THE Dashboard business panel SHALL display a Pipeline_Velocity metric card showing the median days from inquiry submission to quote acceptance.
2. THE Pipeline_Velocity calculation SHALL only include inquiries that resulted in at least one accepted quote within the selected date range.
3. WHEN fewer than 3 data points exist for the calculation, THE Pipeline_Velocity card SHALL display "Insufficient data".
4. THE Pipeline_Velocity card SHALL be available on the business plan as part of the `analyticsWorkflow` entitlement.

### Requirement 8: Consolidate Trend Queries

**User Story:** As a developer, I want trend queries consolidated into a single query using conditional aggregation, so that database load is reduced and page load times improve.

#### Acceptance Criteria

1. THE `getProAnalytics` function SHALL execute trend data retrieval (form views, inquiries, quotes sent, accepted) in a single SQL query using conditional aggregation instead of 4 separate queries.
2. THE consolidated query SHALL produce identical results to the current 4 separate trend queries for all valid date ranges.
3. THE consolidated query SHALL complete within the same or lower execution time compared to the sum of the 4 individual queries.

### Requirement 9: Daily Rollup Table

**User Story:** As a developer, I want pre-computed daily rollups, so that trend queries read from small summary rows instead of scanning raw event tables.

#### Acceptance Criteria

1. THE system SHALL maintain an `analytics_daily_rollups` table with columns: business_id, date, form_views, unique_visitors, inquiry_submissions, quotes_sent, quotes_accepted, quotes_rejected, revenue_cents.
2. THE system SHALL populate the Daily_Rollup_Table via a daily scheduled process that aggregates the prior day's raw events.
3. WHEN a rollup for a given business and date already exists, THE rollup process SHALL update the existing row rather than creating a duplicate.
4. THE trend queries SHALL read from the Daily_Rollup_Table when the requested date range spans complete days.
5. FOR ALL dates where raw events exist, THE Daily_Rollup_Table counts SHALL match the counts produced by querying raw event tables directly (round-trip property).

### Requirement 10: Drill-Down from Metric Cards

**User Story:** As a business owner, I want to click a metric card and see the actual records behind the number, so that I can take action on specific inquiries or quotes.

#### Acceptance Criteria

1. WHEN a user clicks a metric card that represents a countable record set (e.g., "Stale inquiries: 5", "Quotes sent: 12"), THE Dashboard SHALL navigate to the corresponding list page with filters pre-applied.
2. THE drill-down navigation SHALL apply filters that reproduce the same count shown on the metric card.
3. WHEN a metric card represents a rate or percentage (e.g., "65% acceptance rate"), THE Metric_Card SHALL not be clickable.
4. THE drill-down links SHALL respect business scoping and plan entitlements.

### Requirement 11: Goal Thresholds

**User Story:** As a business owner, I want to set performance targets for my metrics, so that I can track progress toward my goals at a glance.

#### Acceptance Criteria

1. THE Dashboard SHALL allow users to set a numeric target for any metric card that displays a rate or count.
2. WHEN a Goal_Threshold is set, THE Metric_Card SHALL display a visual progress indicator showing current value relative to the target.
3. WHEN the current value meets or exceeds the Goal_Threshold, THE progress indicator SHALL use the success semantic color.
4. WHEN the current value is below 50% of the Goal_Threshold, THE progress indicator SHALL use the destructive semantic color.
5. THE Goal_Threshold values SHALL persist per business in the database.
6. THE Goal_Threshold feature SHALL be available on the pro plan and above as part of the `analyticsConversion` entitlement.

### Requirement 12: Cohort Analysis

**User Story:** As a business owner, I want to see how customers acquired in different months behave over time, so that I can understand retention and repeat business patterns.

#### Acceptance Criteria

1. THE Dashboard SHALL display a cohort analysis section grouping customers by their first inquiry month.
2. THE cohort analysis SHALL track what percentage of customers in each cohort submit a new inquiry within 3, 6, and 12 months of their first inquiry.
3. THE cohort analysis SHALL display data as a retention matrix with months as rows and retention intervals as columns.
4. THE cohort analysis SHALL require at least 3 months of historical data before rendering.
5. THE cohort analysis SHALL be available on the business plan as part of the `analyticsWorkflow` entitlement.

### Requirement 13: AI-Generated Weekly Digest Email

**User Story:** As a business owner, I want to receive a weekly email summarizing my key metric changes and suggested actions, so that I stay informed without logging in.

#### Acceptance Criteria

1. THE system SHALL send a Digest_Email to the business owner every Monday at 9:00 AM in the business's configured timezone.
2. THE Digest_Email SHALL contain a summary of the week's key metric changes compared to the prior week.
3. THE Digest_Email SHALL include 1-3 AI-generated recommended actions based on the metric changes.
4. WHEN the business owner has disabled email notifications for analytics, THE system SHALL not send the Digest_Email.
5. THE Digest_Email SHALL be sent via Resend using a branded analytics email template.
6. THE Digest_Email feature SHALL be available on the business plan as part of the `analyticsWorkflow` entitlement.

### Requirement 14: PDF/CSV Export of Analytics

**User Story:** As a business owner, I want to download my analytics data as a PDF or CSV file, so that I can share reports with partners or keep offline records.

#### Acceptance Criteria

1. THE Dashboard SHALL provide an export button offering PDF and CSV format options.
2. WHEN the user selects CSV export, THE system SHALL generate a CSV file containing all visible metrics and their values for the selected date range.
3. WHEN the user selects PDF export, THE system SHALL generate a formatted PDF report containing metric cards, trend charts, and funnel visualization for the selected date range.
4. THE export SHALL include the business name, date range, and generation timestamp in the output.
5. THE export feature SHALL be available on the pro plan and above as part of the `exports` entitlement.

### Requirement 15: UTM Parameter Tracking

**User Story:** As a business owner, I want to track UTM parameters on my inquiry form URLs, so that I can measure which paid campaigns drive the most inquiries.

#### Acceptance Criteria

1. WHEN a public inquiry form is viewed with UTM query parameters (utm_source, utm_medium, utm_campaign), THE tracking payload SHALL capture and store these values in the event metadata.
2. THE Dashboard SHALL display a "Campaign performance" breakdown showing inquiry counts grouped by utm_source and utm_campaign.
3. IF no UTM parameters are present on the URL, THEN THE tracking system SHALL record the campaign fields as null.
4. THE UTM tracking data SHALL be retained for 12 months before automatic cleanup.
5. THE campaign performance breakdown SHALL be available on the pro plan and above as part of the `analyticsConversion` entitlement.

### Requirement 16: Scheduled Report Sharing

**User Story:** As a business owner, I want to automatically send analytics summaries to specified email addresses on a schedule, so that my team stays informed without needing dashboard access.

#### Acceptance Criteria

1. THE Dashboard settings SHALL allow users to configure up to 5 recipient email addresses for scheduled reports.
2. THE system SHALL send analytics summary emails on the user-configured schedule (daily, weekly, or monthly).
3. WHEN a scheduled report is sent, THE email SHALL contain the same metrics visible in the Advanced analytics view for the corresponding period.
4. THE scheduled report feature SHALL be available on the business plan as part of the `analyticsWorkflow` entitlement.
5. WHEN a recipient email address is invalid, THE system SHALL reject the address at configuration time with a validation error.

### Requirement 17: Annotation System

**User Story:** As a business owner, I want to mark significant events on my trend charts, so that I can correlate metric changes with real-world actions.

#### Acceptance Criteria

1. THE trend chart SHALL allow users to create annotations by clicking on a specific date point and entering a label (e.g., "Launched Google Ads May 15").
2. THE trend chart SHALL render annotations as vertical markers with tooltips showing the annotation label.
3. THE annotation system SHALL store annotations per business with a date, label, and optional color.
4. WHEN an annotation exists on a visible date, THE trend chart SHALL display a marker icon at that date position.
5. THE annotation system SHALL allow users to edit or delete existing annotations.
6. THE annotation feature SHALL be available on the pro plan and above as part of the `analyticsConversion` entitlement.

### Requirement 18: Benchmarking

**User Story:** As a business owner, I want to compare my metrics against similar businesses on Requo, so that I can understand whether my performance is above or below average for my category.

#### Acceptance Criteria

1. THE Dashboard SHALL display benchmark indicators showing how the business's key metrics compare to the anonymized aggregate of similar Requo businesses.
2. THE benchmarking system SHALL group businesses by industry category and size tier for comparison.
3. THE benchmark data SHALL be computed from aggregated, anonymized data — individual business metrics SHALL not be identifiable.
4. WHEN fewer than 10 businesses exist in a comparison group, THE system SHALL not display benchmark data for that group to preserve anonymity.
5. THE benchmarking feature SHALL be available on the business plan as part of the `analyticsWorkflow` entitlement.
6. THE benchmark indicators SHALL display as "above average", "average", or "below average" relative to the comparison group median.
