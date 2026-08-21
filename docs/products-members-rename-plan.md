# Rename Pricing Library To Products

## Summary

Rename the quote-library concept from "Pricing" to "Products," move it from settings to a new `/products` main-dashboard route, and keep Members available only at `/members` in the main sidebar. Update the AI/importer terminology and persisted AI quote fields consistently, while preserving subscription billing pricing and ordinary quote price/review terminology.

## Implementation Changes

- Add `/products` as the canonical business route by moving the current pricing-library page and manager into the appropriate main business feature area.
- Remove pricing and members from settings navigation.
- Remove the settings pricing routes and retain `/members` as the only Members destination.
- Add Products and Members to `getDashboardNavigation`; update active-path resolution, breadcrumbs, command menu, mobile navigation, instant-navigation metadata, and route registries.
- Rename product-library-facing symbols and copy:
  - `PricingLibrary*` components/types/functions to `ProductLibrary*`.
  - Importer pricing entry types/actions/UI to product entry equivalents.
  - AI retrieval and prompt terminology from pricing library to product library.
  - User-facing text such as "pricing library," "pricing entries," and "pricing blocks" to "product library," "products," "packages," or "services" where appropriate.
- Rename persisted AI quote fields from `aiPricingStatus`, `aiPricingLibraryEntryId`, and `aiPricingLibraryItemId` to their `aiProduct*` equivalents across the Drizzle schema, quote types, Zod schemas, AI generation, mutations, editor state, and tests.
- Create a new sequential database migration that renames the existing quote columns without data loss.
- Rename related cache tags, usage-limit labels, importer destinations, and internal AI result fields where they specifically describe the product library.
- Preserve unrelated billing and subscription terminology:
  - Plan/catalog pricing.
  - Checkout and billing pricing.
  - Monetary `unitPrice` and quote-price concepts.
  - Quote-review messages that refer to confirming actual prices.
- Update legacy tests and E2E flows to use `/products` and `/members`, including paywall and quote-library coverage.

## Test Plan

- Add or update navigation tests verifying:
  - Products and Members appear in the main dashboard navigation.
  - Neither appears in settings navigation.
  - `/products` and `/members` resolve as active items.
- Update route and breadcrumb tests for `/products`.
- Update importer, AI retrieval, quote-generation, and quote-mutation tests for renamed product-library fields and terminology.
- Add migration/schema verification for renamed AI quote columns and preserved data mapping.
- Run targeted unit/component tests, relevant integration tests, lint/typecheck, and the production build.

## Assumptions

- `/products` is the canonical route; old `/settings/pricing` and `/settings/pricing-library` routes are removed rather than redirected.
- `/members` is the canonical Members route; `/settings/members` is removed.
- "Pricing" remains valid when referring to subscription plans, billing, or the actual monetary price of a quote line item.
- The persisted AI field rename is intentional and will be handled through a forward migration.
