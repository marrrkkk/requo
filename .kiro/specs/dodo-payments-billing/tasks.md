# Implementation Plan: Dodo Payments Billing Migration

## Overview

Full migration from Paddle to Dodo Payments. Executed in phases: remove Paddle, reset database schema, implement provider abstraction, wire Dodo client, build checkout flow, add webhook processing, update refund service, implement feature gates, add Adaptive Currency support, and update UI. Each phase is independently verifiable.

## Tasks

- [x] 1. Remove Paddle from codebase
  - [x] 1.1 Remove Paddle environment variables and configuration
    - Remove all Paddle env vars from `lib/env.ts` (PADDLE_API_KEY, PADDLE_WEBHOOK_SECRET, PADDLE_PRO_PRICE_ID, PADDLE_PRO_YEARLY_PRICE_ID, PADDLE_BUSINESS_PRICE_ID, PADDLE_BUSINESS_YEARLY_PRICE_ID, PADDLE_ENVIRONMENT, NEXT_PUBLIC_PADDLE_CLIENT_TOKEN, NEXT_PUBLIC_PADDLE_ENVIRONMENT)
    - Remove `isPaddleConfigured` export
    - Remove Paddle entries from `publicEnv` object
    - Update `.env.example` to remove all Paddle variables
    - _Requirements: 1.2, 1.7, 1.8_
  - [x] 1.2 Remove Paddle provider implementation
    - Delete `lib/billing/providers/paddle.ts`
    - Remove all Paddle imports from `lib/billing/refunds.ts`
    - Remove Paddle-specific refund logic (adjustment creation, status mapping)
    - Update `lib/billing/index.ts` to remove Paddle re-exports
    - _Requirements: 1.1, 1.5_
  - [x] 1.3 Remove Paddle webhook route
    - Delete `app/api/billing/paddle/webhook/route.ts`
    - Delete the `app/api/billing/paddle/` directory entirely
    - _Requirements: 1.3_
  - [x] 1.4 Remove Paddle checkout components
    - Delete `features/billing/components/paddle-provider.tsx`
    - Delete `features/billing/components/inline-paddle-checkout-page.tsx`
    - Remove Paddle-specific imports from `features/billing/actions.ts`
    - Remove `createPaddleTransaction` calls from `app/api/account/billing/checkout/route.ts`
    - Remove Paddle references from `features/billing/pending-checkout.ts`
    - _Requirements: 1.4_
  - [x] 1.5 Remove Paddle package dependency
    - Remove `@paddle/paddle-js` from `package.json` if present
    - Remove any other Paddle-related packages from dependencies/devDependencies
    - Run `npm install` to update lockfile
    - _Requirements: 1.8_
  - [x] 1.6 Remove Paddle test files and fixtures
    - Remove any test files containing Paddle imports or mock data
    - Remove Paddle-specific test fixtures
    - _Requirements: 1.6_
  - [x] 1.7 Verify Paddle removal is complete
    - Run case-insensitive grep for "paddle" across all source files (excluding docs, migrations, git history)
    - Fix any remaining references
    - Run `npm run typecheck` to confirm no type errors from missing Paddle modules
    - _Requirements: 1.1, 1.9_

- [x] 2. Add Dodo Payments environment configuration
  - [x] 2.1 Add Dodo environment variables to env schema
    - Add DODO_API_KEY as optional string (emptyToUndefined, min 1)
    - Add DODO_WEBHOOK_SECRET as optional string (emptyToUndefined, min 1)
    - Add DODO_ENVIRONMENT as enum ("test_mode" | "live_mode"), default "test_mode"
    - Add DODO_PRO_PRODUCT_ID as optional string (emptyToUndefined, min 1)
    - Add DODO_BUSINESS_PRODUCT_ID as optional string (emptyToUndefined, min 1)
    - Add DODO_PRO_YEARLY_PRODUCT_ID as optional string (emptyToUndefined, min 1)
    - Add DODO_BUSINESS_YEARLY_PRODUCT_ID as optional string (emptyToUndefined, min 1)
    - Add NEXT_PUBLIC_APP_URL as optional URL (emptyToUndefined, z.url())
    - Export `isDodoConfigured` boolean (DODO_API_KEY present AND at least one product ID present)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_
  - [x] 2.2 Update .env.example with Dodo variables
    - Add all DODO_* variables with placeholder comments
    - Add NEXT_PUBLIC_APP_URL
    - _Requirements: 3.1–3.9_
  - [x] 2.3 Verify env schema validates correctly
    - Run `npm run typecheck` to confirm schema compiles
    - Verify `isDodoConfigured` evaluates correctly with test values
    - _Requirements: 3.9_

- [x] 3. Database reset and schema migration
  - [x] 3.1 Update Drizzle schema definitions
    - Update `billingProviders` array to `["dodo"]` (remove "paddle")
    - Update `billingCurrencies` array to `["USD", "PHP"]`
    - Update `refundStatuses` array to `["pending", "approved", "failed"]`
    - Add `adaptiveCurrency` boolean column to `accountSubscriptions` (default false)
    - Add `status` text column to `billingEvents` (default "processing")
    - Add `errorMessage` text column to `billingEvents`
    - Remove `businessId` column from `billingEvents`
    - Restructure `refunds` table: replace `providerAdjustmentId` with `providerRefundId`, replace `providerTransactionId` with `providerPaymentId`, add `amount` (integer) and `currency` (billingCurrencyEnum), remove `subscriptionId`, `businessId`, `requestedByUserId`, `paymentAttemptId` FK
    - Remove `businessSubscriptions` table export entirely
    - Remove `businessId` column from `paymentAttempts`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.9_
  - [x] 3.2 Create database reset migration script
    - Create `scripts/billing-reset.ts` that:
      - Drops tables: account_subscriptions, business_subscriptions, billing_events, payment_attempts, refunds
      - Drops and recreates enums: billing_provider ("dodo"), billing_currency ("USD", "PHP"), refund_status ("pending", "approved", "failed")
      - Recreates all billing tables per updated Drizzle schema
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  - [x] 3.3 Update seed data to remove Paddle references
    - Ensure no seed data contains "paddle" as a provider value
    - Ensure no seed data contains Paddle-specific identifiers (txn_, sub_, ctc_ prefixes)
    - _Requirements: 2.8_
  - [x] 3.4 Generate Drizzle migration
    - Run `npx drizzle-kit generate` to create the migration file
    - Verify migration SQL matches expected schema changes
    - _Requirements: 2.1–2.9_
  - [x] 3.5 Verify schema compiles and builds
    - Run `npm run typecheck`
    - Fix any type errors from removed columns/tables
    - Update any imports that referenced `businessSubscriptions`
    - _Requirements: 2.9_

- [x] 4. Implement billing provider abstraction
  - [x] 4.1 Create provider interface
    - Create `lib/billing/providers/interface.ts` with `BillingProviderInterface`
    - Define `createCheckoutSession(params)` → `CheckoutSessionResult`
    - Define `cancelSubscription(providerSubscriptionId)` → `boolean`
    - Define `requestRefund(providerPaymentId, reason)` → `RefundResult`
    - Define `verifyWebhookSignature(rawBody, signatureHeader)` → `boolean`
    - Define `parseWebhookEvent(rawBody)` → `NormalizedWebhookEvent`
    - Define all supporting types (CheckoutSessionParams, NormalizedEventType, NormalizedWebhookEvent, RefundResult)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.8_
  - [x] 4.2 Create provider factory
    - Create `lib/billing/providers/index.ts` with `getBillingProvider(provider)` factory
    - Returns `DodoProvider` instance for `"dodo"`
    - Throws for unknown providers
    - _Requirements: 4.6, 4.7_
  - [x] 4.3 Verify interface compiles
    - Run `npm run typecheck`
    - _Requirements: 4.1–4.8_

- [x] 5. Implement Dodo Payments client
  - [x] 5.1 Create Dodo provider implementation
    - Create `lib/billing/providers/dodo.ts` implementing `BillingProviderInterface`
    - Implement `createCheckoutSession`: call Dodo API to create subscription with product ID, customer email, metadata (userId), success/cancel URLs; return redirect URL or error
    - Implement `cancelSubscription`: call Dodo API to cancel subscription; return boolean
    - Implement `requestRefund`: call Dodo API to create refund for payment; return refund ID and status or error
    - Implement `verifyWebhookSignature`: verify HMAC signature using DODO_WEBHOOK_SECRET per Dodo docs
    - Implement `parseWebhookEvent`: parse raw body into NormalizedWebhookEvent with event type mapping
    - All methods catch network/provider errors and return structured error results (never throw)
    - _Requirements: 4.7, 4.8, 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 5.2 Implement product ID mapping
    - Map plan + interval to DODO_*_PRODUCT_ID env vars
    - Handle missing product IDs gracefully (return error, don't throw)
    - _Requirements: 5.1_
  - [x] 5.3 Implement webhook event type mapping
    - Map Dodo event types to NormalizedEventType enum
    - Handle: subscription.created, subscription.active, subscription.renewed, subscription.updated, subscription.cancelled, subscription.expired, subscription.past_due, subscription.on_hold, payment.succeeded, payment.failed, refund.succeeded, refund.failed
    - Unrecognized events map to "ignored"
    - _Requirements: 7.7_
  - [x] 5.4 Verify Dodo client compiles
    - Run `npm run typecheck`
    - _Requirements: 4.7_

- [x] 6. Update subscription service for provider abstraction
  - [x] 6.1 Update subscription service imports and types
    - Remove Paddle-specific imports from `lib/billing/subscription-service.ts`
    - Update `BillingProvider` type usage to accept `"dodo"`
    - Ensure `activateSubscription` accepts `adaptiveCurrency` parameter
    - Add `adaptiveCurrency` to the insert/update logic
    - _Requirements: 4.6, 8.1, 8.7_
  - [x] 6.2 Update billing types
    - Update `lib/billing/types.ts`: change `BillingRegion` to `"global" | "PH"`
    - Update `PlanPricing` type to include optional `PHP` field
    - Ensure `CheckoutResult` type aligns with new hosted checkout flow
    - _Requirements: 6.6, 8.7_
  - [x] 6.3 Verify subscription service compiles
    - Run `npm run typecheck`
    - _Requirements: 8.1_

- [x] 7. Implement webhook processing for Dodo
  - [x] 7.1 Update webhook processor for new schema
    - Update `lib/billing/webhook-processor.ts` to handle new `billing_events` columns (status, errorMessage)
    - Add `markEventFailed(eventId, errorMessage)` function
    - Add `markEventIgnored(eventId)` function
    - Update `recordWebhookEvent` to set initial status "processing"
    - Remove `businessId` parameter from `recordWebhookEvent`
    - _Requirements: 7.4, 7.5, 7.6, 7.15_
  - [x] 7.2 Create Dodo webhook route handler
    - Create `app/api/billing/dodo/webhook/route.ts`
    - Read raw body and signature header
    - Call `DodoProvider.verifyWebhookSignature` → 401 on failure
    - Call `DodoProvider.parseWebhookEvent` to get normalized event
    - Check for duplicate via `billing_events` → 200 if duplicate
    - Insert event with status "processing"
    - Dispatch to handler based on normalized event type
    - Handle subscription.activated/renewed → `activateSubscription`
    - Handle subscription.canceled → `updateSubscriptionStatus("canceled")`
    - Handle subscription.expired → `expireSubscription`
    - Handle subscription.past_due → `updateSubscriptionStatus("past_due")`
    - Handle payment.succeeded → `recordPaymentAttempt` (succeeded)
    - Handle payment.failed → `recordPaymentAttempt` (failed)
    - Handle refund.succeeded → update refund row, cancel subscription
    - Handle refund.failed → update refund row
    - Handle ignored → mark event "ignored", return 200
    - On success → mark "processed", return 200
    - On failure → mark "failed" with error, return 500
    - Resolve user from event metadata (userId from checkout session metadata)
    - If user not found → mark "failed" with "User not found", return 200
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 7.13, 7.14, 7.15, 7.16_
  - [x] 7.3 Verify webhook route compiles
    - Run `npm run typecheck`
    - _Requirements: 7.1–7.16_

- [x] 8. Implement checkout flow
  - [x] 8.1 Rewrite checkout API route
    - Rewrite `app/api/account/billing/checkout/route.ts`:
      - Require authenticated session
      - Validate plan and interval from request body
      - Check existing subscription (reject if already on same plan)
      - Call `getBillingProvider("dodo").createCheckoutSession(...)` with plan, interval, userId, email, success/cancel URLs
      - Return `{ checkoutUrl }` on success or `{ error }` on failure
    - Success URL: `/account/billing/checkout?session_id={checkoutSessionId}`
    - Cancel URL: `/pricing`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.10, 11.1, 11.9_
  - [x] 8.2 Create checkout success page
    - Rewrite `app/(checkout)/account/billing/checkout/page.tsx` as a success/polling page:
      - Read `session_id` from searchParams
      - Display "Your payment is being processed" initially
      - Poll `/api/account/billing/status` every 3 seconds
      - On active subscription detected → show confirmation with plan name
      - After 60 seconds without confirmation → show "Payment confirmation is delayed" message
      - Link to account billing page
    - _Requirements: 5.6, 5.7, 5.8, 11.6, 11.7, 11.8_
  - [x] 8.3 Create billing status API endpoint
    - Create or update `app/api/account/billing/status/route.ts`:
      - Require authenticated session
      - Return current subscription status and effective plan
      - Used by success page polling
    - _Requirements: 5.6, 11.6_
  - [x] 8.4 Update checkout loading state
    - Update `app/(checkout)/account/billing/checkout/loading.tsx` for the new flow
    - _Requirements: 5.6_
  - [x] 8.5 Handle cancel URL redirect
    - Ensure cancel URL (`/pricing`) works correctly when user abandons Dodo checkout
    - No subscription record should be created or modified
    - _Requirements: 5.9, 11.5_
  - [x] 8.6 Verify checkout flow compiles
    - Run `npm run typecheck`
    - _Requirements: 5.1–5.10, 11.1–11.9_

- [x] 9. Update refund service for Dodo
  - [x] 9.1 Rewrite refund service
    - Rewrite `lib/billing/refunds.ts`:
      - Keep eligibility checks (ownership, 30-day window, no duplicate, succeeded status)
      - Replace Paddle adjustment calls with `getBillingProvider("dodo").requestRefund(providerPaymentId, reason)`
      - Update refund row creation to use new schema (providerRefundId, providerPaymentId, amount, currency)
      - Update `applyRefundStatusFromAdjustment` → `applyRefundStatusFromWebhook` for Dodo refund events
      - Keep `applyApprovedRefundSideEffects` (cancel subscription on approved refund)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.11, 10.12_
  - [x] 9.2 Update refund API route
    - Update `app/api/billing/refund/route.ts`:
      - Replace `isPaddleConfigured` check with `isDodoConfigured`
      - Update response shape if needed
    - _Requirements: 10.1–10.12_
  - [x] 9.3 Verify refund service compiles
    - Run `npm run typecheck`
    - _Requirements: 10.1–10.12_

- [x] 10. Implement feature gates
  - [x] 10.1 Create feature gate module
    - Create `lib/billing/feature-gate.ts` with:
      - `getCurrentPlan(userId)` → effective plan from account_subscriptions
      - `hasActiveSubscription(userId)` → true if status is "active" or "past_due"
      - `canCreateBusiness(userId)` → check business count vs plan limit
      - `canUseFeature(userId, featureKey)` → check planEntitlements map
      - `canAccessBillingFeature(userId)` → true if subscription row exists
      - `canRequestRefund(userId)` → check for recent succeeded payment without pending/approved refund
    - All functions are local-only (no external API calls)
    - PHP/Adaptive Currency subscriptions get identical plan access
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_
  - [x] 10.2 Verify feature gates compile
    - Run `npm run typecheck`
    - _Requirements: 9.1–9.8_

- [x] 11. Implement Adaptive Currency support
  - [x] 11.1 Create adaptive currency module
    - Create `lib/billing/adaptive-currency.ts`:
      - Export `USD_TO_PHP_RATE` constant (hardcoded indicative rate, e.g., 56.5)
      - `getPhpApproximation(usdCents)` → whole pesos
      - `formatPhpApproximation(pesos)` → "₱350"
      - `getPhpDisclaimer(pesos, interval)` → "Approx. ₱350/month. Final PHP amount shown at checkout."
    - _Requirements: 6.1, 6.4, 12.3, 12.4_
  - [x] 11.2 Update region detection
    - Update `lib/billing/region.ts`:
      - `getBillingRegion(headers)` → check `x-vercel-ip-country` then `cf-ipcountry`; return `"PH"` if country is "PH", else `"global"`
      - `getBillingRegionFromCountry(code)` → return `"PH"` if code is "PH"
      - `getDefaultCurrency(region)` → return `"USD"` for all (base currency is always USD)
      - `getDefaultProvider(region)` → return `"dodo"` for all
      - Add `isPhilippinesRegion(region)` helper
    - _Requirements: 6.2, 12.5, 12.6_
  - [x] 11.3 Update pricing page for PHP display
    - Update `components/marketing/pricing-page.tsx` and `components/marketing/pricing-interval-toggle.tsx`:
      - Accept `region` prop (detected server-side)
      - When region is "PH", display PHP approximation below USD price
      - Show disclaimer text per requirement
      - Never display PHP as exact or guaranteed price
    - _Requirements: 6.1, 6.2, 6.3, 6.7, 6.8, 12.1, 12.2, 12.3, 12.6, 12.7_
  - [x] 11.4 Update pricing page server component
    - Update `app/(marketing)/pricing/page.tsx` to pass detected region to pricing components
    - _Requirements: 12.5, 12.6_
  - [x] 11.5 Verify adaptive currency compiles
    - Run `npm run typecheck`
    - _Requirements: 6.1–6.8, 12.1–12.7_

- [x] 12. Update billing UI and actions
  - [x] 12.1 Update billing feature types
    - Update `features/billing/types.ts`:
      - Remove Paddle-specific types (PaddleTransactionId references)
      - Update `CheckoutActionState` for redirect-based flow (checkoutUrl instead of paddleTransactionId)
      - Remove `PendingCheckoutState` type
      - Remove `CancelPendingQrCheckoutResult` type
    - _Requirements: 11.1–11.9_
  - [x] 12.2 Update billing actions
    - Update `features/billing/actions.ts`:
      - Remove `createCheckoutAction` (replaced by API route)
      - Update `cancelSubscriptionAction` to use provider interface instead of direct Paddle calls
      - Remove `getPendingCheckoutAction`, `cancelPendingQrCheckoutAction`, `cleanupExpiredPendingAction`
      - Keep `getCheckoutStatusAction` for polling
    - _Requirements: 11.1–11.9_
  - [x] 12.3 Remove pending checkout client module
    - Delete or gut `features/billing/pending-checkout.ts` (no longer needed with hosted checkout)
    - _Requirements: 11.1_
  - [x] 12.4 Update billing queries
    - Update `features/billing/queries.ts`:
      - Remove any Paddle-specific references
      - Ensure `getAccountBillingOverview` works with new schema
    - _Requirements: 8.1–8.8_
  - [x] 12.5 Update account billing page components
    - Update billing page components to remove Paddle checkout references
    - Update subscription display to show Dodo as provider
    - Update cancel flow to use provider interface
    - _Requirements: 8.1–8.8_
  - [x] 12.6 Verify billing UI compiles
    - Run `npm run typecheck`
    - _Requirements: 11.1–11.9_

- [x] 13. Update billing index and plan pricing
  - [x] 13.1 Update billing index exports
    - Update `lib/billing/index.ts`:
      - Export new modules (feature-gate, adaptive-currency, providers)
      - Remove Paddle-specific exports
      - Export `isDodoConfigured` from env
    - _Requirements: 3.9_
  - [x] 13.2 Update plan pricing for PHP display
    - Update `lib/billing/plans.ts`:
      - Add PHP pricing to `PlanPricing` type (optional, for display only)
      - Add `formatPhpPrice` helper or integrate with adaptive-currency module
      - Update `getCurrencySymbol` to handle "PHP" → "₱"
    - _Requirements: 6.1, 12.1, 12.2_
  - [x] 13.3 Verify all billing modules compile together
    - Run `npm run typecheck`
    - Run `npm run lint`
    - _Requirements: 1.9_

- [ ] 14. Final verification and cleanup
  - [x] 14.1 Run full type check
    - `npm run typecheck` — zero errors
    - _Requirements: 1.9_
  - [x] 14.2 Run linter
    - `npm run lint` — zero errors related to billing
    - _Requirements: 1.9_
  - [x] 14.3 Verify no Paddle references remain
    - Case-insensitive grep for "paddle" in source files (exclude node_modules, .git, docs, migration history)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_
  - [-] 14.4 Run production build
    - `npm run build` — succeeds with zero billing-related errors
    - _Requirements: 1.9_
  - [-] 14.5 Run unit tests
    - `npm run test` — all pass
    - _Requirements: 1.9_
  - [-] 14.6 Run integration tests
    - `npm run test:integration` — all pass (billing webhook, subscription, refund tests)
    - _Requirements: 7.1–7.16, 8.1–8.8, 10.1–10.12_

## Notes

- The database reset script (`scripts/billing-reset.ts`) is destructive and should only be run in development/staging. Production migration will be handled separately via Drizzle migrations.
- Dodo Payments API documentation at https://docs.dodopayments.com/ is the authoritative source for API endpoints, webhook schemas, and SDK usage.
- The `adaptiveCurrency` flag on `account_subscriptions` is informational — it does not affect plan access or feature gating.
- Webhook signature verification implementation depends on Dodo's specific signing mechanism (check their docs for HMAC algorithm and header format).
- The hardcoded PHP exchange rate in `lib/billing/adaptive-currency.ts` should be reviewed and updated periodically but is not required to be real-time.
- Tasks 1.1–1.7 can be done in a single pass but are separated for reviewability.
- The provider interface is designed to be minimal — only methods actually needed by the current system are included.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6"] },
    { "id": 1, "tasks": ["1.7", "2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "4.1"] },
    { "id": 4, "tasks": ["3.5", "4.2", "4.3", "5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "5.4", "6.1", "6.2"] },
    { "id": 6, "tasks": ["6.3", "7.1", "7.2"] },
    { "id": 7, "tasks": ["7.3", "8.1", "8.2", "8.3", "8.4", "8.5"] },
    { "id": 8, "tasks": ["8.6", "9.1", "9.2"] },
    { "id": 9, "tasks": ["9.3", "10.1", "11.1", "11.2"] },
    { "id": 10, "tasks": ["10.2", "11.3", "11.4"] },
    { "id": 11, "tasks": ["11.5", "12.1", "12.2", "12.3", "12.4", "12.5"] },
    { "id": 12, "tasks": ["12.6", "13.1", "13.2"] },
    { "id": 13, "tasks": ["13.3", "14.1", "14.2", "14.3"] },
    { "id": 14, "tasks": ["14.4", "14.5", "14.6"] }
  ]
}
```
