# Requirements Document

## Introduction

Service Business Essentials is a cohesive set of five capabilities that address common workflow gaps for service business owners using Requo. These features improve efficiency when managing high volumes of inquiries and quotes, reduce repetitive setup work through full quote templates, ensure consistent customer follow-up through recurring schedules, build confidence before sending quotes through a live preview, and enable offline record-keeping through downloadable invoice PDFs.

## Glossary

- **Bulk_Action_Toolbar**: A contextual toolbar that appears when one or more list items are selected, exposing batch operations applicable to the current selection.
- **Quote_Template**: A reusable full-quote blueprint stored in the quote library that pre-fills all quote fields (title, notes, terms, validity period, and line items) when creating a new quote.
- **Recurring_Follow_Up**: A follow-up task that automatically re-creates itself on a defined schedule after completion, continuing until a termination condition is met.
- **Termination_Condition**: The rule that stops a recurring follow-up from generating further occurrences (e.g., maximum occurrence count reached, or the linked inquiry/quote reaches a terminal status).
- **Quote_Preview**: A read-only rendering of the public quote page shown to the business owner before the quote is sent, matching exactly what the customer will see.
- **Invoice_PDF**: A downloadable PDF document generated from an existing invoice record, formatted for printing or offline sharing.
- **Terminal_Status**: A quote or inquiry status that represents a closed outcome: accepted, rejected, expired, voided, or archived.
- **Selection_State**: The set of currently checked items in a list view, tracked in client state and passed to bulk action handlers.
- **System**: The Requo application as a whole.
- **Business_Owner**: The authenticated user who owns or manages a business within Requo.
- **Plan_Entitlement**: A feature access rule tied to the business subscription plan (free, pro, or business).

## Requirements

### Requirement 1: Bulk Actions for Inquiries

**User Story:** As a business owner, I want to select multiple inquiries and perform actions on them at once, so that I can efficiently manage high-volume inboxes without repetitive one-by-one operations.

#### Acceptance Criteria

1. WHEN the Business_Owner selects one or more inquiries in the inquiry list, THE Bulk_Action_Toolbar SHALL appear with the following batch operations: archive, delete, and change status.
2. WHEN the Business_Owner deselects all inquiries, THE Bulk_Action_Toolbar SHALL disappear.
3. WHEN the Business_Owner triggers a bulk archive action, THE System SHALL archive all selected inquiries and display a confirmation message indicating the count of archived items within 2 seconds of action completion.
4. WHEN the Business_Owner triggers a bulk delete action, THE System SHALL prompt for confirmation before permanently deleting the selected inquiries. IF the Business_Owner dismisses the delete confirmation prompt, THEN THE System SHALL cancel the delete operation and leave all selected inquiries unchanged.
5. WHEN the Business_Owner triggers a bulk status change, THE System SHALL present the following target statuses: "new", "quoted", "waiting", "won", and "lost", update the status of all selected inquiries to the chosen value, and display a confirmation message indicating the count of updated items.
6. THE System SHALL limit bulk actions to a maximum of 50 items per operation. IF the Business_Owner attempts to select more than 50 inquiries, THEN THE System SHALL prevent the additional selection and display a message indicating the 50-item limit has been reached.
7. IF a bulk action partially fails because some items cannot be updated due to state conflicts (e.g., attempting to archive an already-archived inquiry or change status of an archived inquiry), THEN THE System SHALL complete the action for eligible items, display the count of successes and the count of failures, and leave ineligible items unchanged.
8. THE System SHALL provide a "select all on this page" control and a "select all matching current filters" control in the inquiry list. IF "select all matching current filters" would select more than 50 inquiries, THEN THE System SHALL select only the first 50 matching inquiries and inform the Business_Owner that the selection was capped at 50.

### Requirement 2: Bulk Actions for Quotes

**User Story:** As a business owner, I want to select multiple quotes and perform actions on them at once, so that I can manage my quote pipeline efficiently.

#### Acceptance Criteria

1. WHEN the Business_Owner selects one or more quotes in the quote list, THE Bulk_Action_Toolbar SHALL appear displaying the count of selected quotes and the applicable batch operations (archive, void, delete).
2. WHEN the Business_Owner deselects all quotes, THE Bulk_Action_Toolbar SHALL disappear within the same render cycle, returning the list to its default toolbar state.
3. WHEN the Business_Owner triggers a bulk archive action on selected quotes, THE System SHALL archive all selected quotes and display a confirmation message indicating the number of successfully archived items.
4. WHEN the Business_Owner triggers a bulk void action, THE System SHALL void all selected quotes that have an effective status of "sent" and display a summary indicating the count of successfully voided items and the count of skipped items that were ineligible (draft, viewed, accepted, rejected, expired, or already voided).
5. WHEN the Business_Owner triggers a bulk delete action on selected quotes, THE System SHALL prompt for confirmation before proceeding, and upon confirmation permanently delete only selected quotes with an effective status of "draft" that are not archived.
6. THE System SHALL limit bulk selection to a maximum of 50 quotes per operation and disable further selection once 50 quotes are selected.
7. IF a bulk action on quotes partially fails due to ineligible items, THEN THE System SHALL complete the action for all eligible items, display a summary indicating the count of successes and the count of skipped items, and leave ineligible items in their original state without modification.
8. IF the Business_Owner triggers a bulk delete action and confirms, THEN THE System SHALL display a summary indicating the count of deleted items and the count of skipped items that were ineligible for deletion.

### Requirement 3: Full Quote Templates

**User Story:** As a business owner, I want to save and reuse full quote templates that pre-fill the entire quote (title, notes, terms, validity, and line items), so that I can create consistent quotes faster without re-entering common details each time.

#### Acceptance Criteria

1. THE System SHALL support a "template" kind in the quote library alongside existing "block" and "package" kinds.
2. WHEN the Business_Owner creates a quote template, THE System SHALL store the template name (up to 100 characters), default notes, default terms, default validity period (1 to 365 days), and a set of line items (1 to 25 items).
3. WHEN the Business_Owner creates a new quote and selects a quote template, THE System SHALL replace the quote's title, notes, terms, validity period, and all line items with the values from the template, discarding any previously entered content in those fields.
4. WHEN a quote template is applied, THE Business_Owner SHALL be able to edit any pre-filled field before saving the quote.
5. THE System SHALL allow the Business_Owner to create a quote template from an existing quote via a "Save as Template" action, capturing the quote's title, notes, terms, validity period, and line items.
6. THE System SHALL enforce the same plan-gated entry limits for templates as for other quote library entry kinds, counting templates toward the total pricing entries per business limit.
7. WHEN the Business_Owner edits a quote template, THE System SHALL update the stored template without affecting previously created quotes that used the template.
8. THE System SHALL display quote templates in the quote library with a visual label indicating the "template" kind, distinguishing them from blocks and packages.
9. IF the Business_Owner selects a quote template while the current quote already contains line items, THEN THE System SHALL replace all existing line items and pre-filled fields with the template values without prompting for confirmation.

### Requirement 4: Recurring Follow-Ups with Termination Conditions

**User Story:** As a business owner, I want to set up follow-ups that automatically recur on a schedule until a condition is met, so that I stay consistently in touch with prospects without manually re-creating reminders.

#### Acceptance Criteria

1. WHEN the Business_Owner creates or edits a follow-up with a recurrence other than "none", THE System SHALL allow setting a Termination_Condition of either a maximum occurrence count (integer between 1 and 100 inclusive) or "until linked item reaches terminal status".
2. WHILE a Recurring_Follow_Up is active and the Termination_Condition has not been met, THE System SHALL automatically create the next follow-up occurrence within 5 seconds after the current one is marked as completed or skipped, with the due date calculated by adding the recurrence interval to the previous occurrence's due date.
3. WHEN the linked inquiry or quote reaches a Terminal_Status and the Termination_Condition is "until linked item reaches terminal status", THE System SHALL stop generating new occurrences, skip any pending occurrence in the series, and mark the recurring series as completed.
4. WHEN the maximum occurrence count is reached, THE System SHALL stop generating new occurrences and mark the recurring series as completed.
5. WHILE a follow-up has a recurrence other than "none", THE System SHALL display the recurrence schedule and either the remaining occurrence count or the termination rule on the follow-up detail view.
6. WHEN the Business_Owner manually cancels a recurring series, THE System SHALL stop generating new occurrences, skip any pending occurrence in the series, and mark the series as canceled.
7. THE System SHALL support the recurrence intervals daily, every 3 days, weekly, biweekly, and monthly for recurring follow-ups with termination conditions.
8. IF the Business_Owner selects "until linked item reaches terminal status" but the follow-up is not linked to an inquiry or quote, THEN THE System SHALL reject the configuration and display an error message indicating that a linked item is required for this termination condition.

### Requirement 5: Quote Preview Before Sending

**User Story:** As a business owner, I want to preview exactly what my customer will see before I send a quote, so that I can catch errors and ensure the quote looks professional.

#### Acceptance Criteria

1. WHEN the Business_Owner opens the send flow for a quote, THE System SHALL display a "Preview" option that renders the quote using the same layout, fields, and formatting as the public quote page the customer will see.
2. THE Quote_Preview SHALL include the business name, logo (if set), quote number, title, version indicator (if version is greater than 1), customer name, line items with descriptions, quantities, unit prices, and line totals, subtotal, discount, tax, total, terms (if present), and validity date.
3. THE Quote_Preview SHALL reflect the current business plan's watermark setting: displaying the Requo watermark when the plan does not include the "removeWatermark" entitlement, and hiding it when the plan does.
4. WHEN the Business_Owner views the Quote_Preview, THE System SHALL render the preview in a modal or panel that overlays the current view without navigating away from the quote editor or send flow.
5. THE Quote_Preview SHALL be read-only, preventing text selection for editing, form submissions, and interactive actions (such as accept, decline, or revision request buttons) that are available on the live public quote page.
6. WHEN the Business_Owner closes the Quote_Preview, THE System SHALL return focus to the send flow or quote editor and preserve all unsaved field values that were present before the preview was opened.
7. IF the quote has no line items when the Business_Owner opens the Quote_Preview, THEN THE System SHALL display the preview with an empty line-items section and a zero total, allowing the owner to see the incomplete state before deciding to send.

### Requirement 6: Invoice PDF Download

**User Story:** As a business owner, I want to download an invoice as a PDF, so that I can share it offline, attach it to emails outside Requo, or keep it for my records.

#### Acceptance Criteria

1. WHEN the Business_Owner views an invoice detail page, THE System SHALL display a "Download PDF" action that initiates a file download without navigating away from the current page.
2. WHEN the Business_Owner triggers the PDF download, THE System SHALL generate a PDF containing the invoice number, invoice title, business name, business email, customer name, customer email, line items (each with description, quantity, unit price, and line total), subtotal, discount (if greater than zero), tax with label (if greater than zero), total, due date (if set), issued date, notes (if present, truncated to 600 characters), and terms (if present, truncated to 600 characters).
3. THE System SHALL name the downloaded PDF file using the sanitized invoice number followed by the ".pdf" extension (e.g., "INV-0042.pdf").
4. THE System SHALL generate the PDF server-side and return it to the client as a binary response with Content-Type "application/pdf" and a Content-Disposition header indicating attachment, within 10 seconds of the download request.
5. IF the Business_Owner is not authenticated or does not belong to the business that owns the invoice, THEN THE System SHALL return a 404 response without revealing whether the invoice exists.
6. IF the requested invoice does not exist for the given business, THEN THE System SHALL return a 404 response with an error message indicating the resource was not found.
7. WHERE the invoice PDF download feature is plan-gated, THE System SHALL restrict access to businesses on the required plan and display a paywall prompt indicating the minimum plan needed to businesses on lower plans.
