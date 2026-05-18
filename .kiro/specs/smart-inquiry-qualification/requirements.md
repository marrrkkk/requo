# Requirements Document

## Introduction

Smart Inquiry Qualification adds two capabilities to the Requo inquiry workflow: rule-based lead scoring and duplicate detection. Lead scoring automatically classifies each incoming inquiry as hot, warm, or cold based on budget, deadline urgency, pricing library match, customer history, and detail completeness. Duplicate detection flags inquiries that appear to be repeats from the same customer. Both features surface results in the existing inquiry list and detail pages without requiring AI model calls.

## Glossary

- **Qualification_Engine**: A server-side module in `features/inquiries/` that computes a composite qualification score and temperature classification for an inquiry using rule-based scoring.
- **Temperature**: A classification of inquiry urgency/value — one of "hot", "warm", or "cold" — derived from the composite qualification score.
- **Composite_Score**: A numeric value between 0 and 100 representing the weighted sum of individual scoring signals for an inquiry.
- **Scoring_Signal**: One of five input dimensions used to compute the Composite_Score: budget_presence, deadline_urgency, pricing_match, customer_history, and detail_completeness.
- **Duplicate_Detector**: A server-side module in `features/inquiries/` that identifies potential duplicate inquiries from the same customer based on email recency and text similarity.
- **Token_Overlap**: A similarity metric computed by comparing the set of whitespace-delimited lowercase tokens between two text fields, expressed as a percentage of shared tokens relative to the smaller set.
- **Quote_Library**: The business's saved pricing entries queried via `getQuoteLibraryForBusiness(businessId)`, containing named pricing blocks and packages with service descriptions.
- **Returning_Customer**: A customer whose email address matches at least one previous inquiry that has a linked quote (via `quotes.inquiryId`) for the same business.
- **Inquiry_List_Page**: The existing page at `app/businesses/[slug]/(main)/inquiries/` displaying all inquiries for a business.
- **Inquiry_Detail_Page**: The existing page at `app/businesses/[slug]/(main)/inquiries/[id]/` displaying a single inquiry's full details.

## Requirements

### Requirement 1: Composite Score Computation

**User Story:** As a business owner, I want each incoming inquiry automatically scored based on objective signals, so that I can prioritize the most promising leads without manual review.

#### Acceptance Criteria

1. WHEN an inquiry is submitted, THE Qualification_Engine SHALL compute a Composite_Score between 0 and 100 by evaluating all five Scoring_Signals and summing their weighted contributions.
2. THE Qualification_Engine SHALL assign the following maximum point allocations per Scoring_Signal: budget_presence up to 25 points, deadline_urgency up to 25 points, pricing_match up to 20 points, customer_history up to 15 points, and detail_completeness up to 15 points.
3. THE Qualification_Engine SHALL classify the inquiry Temperature as "hot" when the Composite_Score is 70 or above, "warm" when the Composite_Score is between 40 and 69 inclusive, and "cold" when the Composite_Score is below 40.
4. THE Qualification_Engine SHALL persist the Composite_Score and Temperature on the inquiry record so that subsequent reads do not require recomputation.
5. IF any Scoring_Signal cannot be evaluated due to missing data (null budget, no pricing library entries, no customer history), THEN THE Qualification_Engine SHALL assign 0 points for that signal and proceed with the remaining signals.

### Requirement 2: Budget Scoring Signal

**User Story:** As a business owner, I want inquiries with explicit budgets scored higher, so that I can focus on leads who have committed spending intent.

#### Acceptance Criteria

1. WHEN the inquiry `budgetText` field is null or empty, THE Qualification_Engine SHALL assign 0 points for the budget_presence signal.
2. WHEN the inquiry `budgetText` field contains a parseable numeric value, THE Qualification_Engine SHALL assign points on a linear scale: 5 points for any stated budget, plus up to 20 additional points scaled proportionally where budgets at or above a configurable high-budget threshold (default 5000 in the business currency) receive the full 25 points.
3. WHEN the inquiry `budgetText` field contains text but no parseable numeric value, THE Qualification_Engine SHALL assign 5 points for the budget_presence signal (acknowledging budget intent without a specific amount).

### Requirement 3: Deadline Urgency Scoring Signal

**User Story:** As a business owner, I want inquiries with urgent deadlines scored higher, so that time-sensitive opportunities are surfaced first.

#### Acceptance Criteria

1. WHEN the inquiry `requestedDeadline` field is null, THE Qualification_Engine SHALL assign 0 points for the deadline_urgency signal.
2. WHEN the inquiry `requestedDeadline` is within 7 days of the submission date, THE Qualification_Engine SHALL assign 25 points for the deadline_urgency signal.
3. WHEN the inquiry `requestedDeadline` is between 8 and 14 days from the submission date, THE Qualification_Engine SHALL assign 20 points for the deadline_urgency signal.
4. WHEN the inquiry `requestedDeadline` is between 15 and 30 days from the submission date, THE Qualification_Engine SHALL assign 15 points for the deadline_urgency signal.
5. WHEN the inquiry `requestedDeadline` is between 31 and 60 days from the submission date, THE Qualification_Engine SHALL assign 8 points for the deadline_urgency signal.
6. WHEN the inquiry `requestedDeadline` is more than 60 days from the submission date, THE Qualification_Engine SHALL assign 3 points for the deadline_urgency signal.

### Requirement 4: Pricing Match Scoring Signal

**User Story:** As a business owner, I want inquiries that match my existing pricing library scored higher, so that I can quickly quote services I already have priced.

#### Acceptance Criteria

1. WHEN the inquiry `serviceCategory` matches the name of at least one entry in the Quote_Library (case-insensitive), THE Qualification_Engine SHALL assign 15 points for the pricing_match signal.
2. WHEN the inquiry `serviceCategory` or `details` text contains tokens that overlap with Quote_Library entry names or item descriptions (Token_Overlap above 30%), THE Qualification_Engine SHALL assign between 5 and 20 points proportional to the highest overlap percentage found.
3. IF the Quote_Library for the business contains zero entries, THEN THE Qualification_Engine SHALL assign 0 points for the pricing_match signal.
4. THE Qualification_Engine SHALL use the higher of the category-match score and the text-overlap score as the final pricing_match signal value, capped at 20 points.

### Requirement 5: Customer History Scoring Signal

**User Story:** As a business owner, I want returning customers scored higher, so that I can prioritize repeat business relationships.

#### Acceptance Criteria

1. WHEN the inquiry `customerEmail` matches a previous inquiry for the same business that has at least one linked quote, THE Qualification_Engine SHALL assign 15 points for the customer_history signal.
2. WHEN the inquiry `customerEmail` matches a previous inquiry for the same business but no linked quote exists, THE Qualification_Engine SHALL assign 8 points for the customer_history signal.
3. WHEN the inquiry `customerEmail` does not match any previous inquiry for the same business, THE Qualification_Engine SHALL assign 0 points for the customer_history signal.
4. IF the inquiry `customerEmail` field is null, THEN THE Qualification_Engine SHALL assign 0 points for the customer_history signal.

### Requirement 6: Detail Completeness Scoring Signal

**User Story:** As a business owner, I want inquiries with more complete information scored higher, so that I can prioritize leads that are ready to quote.

#### Acceptance Criteria

1. THE Qualification_Engine SHALL evaluate the following fields for completeness: `customerName` (present), `customerEmail` (present), `serviceCategory` (present), `requestedDeadline` (present), `budgetText` (present), `details` (present and at least 50 characters), and `subject` (present).
2. THE Qualification_Engine SHALL assign points proportionally based on the count of complete fields: 15 points when all 7 fields are complete, scaled linearly down to 0 points when 0 fields are complete (approximately 2.1 points per complete field).
3. THE Qualification_Engine SHALL consider a field "complete" only when it is non-null, non-empty after trimming, and meets any minimum length threshold defined for that field.

### Requirement 7: Score Display on Inquiry List

**User Story:** As a business owner, I want to see the qualification temperature at a glance in my inquiry list, so that I can quickly identify which inquiries deserve immediate attention.

#### Acceptance Criteria

1. THE Inquiry_List_Page SHALL display a Temperature badge next to each inquiry showing "Hot", "Warm", or "Cold" with distinct visual styling (color-coded using the existing Badge component and semantic tokens).
2. THE Inquiry_List_Page SHALL display the Temperature badge only for inquiries that have a persisted Temperature value.
3. WHEN the inquiry list is sorted by default (newest first), THE Inquiry_List_Page SHALL support an optional sort-by-score mode that orders inquiries by Composite_Score descending.

### Requirement 8: Score Display on Inquiry Detail

**User Story:** As a business owner, I want to see the full qualification breakdown on the inquiry detail page, so that I understand why an inquiry was scored the way it was.

#### Acceptance Criteria

1. THE Inquiry_Detail_Page SHALL display the Temperature badge and numeric Composite_Score in the inquiry header area.
2. THE Inquiry_Detail_Page SHALL display a breakdown showing each Scoring_Signal name and its point contribution to the total score.
3. WHEN a Scoring_Signal contributed 0 points due to missing data, THE Inquiry_Detail_Page SHALL display that signal as "N/A" or "No data" rather than showing 0 points without explanation.

### Requirement 9: Duplicate Detection by Email Recency

**User Story:** As a business owner, I want to be warned when a new inquiry comes from a customer who already submitted one recently, so that I do not waste time on accidental resubmissions.

#### Acceptance Criteria

1. WHEN an inquiry is submitted, THE Duplicate_Detector SHALL check whether another inquiry from the same `customerEmail` exists for the same business within the preceding 7 calendar days.
2. WHEN a same-email match is found within 7 days, THE Duplicate_Detector SHALL flag the new inquiry as a potential duplicate and store a reference to the original inquiry ID.
3. IF the inquiry `customerEmail` is null, THEN THE Duplicate_Detector SHALL skip the email recency check and not flag the inquiry as a duplicate based on email alone.

### Requirement 10: Duplicate Detection by Text Similarity

**User Story:** As a business owner, I want to be warned when a new inquiry has nearly identical details to a recent one from the same customer, so that I can identify true duplicates even if submitted days apart.

#### Acceptance Criteria

1. WHEN an inquiry is submitted with a non-null `customerEmail`, THE Duplicate_Detector SHALL compare the `details` field against the `details` field of all inquiries from the same email within the preceding 30 calendar days for the same business.
2. WHEN the Token_Overlap between the new inquiry `details` and any existing inquiry `details` exceeds 80%, THE Duplicate_Detector SHALL flag the new inquiry as a potential duplicate and store a reference to the matching inquiry ID.
3. THE Duplicate_Detector SHALL compute Token_Overlap by: lowercasing both texts, splitting on whitespace into token sets, computing the intersection size divided by the size of the smaller set, and expressing the result as a percentage.
4. IF multiple existing inquiries exceed the 80% Token_Overlap threshold, THEN THE Duplicate_Detector SHALL reference the most recent matching inquiry as the primary duplicate.

### Requirement 11: Duplicate Warning Display

**User Story:** As a business owner, I want a clear warning on the inquiry detail page when a duplicate is detected, so that I can review the original before taking action.

#### Acceptance Criteria

1. WHEN an inquiry is flagged as a potential duplicate, THE Inquiry_Detail_Page SHALL display a warning banner at the top of the page indicating "This inquiry may be a duplicate" with the reason (email recency, text similarity, or both).
2. THE warning banner SHALL include a link to the original/matching inquiry detail page so the business owner can compare them side by side.
3. THE Inquiry_List_Page SHALL display a small duplicate indicator icon next to inquiries that have been flagged as potential duplicates.
4. WHEN the business owner dismisses the duplicate warning on the Inquiry_Detail_Page, THE system SHALL persist the dismissal so the warning does not reappear for that inquiry.

### Requirement 12: Scoring and Detection Timing

**User Story:** As a business owner, I want scoring and duplicate detection to happen automatically when an inquiry arrives, so that results are available immediately without manual action.

#### Acceptance Criteria

1. WHEN an inquiry is created through the public inquiry submission flow, THE system SHALL invoke the Qualification_Engine and Duplicate_Detector before the inquiry creation response is returned to the submitter.
2. THE Qualification_Engine SHALL complete scoring within 500 milliseconds for a business with up to 100 pricing library entries and up to 500 historical inquiries.
3. THE Duplicate_Detector SHALL complete detection within 300 milliseconds for a business with up to 500 historical inquiries from the same customer email.
4. IF the Qualification_Engine or Duplicate_Detector encounters an unexpected error, THEN THE system SHALL still create the inquiry successfully with a null score or no duplicate flag, and log the error for monitoring.
