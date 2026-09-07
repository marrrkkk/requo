# ADR 009: Services as the Product Surface for Intake Capture

**Status**: Accepted
**Date**: 2026-09-07

## Context

The intake-capture surface was built as **Forms**: the `business_inquiry_forms`
table, `/forms` routes, a "Form name" / "Form details" identity panel, and a
per-form **business type** question at creation. Businesses, however, think in
offerings: a landscaping business sells "Lawn mowing", "Design", and "Snow
removal" — each with its own public page and intake form. The surface was
partially renamed to **Services** (routes, list, create dialog), which left
contradictions: the editor still spoke "form" ("Form name", "Form details"),
creation still asked which business type a service belongs to (it belongs to
the business, which already has a type), and the list surfaced the public
page's hero copy as if it were a catalog description.

## Decision

- **Service** is the product term for a `business_inquiry_forms` row:
  routes, components, and owner-facing copy use "Service". The table name and
  internal identifiers (`BusinessInquiryForm`, `features/settings/*`) stay.
- **Creating a service asks only for a name.** The service silently inherits
  the business's starter template (`business_type` column) at creation; the
  action derives it server-side from the business context. No migration.
- **The per-service `business_type` column is retained** — it drives default
  form fields, page copy, and AI quote-drafting defaults — but it is no
  longer edited in the identity panel. Changing a service's template happens
  in Settings → **Template** (the existing apply-preset control). The Page
  tab's "Business type" panel is removed; the page-save action still receives
  `businessType` as a hidden field so its schema is untouched.
- **The services list drops the Type column** (it repeated the business's
  type on every row) and shows the service's **description** — the public
  page's description field, relabeled "Service description", is the single
  source of truth for both the list and the public page.
- **Editor tabs are Form | Service page | Settings.** "Form" stays the name
  of the intake-form builder — the form is the mechanism the user wants to
  keep; everything else in the editor speaks Service.
- **Sweep is owner-facing only.** Dashboard copy, editor labels, manage-card
  labels, toasts, and the onboarding tour use Service language. Customer-facing
  copy (public pages, emails) keeps "inquiry" and "form" — a visitor does fill
  out a form, and an inquiry is the request they make.

## Consequences

- Copy changes across `features/settings/*`, the `/services` routes, and the
  onboarding tour; a handful of server-action messages updated to Service
  language.
- Behavior change: `createBusinessInquiryFormAction` no longer accepts a
  `businessType` from the client — it reads the business's type. Callers of
  the create schema (`BusinessInquiryFormCreateInput`) must drop the field.
- No migration and no public-route changes. The business type remains
  available per service for AI drafting and preset application.
- The glossary (`CONTEXT.md`) documents the Service/inquiry/form terms; this
  ADR records the data-behavior trade-off (inherited template vs. per-service
  template power, resolved by keeping the column and moving the control to
  Settings).