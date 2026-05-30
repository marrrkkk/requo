# Implementation Plan: Service Business Essentials

## Overview

This plan implements six capabilities for service business owners: bulk actions for inquiries and quotes, full quote templates, recurring follow-ups with termination conditions, quote preview before sending, and invoice PDF download. Tasks are ordered to establish schema changes and shared utilities first, then implement each feature's mutations/actions/UI, and finish with integration wiring and tests.

## Tasks

- [x] 1. Schema changes and shared utilities
  - [x] 1.1 Add database schema changes for quote templates and follow-up termination
    - Extend `quoteLibraryEntryKindEnum` in `lib/db/schema/quote-library.ts` to include `"template"`
    - Add columns to `quoteLibraryEntries` table: `title` (text), `notes` (text), `terms` (text), `validityDays` (integer)
    - Add check constraint for `validityDays` (1–365 or null)
    - Create `followUpTerminationConditionEnum` in `lib/db/schema/follow-ups.ts` with values `["count", "terminal_status"]`
    - Add `terminationCondition` column to `followUps` table
    - Run `npm run db:generate -- --name service_business_essentials` and `npm run db:migrate`
    - _Requirements: 3.1, 3.2, 4.1_

  - [x] 1.2 Create `useBulkSelection` hook at `hooks/use-bulk-selection.ts`
    - Implement generic selection state hook with `toggle`, `selectAll`, `deselectAll`, `isSelected`, `isAtLimit`, `selectedCount`, and `serializedIds`
    - Enforce max selection limit of 50 items
    - Return comma-separated ID string for form submission
    - _Requirements: 1.6, 1.8, 2.6_

  - [x] 1.3 Add bulk action type definitions
    - Add `InquiryBulkActionState` type to `features/inquiries/types.ts` with `success`, `error`, `affected`, `skipped` fields
    - Add `QuoteBulkActionState` type to `features/quotes/types.ts` with same fields
    - Update `quoteLibraryEntryKinds` array to include `"template"`
    - Add `followUpTerminationConditions` array and `FollowUpTerminationCondition` type to `features/follow-ups/types.ts`
    - _Requirements: 1.7, 2.7, 3.1, 4.1_

- [ ] 2. Bulk actions for inquiries
  - [x] 2.1 Implement inquiry bulk mutation functions in `features/inquiries/mutations.ts`
    - Implement `bulkArchiveInquiriesForBusiness` — updates `archivedAt`/`archivedBy` WHERE businessId matches, IDs in array, not already archived, not deleted
    - Implement `bulkDeleteInquiriesForBusiness` — updates `deletedAt`/`deletedBy` WHERE businessId matches, IDs in array, not already deleted
    - Implement `bulkChangeInquiryStatusForBusiness` — updates `status` WHERE businessId matches, IDs in array, not archived, not deleted
    - All mutations return `{ affected, skipped }` counts
    - _Requirements: 1.3, 1.4, 1.5, 1.7_

  - [ ]* 2.2 Write property test for bulk inquiry action eligibility (Property 1)
    - **Property 1: Bulk inquiry action eligibility and completeness**
    - Generate random sets of inquiry IDs (1–50) with mixed states (archived, deleted, active)
    - For each bulk action type, verify only eligible items are modified
    - Assert `affected + skipped === total IDs submitted` for every execution
    - Test file: `tests/unit/bulk-inquiry-eligibility.property.test.ts`
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 1.3, 1.5, 1.7**

  - [x] 2.3 Implement inquiry bulk action server actions in `features/inquiries/actions.ts`
    - Create `inquiryBulkActionSchema` (z.array of string IDs, min 1, max 50)
    - Create `inquiryBulkStatusChangeSchema` extending with `targetStatus` enum
    - Implement `bulkArchiveInquiriesAction` server action with auth via `getWorkspaceBusinessActionContext()`
    - Implement `bulkDeleteInquiriesAction` server action with auth
    - Implement `bulkChangeInquiryStatusAction` server action with auth
    - All actions parse comma-separated IDs from formData, validate, call mutations, and invalidate cache tags
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

  - [x] 2.4 Create `InquiryBulkActions` toolbar component and integrate with inquiry list
    - Create `features/inquiries/components/inquiry-bulk-actions.tsx` toolbar with archive, delete, and change status buttons
    - Create `InquiryBulkStatusDialog` component for status picker overlay
    - Add delete confirmation dialog before bulk delete
    - Show toolbar when `selectedCount > 0`, hide when `selectedCount === 0`
    - Display selected count in toolbar
    - Integrate `useBulkSelection` hook into the inquiry list page
    - Add per-row checkboxes and "select all on page" / "select all matching filters" controls
    - Cap "select all matching filters" at 50 items with user notification
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 1.7, 1.8_

- [ ] 3. Bulk actions for quotes
  - [x] 3.1 Implement quote bulk mutation functions in `features/quotes/mutations.ts`
    - Implement `bulkArchiveQuotesForBusiness` — updates `archivedAt`/`archivedBy` WHERE businessId matches, IDs in array, not deleted
    - Implement `bulkVoidQuotesForBusiness` — updates status to "voided", `voidedAt`/`voidedBy` WHERE businessId matches, IDs in array, status is "sent", not deleted
    - Implement `bulkDeleteDraftQuotesForBusiness` — updates `deletedAt`/`deletedBy` WHERE businessId matches, IDs in array, status is "draft", not archived, not deleted
    - All mutations return `{ affected, skipped }` counts
    - _Requirements: 2.3, 2.4, 2.5, 2.7_

  - [ ]* 3.2 Write property test for bulk quote action eligibility (Property 2)
    - **Property 2: Bulk quote action eligibility and completeness**
    - Generate random sets of quote IDs (1–50) with mixed statuses (draft, sent, viewed, accepted, rejected, expired, voided) and states (archived, deleted, active)
    - For each bulk action type, verify only eligible items are modified per eligibility rules
    - Assert `affected + skipped === total IDs submitted` for every execution
    - Test file: `tests/unit/bulk-quote-eligibility.property.test.ts`
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 2.3, 2.4, 2.5, 2.7**

  - [x] 3.3 Implement quote bulk action server actions in `features/quotes/actions.ts`
    - Create `quoteBulkActionSchema` (z.array of string IDs, min 1, max 50)
    - Implement `bulkArchiveQuotesAction` server action with auth
    - Implement `bulkVoidQuotesAction` server action with auth
    - Implement `bulkDeleteQuotesAction` server action with auth and confirmation requirement
    - All actions parse comma-separated IDs from formData, validate, call mutations, and invalidate cache tags
    - _Requirements: 2.3, 2.4, 2.5, 2.7, 2.8_

  - [x] 3.4 Create `QuoteBulkActions` toolbar component and integrate with quote list
    - Create `features/quotes/components/quote-bulk-actions.tsx` toolbar with archive, void, and delete buttons
    - Add delete confirmation dialog before bulk delete
    - Show toolbar when `selectedCount > 0` with count display, hide when deselected
    - Integrate `useBulkSelection` hook into the quote list page
    - Add per-row checkboxes and "select all on page" control
    - Disable further selection once 50 quotes are selected
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.8_

- [x] 4. Checkpoint — Bulk actions complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Full quote templates
  - [x] 5.1 Extend quote library mutations for template kind
    - Modify `createQuoteLibraryEntryForBusiness` in `features/quotes/quote-library-mutations.ts` to handle `kind: "template"` with `title`, `notes`, `terms`, `validityDays` fields
    - Modify `updateQuoteLibraryEntryForBusiness` to support updating template-specific fields
    - Extend `quoteLibraryEntrySchema` validation to require template fields when kind is `"template"` (name max 100 chars, validityDays 1–365, items 1–25)
    - _Requirements: 3.1, 3.2, 3.6, 3.7_

  - [x] 5.2 Implement "Save as Template" server action
    - Create `saveQuoteAsTemplateAction` in `features/quotes/quote-library-actions.ts`
    - Fetch quote with items, calculate validity days from validUntil date
    - Create quote library entry with kind `"template"`, capturing title, notes, terms, validityDays, and line items
    - Enforce plan entitlement check for `quoteLibrary` feature
    - Invalidate pricing cache tags
    - _Requirements: 3.5, 3.6_

  - [x] 5.3 Implement `applyTemplateToQuoteForm` utility
    - Create utility function in `features/quotes/utils.ts`
    - Transform template data into quote form state: title, notes, terms, validUntil (calculated from validityDays), and line items with computed line totals
    - _Requirements: 3.3, 3.4_

  - [ ]* 5.4 Write property test for quote template round-trip (Property 3)
    - **Property 3: Quote template round-trip**
    - Generate random valid quotes with title, notes, terms, validity period (1–365 days), and 1–25 line items
    - Save as template then apply template to new quote form
    - Assert title, notes, terms, and all line item descriptions/quantities/unit prices match original
    - Test file: `tests/unit/quote-template-roundtrip.property.test.ts`
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 3.2, 3.3, 3.5**

  - [x] 5.5 Update quote library UI for template kind
    - Modify quote library form to show template-specific fields (title, notes, terms, validityDays) when kind is `"template"`
    - Add visual "Template" badge/label in quote library list to distinguish from blocks and packages
    - Add "Apply Template" action in quote editor that replaces all fields with template values
    - Add "Save as Template" action on existing quotes
    - Template application replaces all existing line items and pre-filled fields without confirmation
    - _Requirements: 3.1, 3.3, 3.4, 3.7, 3.8, 3.9_

- [ ] 6. Recurring follow-ups with termination conditions
  - [x] 6.1 Implement termination condition logic in follow-up mutations
    - Add `shouldTerminateRecurrence` function in `features/follow-ups/mutations.ts`
    - Implement count-based termination: stop when `recurrenceCount >= recurrenceLimit`
    - Implement terminal status termination: check linked inquiry/quote status against terminal statuses
    - Terminal inquiry statuses: won, lost, archived
    - Terminal quote statuses: accepted, rejected, expired, voided
    - Modify `completeFollowUpForBusiness` to call termination check before creating next occurrence
    - Implement `checkAndTerminateRecurringFollowUps` for status-change-triggered termination
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 6.2 Write property test for recurrence due date calculation (Property 4)
    - **Property 4: Recurrence due date calculation**
    - Generate random follow-ups with recurrence intervals (daily, every_3_days, weekly, biweekly, monthly) and unmet termination conditions
    - Complete or skip the follow-up and verify new occurrence due date equals previous due date + interval duration
    - Test file: `tests/unit/recurrence-due-date.property.test.ts`
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 4.2**

  - [ ]* 6.3 Write property test for terminal status stops recurrence (Property 5)
    - **Property 5: Terminal status stops recurrence**
    - Generate random follow-ups with `terminal_status` condition linked to inquiries or quotes
    - Transition linked item to each terminal status
    - Assert no new occurrence is generated after terminal status transition
    - Test file: `tests/unit/terminal-status-termination.property.test.ts`
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 4.3**

  - [ ]* 6.4 Write property test for count-based termination (Property 6)
    - **Property 6: Count-based termination stops recurrence**
    - Generate random follow-ups with `count` condition and recurrence limit N (1–100)
    - Set recurrence count to N, complete/skip the follow-up
    - Assert no new occurrence is created when count reaches limit
    - Test file: `tests/unit/count-termination.property.test.ts`
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 4.4**

  - [x] 6.5 Update follow-up form UI for termination conditions
    - Modify follow-up create/edit form to show termination condition selector when recurrence is not "none"
    - Add "Maximum occurrences" number input (1–100) when condition is `count`
    - Add "Until linked item reaches terminal status" option with validation that a linked inquiry/quote exists
    - Display recurrence schedule and termination rule on follow-up detail view
    - Show error message when `terminal_status` is selected without a linked item
    - _Requirements: 4.1, 4.5, 4.6, 4.7, 4.8_

- [x] 7. Checkpoint — Templates and follow-ups complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Quote preview before sending
  - [x] 8.1 Add preview panel to `SendQuoteDialog`
    - Modify `features/quotes/components/send-quote-dialog.tsx` to add a "Preview" toggle/tab
    - When preview is active, render existing `QuotePreview` component in a scrollable container within the modal
    - Pass all quote data (business name, logo, quote number, title, version, customer info, items, totals, terms, validity, watermark setting) as props
    - Make preview read-only: `pointer-events-none` on interactive elements, `user-select-none` on text
    - Reflect watermark based on business plan's `removeWatermark` entitlement
    - Preserve all unsaved field values when toggling preview on/off
    - Show empty line-items section with zero total if quote has no items
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ] 9. Invoice PDF download
  - [x] 9.1 Create invoice PDF API route at `app/api/business/[slug]/invoices/[id]/pdf/route.ts`
    - Implement GET handler with auth via `getWorkspaceBusinessActionContext()`
    - Return 404 for unauthenticated users or wrong business (no information leak)
    - Fetch invoice with items using `getInvoiceWithItemsForBusiness`
    - Build `InvoiceDocumentData` from invoice record (truncate notes/terms to 600 chars)
    - Call existing `createInvoicePdf` to generate PDF bytes
    - Return binary response with `Content-Type: application/pdf`, `Content-Disposition: attachment`, and `Cache-Control: private, no-store`
    - Use `getInvoicePdfFileName` for sanitized filename
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6_

  - [ ]* 9.2 Write property test for PDF generation (Property 7)
    - **Property 7: PDF generation produces valid output for any invoice**
    - Generate random valid `InvoiceDocumentData` with 1+ line items, valid currency codes, and non-negative monetary amounts
    - Call `createInvoicePdf` and assert output is non-empty byte array starting with `%PDF` magic bytes
    - Test file: `tests/unit/invoice-pdf-generation.property.test.ts`
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 6.2**

  - [ ]* 9.3 Write property test for PDF filename sanitization (Property 8)
    - **Property 8: PDF filename sanitization**
    - Generate random invoice number strings including special characters, spaces, slashes, backslashes, and unicode
    - Call `getInvoicePdfFileName` and assert result ends with ".pdf", contains no path separators (/ or \), and is non-empty
    - Test file: `tests/unit/invoice-pdf-filename.property.test.ts`
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 6.3**

  - [x] 9.4 Add "Download PDF" button to invoice detail page
    - Add download button to the invoice detail page that triggers browser download via the PDF API route
    - Use `window.open` or anchor tag with `download` attribute pointing to `/api/business/[slug]/invoices/[id]/pdf`
    - Do not navigate away from the current page
    - Add plan entitlement check — show paywall prompt for businesses on lower plans if feature is plan-gated
    - _Requirements: 6.1, 6.7_

- [x] 10. Final checkpoint — All features complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Schema migration (task 1.1) must be completed before any other tasks
- The `useBulkSelection` hook (task 1.2) is shared between inquiry and quote bulk actions
- Quote preview reuses the existing `QuotePreview` component — no new presentational component needed
- Invoice PDF reuses existing `createInvoicePdf` and `getInvoicePdfFileName` utilities

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "3.1", "5.1", "6.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "3.2", "3.3", "5.2", "5.3", "6.2", "6.3", "6.4", "9.1"] },
    { "id": 4, "tasks": ["2.4", "3.4", "5.4", "5.5", "6.5", "8.1", "9.2", "9.3"] },
    { "id": 5, "tasks": ["9.4"] }
  ]
}
```
