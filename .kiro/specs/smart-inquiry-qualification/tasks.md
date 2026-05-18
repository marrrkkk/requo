# Implementation Plan: Smart Inquiry Qualification

## Overview

Implement rule-based lead scoring and duplicate detection for the Requo inquiry workflow. The system computes a composite qualification score (0–100) from five weighted signals, classifies inquiry temperature (hot/warm/cold), and detects potential duplicates by email recency and text similarity. Results are persisted on the inquiry record and surfaced in the existing inquiry list and detail pages.

## Tasks

- [x] 1. Set up qualification module structure and types
  - [x] 1.1 Create qualification types and interfaces
    - Create `features/inquiries/qualification/types.ts` with all type definitions: `ScoringSignal`, `Temperature`, `SignalScore`, `QualificationResult`, `DuplicateFlag`, `QualificationOutput`, and input types (`QuoteLibraryMatchInput`, `CustomerHistoryInput`, `DetailCompletenessInput`, `RecentInquiryInput`, `InquiryQualificationInput`)
    - _Requirements: 1.1, 1.2, 1.3, 9.1, 10.1_

- [x] 2. Implement scoring functions
  - [x] 2.1 Implement budget scoring function
    - Create `features/inquiries/qualification/scoring.ts` with `computeBudgetScore` function
    - Handle null/empty (0 points), non-numeric text (5 points), and numeric values (5 + linear scale up to 25, threshold default 5000)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.2 Implement deadline urgency scoring function
    - Add `computeDeadlineScore` to `scoring.ts`
    - Implement step function: null → 0, ≤7d → 25, 8–14d → 20, 15–30d → 15, 31–60d → 8, >60d → 3
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 2.3 Implement pricing match scoring function
    - Add `computePricingMatchScore` to `scoring.ts`
    - Implement category name match (15 points), token overlap scoring (5–20 proportional above 30%), take max of both capped at 20
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 2.4 Implement customer history scoring function
    - Add `computeCustomerHistoryScore` to `scoring.ts`
    - Implement tier logic: previous inquiry with linked quote → 15, previous inquiry without quote → 8, no history or null email → 0
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 2.5 Implement detail completeness scoring function
    - Add `computeDetailCompletenessScore` to `scoring.ts`
    - Evaluate 7 fields (customerName, customerEmail, serviceCategory, requestedDeadline, budgetText, details ≥50 chars, subject), score = floor((completeCount / 7) × 15)
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 2.6 Implement composite score and temperature classification
    - Add `computeCompositeScore` (sum of signal scores) and `classifyTemperature` (≥70 hot, 40–69 warm, <40 cold) to `scoring.ts`
    - _Requirements: 1.1, 1.3_

  - [ ]* 2.7 Write property tests for scoring functions
    - **Property 1: Score bounds and composition invariant**
    - **Property 2: Temperature classification**
    - **Property 3: Budget scoring formula**
    - **Property 4: Deadline urgency step function**
    - **Property 5: Pricing match scoring**
    - **Property 6: Customer history scoring**
    - **Property 7: Detail completeness scoring**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 3.1–3.6, 4.1–4.4, 5.1–5.4, 6.1–6.3**

  - [ ]* 2.8 Write unit tests for scoring functions
    - Test `computeBudgetScore` with specific examples: null, "$500", "around 3000", "flexible", "$10000"
    - Test `computeDeadlineScore` boundary examples: exactly 7 days, 8 days, 14 days, 15 days, 30 days, 31 days, 60 days, 61 days, null
    - Test `computePricingMatchScore` with exact category match, partial overlap, no match, empty library
    - Test `computeCustomerHistoryScore` for each tier
    - Test `computeDetailCompletenessScore` with 0, 3, 7 complete fields
    - Test `classifyTemperature` boundary examples: 39, 40, 69, 70
    - _Requirements: 1.1–1.5, 2.1–2.3, 3.1–3.6, 4.1–4.4, 5.1–5.4, 6.1–6.3_

- [x] 3. Implement duplicate detection
  - [x] 3.1 Implement token overlap computation
    - Create `features/inquiries/qualification/duplicate-detection.ts` with `computeTokenOverlap` function
    - Lowercase both texts, split on whitespace, compute intersection/smaller-set ratio as percentage
    - _Requirements: 10.3_

  - [x] 3.2 Implement email recency duplicate detection
    - Add `findEmailRecencyDuplicate` to `duplicate-detection.ts`
    - Check for same-email inquiry within 7 calendar days, return matching inquiry ID or null, skip when email is null
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 3.3 Implement text similarity duplicate detection
    - Add `findTextSimilarityDuplicate` to `duplicate-detection.ts`
    - Compare details text against recent inquiries from same email within 30 days, flag when token overlap > 80%, reference most recent match
    - _Requirements: 10.1, 10.2, 10.4_

  - [ ]* 3.4 Write property tests for duplicate detection
    - **Property 8: Token overlap computation**
    - **Property 9: Email recency duplicate detection**
    - **Property 10: Text similarity duplicate detection**
    - **Validates: Requirements 9.1–9.3, 10.1–10.4**

  - [ ]* 3.5 Write unit tests for duplicate detection
    - Test `computeTokenOverlap` with known overlap percentages
    - Test `findEmailRecencyDuplicate` at boundary (6 days, 7 days, 8 days)
    - Test `findTextSimilarityDuplicate` with 79%, 80%, 81% overlap
    - _Requirements: 9.1–9.3, 10.1–10.4_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Database schema and queries
  - [x] 5.1 Add qualification columns to inquiries table and create inquiry_duplicates table
    - Add columns to `lib/db/schema/inquiries.ts`: `qualification_score` (integer, nullable), `qualification_temperature` (text enum, nullable), `qualification_signals` (jsonb, nullable), `qualified_at` (timestamp, nullable)
    - Create `inquiry_duplicates` table with columns: id, business_id, inquiry_id, original_inquiry_id, reason, token_overlap, dismissed_at, dismissed_by, created_at
    - Add indexes: `inquiries_business_qualification_score_idx`, `inquiry_duplicates_business_id_idx`, `inquiry_duplicates_inquiry_id_idx` (unique), `inquiry_duplicates_original_inquiry_id_idx`
    - Create and run the Drizzle migration
    - _Requirements: 1.4, 9.2, 11.4_

  - [x] 5.2 Implement qualification database queries
    - Create `features/inquiries/qualification/queries.ts` with `getCustomerHistoryForScoring` and `getRecentInquiriesForDuplicateCheck`
    - `getCustomerHistoryForScoring`: query previous inquiries for same email/business, check for linked quotes
    - `getRecentInquiriesForDuplicateCheck`: query recent inquiries from same email within configurable window
    - _Requirements: 5.1, 5.2, 9.1, 10.1, 12.2, 12.3_

- [x] 6. Implement qualification orchestrator and integration
  - [x] 6.1 Create the qualifyInquiry orchestrator
    - Create `features/inquiries/qualification/qualify-inquiry.ts` with `qualifyInquiry` function
    - Orchestrate: fetch quote library entries, fetch customer history, fetch recent inquiries, call all scoring functions, compute composite score and temperature, run duplicate detection, persist results to DB
    - Wrap in try/catch so failures don't block inquiry creation, log errors with structured context
    - _Requirements: 1.1, 1.4, 1.5, 12.1, 12.4_

  - [x] 6.2 Integrate qualifyInquiry into inquiry submission flow
    - Modify `features/inquiries/mutations.ts` `createInquirySubmission` to call `qualifyInquiry` after the transaction commits
    - Wrap call in try/catch to ensure inquiry creation succeeds even if qualification fails
    - _Requirements: 12.1, 12.4_

  - [ ]* 6.3 Write integration tests for qualification pipeline
    - Test inquiry submission creates score and temperature on the record
    - Test inquiry submission with duplicate email within 7 days creates duplicate flag
    - Test inquiry submission with similar text within 30 days creates duplicate flag
    - Test scoring failure does not prevent inquiry creation
    - Test duplicate detection failure does not prevent inquiry creation
    - _Requirements: 1.4, 9.2, 10.2, 12.1, 12.4_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement UI components
  - [x] 8.1 Create TemperatureBadge component
    - Create `features/inquiries/components/temperature-badge.tsx`
    - Render color-coded badge using existing Badge component and semantic tokens: hot (red/urgent), warm (amber/attention), cold (blue/neutral)
    - Return null when temperature is null
    - _Requirements: 7.1, 7.2, 8.1_

  - [x] 8.2 Create QualificationBreakdown component
    - Create `features/inquiries/components/qualification-breakdown.tsx`
    - Display each signal name and point contribution, show "N/A" for signals with 0 points due to missing data
    - Display composite score and temperature badge in header
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 8.3 Create DuplicateWarningBanner component
    - Create `features/inquiries/components/duplicate-warning-banner.tsx`
    - Display warning banner with reason (email recency, text similarity, or both)
    - Include link to original inquiry detail page
    - Include dismiss button that persists dismissal via server action
    - _Requirements: 11.1, 11.2, 11.4_

  - [x] 8.4 Integrate qualification display into inquiry list page
    - Add TemperatureBadge to inquiry list items (table and card views)
    - Add duplicate indicator icon for flagged inquiries
    - Add sort-by-score option to existing sort controls
    - _Requirements: 7.1, 7.2, 7.3, 11.3_

  - [x] 8.5 Integrate qualification display into inquiry detail page
    - Add TemperatureBadge and numeric score to inquiry header area
    - Add QualificationBreakdown section showing signal contributions
    - Add DuplicateWarningBanner at top of page when duplicate is flagged
    - _Requirements: 8.1, 8.2, 8.3, 11.1, 11.2_

  - [x] 8.6 Implement dismiss duplicate warning server action
    - Create server action to persist duplicate warning dismissal (update `dismissed_at` and `dismissed_by` on `inquiry_duplicates` record)
    - Validate business access before allowing dismissal
    - _Requirements: 11.4_

  - [ ]* 8.7 Write component tests for qualification UI
    - Test TemperatureBadge renders correct color/text for each temperature
    - Test QualificationBreakdown displays all signals with correct formatting
    - Test DuplicateWarningBanner shows reason and link, handles dismiss
    - _Requirements: 7.1, 8.1–8.3, 11.1–11.4_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All scoring and duplicate detection functions are pure (no side effects), making them straightforward to test
- The qualification pipeline is wrapped in try/catch at the orchestrator level — inquiry creation never fails due to qualification errors
- UI components reuse existing Badge, Alert, and semantic token patterns from the design system

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.4", "2.5", "3.1"] },
    { "id": 2, "tasks": ["2.3", "2.6", "3.2", "3.3"] },
    { "id": 3, "tasks": ["2.7", "2.8", "3.4", "3.5", "5.1"] },
    { "id": 4, "tasks": ["5.2"] },
    { "id": 5, "tasks": ["6.1"] },
    { "id": 6, "tasks": ["6.2"] },
    { "id": 7, "tasks": ["6.3", "8.1", "8.2", "8.3"] },
    { "id": 8, "tasks": ["8.4", "8.5", "8.6"] },
    { "id": 9, "tasks": ["8.7"] }
  ]
}
```
