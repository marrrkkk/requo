# Requirements Document

## Introduction

Polar Billing Integration replaces the current Dodo Payments wiring with Polar (polar.sh) as Requo's sole payment processor for account-scoped subscription billing. Polar is a Merchant of Record that handles checkout, recurring subscriptions, customer self-service, and refunds.

This slice ships against the Polar **sandbox** environment by default. The full sandbox→production cutover (creating production products, the production webhook endpoint, the production access token, env replacement order, post-deploy verification, and rollback) is documented in `docs/setup/billing.md` (Production cutover section). The integration is built on the `@polar-sh/nextjs` adapter so the existing route layout under `app/api/billing/<provider>/{checkout,customer-portal,webhook}` is preserved.

The integration must:

- Implement the existing `BillingProviderInterface` so the rest of the billing domain (`lib/billing/subscription-service.ts`, `lib/billing/refunds.ts`, the checkout API, the refund API) stays provider-agnostic.
- Preserve the account-scoped subscription invariant: one `account_subscriptions` row per Requo user, with `businesses.plan` updated as a denormalized read cache through `subscription-service.ts`.
- Preserve the idempotent webhook deduplication path through `lib/billing/webhook-processor.ts` and `billing_events`.
- Map Polar Customer to Requo user via `customer.external_id = user.id` so webhook payloads can be resolved back to a Requo user without relying solely on metadata.

Because Requo has zero paying users on Dodo today, Dodo wiring (provider class, factory branch, env, route handlers, enum value) is removed in the same slice rather than carried as legacy.

## Glossary

- **Polar**: Third-party Merchant of Record payment processor at polar.sh. Charges are settled in USD; recurring subscriptions and refunds are handled through Polar's API.
- **Polar_Adapter**: The `@polar-sh/nextjs` package, which provides `Checkout`, `CustomerPortal`, and `Webhooks` Next.js route helpers. Webhook signature verification and payload validation are owned by `Polar_Adapter`.
- **Polar_Server**: The Polar API environment, either `sandbox` or `production`. Selected via the `POLAR_SERVER` environment variable.
- **Polar_Provider**: The `PolarProvider` class in `lib/billing/providers/polar.ts` implementing `BillingProviderInterface`. Owns outbound calls (create checkout session, cancel subscription, request refund).
- **Polar_Customer**: A customer record in Polar. Linked to a Requo user via `external_id = user.id`.
- **Polar_Subscription**: A subscription record in Polar. Mirrored to `account_subscriptions.providerSubscriptionId` on the matching Requo account.
- **Polar_Order**: A Polar order record representing a paid charge (initial purchase or recurring renewal). Mirrored to `payment_attempts` rows on success or failure.
- **Polar_Product**: A product configured in the Polar dashboard. Each Requo `(plan, interval)` pair maps to exactly one Polar product id, configured via env.
- **Polar_Webhook_Event**: A Standard-Webhooks-format event delivered by Polar to `app/api/billing/polar/webhook/route.ts`.
- **Account_Subscription**: A row in the `account_subscriptions` table. Exactly one per Requo user. Authoritative source of subscription state.
- **Subscription_Service**: `lib/billing/subscription-service.ts`. Single write path for all subscription state mutations. Keeps `businesses.plan` in sync across all owned businesses.
- **Webhook_Processor**: `lib/billing/webhook-processor.ts`. Provides idempotent event recording via `billing_events` and payment-attempt recording via `payment_attempts`.
- **Refund_Service**: `lib/billing/refunds.ts`. Single path for self-serve refund requests. Calls into `Polar_Provider` and records refund rows.
- **Billing_Provider_Enum**: The Postgres enum `billing_provider` in `lib/db/schema/subscriptions.ts`. Currently `["dodo"]`; this slice replaces the value with `["polar"]` via Drizzle migration.
- **Paid_Plan**: One of `pro` or `business`.
- **Billing_Interval**: One of `monthly` or `yearly`.
- **External_Id**: The `external_id` field on `Polar_Customer`, set to the Requo `user.id` at checkout-session creation.
- **Provider_Event_Id**: The unique identifier used to deduplicate webhook events in `billing_events.providerEventId`. Composed as `<event_type>:<polar_event_id>` to prevent collisions across event types.

## Requirements

### Requirement 1: Polar Provider Implementation

**User Story:** As a Requo developer, I want a `PolarProvider` class that satisfies the existing `BillingProviderInterface`, so that subscription, checkout, and refund logic in `lib/billing/` continues to work without provider-specific branches.

#### Acceptance Criteria

1. THE Polar_Provider SHALL implement the `BillingProviderInterface` defined in `lib/billing/providers/interface.ts`, exposing `createCheckoutSession`, `cancelSubscription`, and `requestRefund`.
2. WHEN `getBillingProvider("polar")` is called, THE Polar_Provider SHALL be returned as a process-wide singleton.
3. WHEN any Polar_Provider method encounters a Polar API error, THE Polar_Provider SHALL return a structured `{ type: "error", message }` result and SHALL NOT throw.
4. THE Polar_Provider SHALL be constructed from environment variables `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_SERVER`, and the four `POLAR_*_PRODUCT_ID` values without throwing on missing values.
5. IF the Polar_Provider is invoked while `POLAR_ACCESS_TOKEN` is unset, THEN THE Polar_Provider SHALL return `{ type: "error", message }` from each method.
6. THE Billing_Provider_Enum SHALL include `"polar"` as a value supported by the database after this slice ships.

### Requirement 2: Sandbox-First Configuration

**User Story:** As a Requo developer, I want Polar wiring to default to the sandbox environment, so that local development and CI never accidentally hit live Polar.

#### Acceptance Criteria

1. WHERE `POLAR_SERVER` is unset, THE Polar_Provider SHALL default to the `sandbox` environment.
2. WHEN `POLAR_SERVER` is set to `production`, THE Polar_Provider SHALL target Polar's production API.
3. WHEN `POLAR_SERVER` is set to a value other than `sandbox` or `production`, THE Polar_Provider SHALL reject configuration parsing at process start.
4. THE `.env.example` file SHALL document the `POLAR_*` variables, default `POLAR_SERVER=sandbox`, and reference the webhook URL `{NEXT_PUBLIC_APP_URL}/api/billing/polar/webhook`.
5. THE `isPolarConfigured` helper SHALL return `true` only when `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, and at least one `POLAR_*_PRODUCT_ID` are set.
6. IF the Polar checkout API route is invoked while `isPolarConfigured` is false, THEN THE checkout API route SHALL return HTTP 503 with body `{ "error": "Billing is not configured." }`.

### Requirement 3: Hosted Checkout

**User Story:** As a Requo user, I want to subscribe to a paid plan through Polar's hosted checkout, so that I can pay for Pro or Business on a monthly or yearly cadence.

#### Acceptance Criteria

1. WHEN an authenticated user POSTs `{ plan, interval }` to `/api/account/billing/checkout` with `plan ∈ {"pro","business"}` and `interval ∈ {"monthly","yearly"}`, THE checkout API route SHALL call `Polar_Provider.createCheckoutSession`.
2. WHEN `Polar_Provider.createCheckoutSession` is called, THE Polar_Provider SHALL include `external_id = user.id` and `metadata = { userId, plan, interval }` on the resulting Polar checkout session.
3. WHEN `Polar_Provider.createCheckoutSession` succeeds, THE checkout API route SHALL respond with `{ "checkoutUrl": <polar_checkout_url> }` and HTTP 200.
4. IF the requested `(plan, interval)` pair has no configured Polar product id, THEN THE Polar_Provider SHALL return an error result and THE checkout API route SHALL respond with HTTP 503.
5. IF the authenticated user already has an `Account_Subscription` with status `active` or `past_due` on the same plan, THEN THE checkout API route SHALL respond with HTTP 409 and SHALL NOT call Polar.
6. WHEN the checkout session is created, THE Polar_Provider SHALL set `success_url` to the application's `/account/billing/checkout` page (preserving any sanitized `returnTo` query parameter) and SHALL set `cancel_url` to `/pricing`.
7. WHERE the request body fails the existing Zod schema, THE checkout API route SHALL respond with HTTP 400 and SHALL NOT call Polar.

### Requirement 4: Customer Portal

**User Story:** As a paying Requo user, I want a one-click link to Polar's customer portal, so that I can update payment methods, view invoices, and cancel my subscription without contacting support.

#### Acceptance Criteria

1. WHEN an authenticated user GETs `/api/billing/polar/customer-portal`, THE customer portal route SHALL look up the user's `Account_Subscription` and resolve `providerCustomerId`.
2. WHEN `providerCustomerId` is present, THE customer portal route SHALL delegate to `Polar_Adapter.CustomerPortal` and redirect the user to the Polar-hosted portal session.
3. IF the user has no `Account_Subscription` or `providerCustomerId` is null, THEN THE customer portal route SHALL respond with HTTP 404 and message `"No billing account found. Subscribe to a plan first."`.
4. IF `isPolarConfigured` is false, THEN THE customer portal route SHALL respond with HTTP 503.
5. IF the user is unauthenticated, THEN THE customer portal route SHALL respond with HTTP 401.
6. THE billing UI under `features/billing/` SHALL render a customer portal link only when the current user's `Account_Subscription` has a non-null `providerCustomerId`, so that users without a billing relationship cannot trigger the HTTP 404 path.

### Requirement 5: Webhook Signature Verification and Routing

**User Story:** As a Requo operator, I want Polar webhooks to be cryptographically verified and routed by event type, so that the system only mutates billing state in response to authentic Polar events.

#### Acceptance Criteria

1. THE Polar webhook route at `app/api/billing/polar/webhook/route.ts` SHALL delegate signature verification and payload parsing to `Polar_Adapter.Webhooks`, configured with `POLAR_WEBHOOK_SECRET`.
2. IF a webhook request fails signature verification, THEN THE Polar webhook route SHALL respond with HTTP 4xx as returned by `Polar_Adapter.Webhooks` and SHALL NOT mutate billing state.
3. WHEN a webhook request is verified, THE Polar webhook route SHALL invoke the `withIdempotency` wrapper to record the event in `billing_events` before calling the appropriate handler.
4. WHERE a webhook event type is not handled by a specific event handler, THE Polar webhook route SHALL record the event in `billing_events` with status `ignored`.
5. IF an event handler throws, THEN THE Polar webhook route SHALL mark the event row as `failed` with the error message and SHALL re-throw so Polar receives a 5xx and retries.

### Requirement 6: Webhook Idempotency

**User Story:** As a Requo operator, I want duplicate Polar webhook deliveries to be deduplicated, so that retries do not double-apply subscription changes or double-record payments.

#### Acceptance Criteria

1. WHEN a Polar_Webhook_Event is received, THE Webhook_Processor SHALL build a Provider_Event_Id formatted as `<event_type>:<polar_event_id_or_object_id>`.
2. WHEN a Provider_Event_Id matches an existing row in `billing_events`, THE Webhook_Processor SHALL return early without invoking the event handler.
3. WHEN a Provider_Event_Id is new, THE Webhook_Processor SHALL insert a row in `billing_events` with status `processing` before the handler runs.
4. WHEN the handler completes successfully, THE Webhook_Processor SHALL update the row to status `processed` with `processedAt = now()`.
5. THE Webhook_Processor SHALL store the entire raw event payload in `billing_events.payload` for later debugging.

### Requirement 7: Subscription Lifecycle Webhook Handling

**User Story:** As a Requo user, I want my plan to update immediately when my Polar subscription state changes, so that paid features are gated correctly across all my businesses.

#### Acceptance Criteria

1. WHEN a `subscription.active` or `subscription.created` event arrives for an active subscription, THE Polar webhook route SHALL call `activateSubscription` with `provider="polar"`, the resolved `Paid_Plan`, the `Polar_Customer` id, the `Polar_Subscription` id, and the period boundaries from the payload.
2. WHEN a `subscription.updated` event arrives, THE Polar webhook route SHALL call `Subscription_Service` with the latest period boundaries, plan, and status, mapping Polar status `active` → Requo `active`, `past_due` → Requo `past_due`, `canceled` with future `current_period_end` → Requo `canceled`, `canceled` with `current_period_end` already in the past → Requo `expired`, and `revoked`/`unpaid`/`incomplete_expired` → Requo `expired`.
3. WHEN a `subscription.canceled` event arrives, THE Polar webhook route SHALL call `updateSubscriptionStatus` with status `canceled`, `canceledAt = event.canceled_at`, and `currentPeriodEnd = event.current_period_end`.
4. WHEN a `subscription.uncanceled` event arrives, THE Polar webhook route SHALL call `Subscription_Service` to clear `canceledAt` and restore status `active`.
5. WHEN a `subscription.revoked` event arrives, THE Polar webhook route SHALL call `expireSubscription`.
6. WHEN any subscription event handler runs successfully, THE Subscription_Service SHALL also synchronize `businesses.plan` across every business owned by the user.
7. IF a subscription event references a Polar_Product id with no matching `(plan, interval)` mapping, THEN the subscription handler SHALL fail the event so Polar retries; an operator must update the product id mapping.

### Requirement 8: Order and Payment Webhook Handling

**User Story:** As a Requo operator, I want every Polar order outcome recorded as a payment attempt, so that the billing history UI and refund eligibility checks have accurate data.

#### Acceptance Criteria

1. WHEN a `order.paid` event arrives, THE Polar webhook route SHALL call `recordPaymentAttempt` with `provider="polar"`, `providerPaymentId = order.id`, `status="succeeded"`, the order amount in the smallest currency unit, and the order currency.
2. WHEN a `order.updated` event arrives with a failed status, THE Polar webhook route SHALL call `recordPaymentAttempt` with `status="failed"`.
3. WHEN an order event includes the originating subscription id, THE Polar webhook route SHALL resolve the Requo user from `external_id` first and from `account_subscriptions.providerSubscriptionId` as a fallback.
4. IF neither `external_id` nor `providerSubscriptionId` resolves to a Requo user, THEN THE Polar webhook route SHALL still call `recordPaymentAttempt` with `userId = null` so the payment row exists for later reconciliation, and SHALL mark the `billing_events` row `failed` for operator follow-up.
5. THE Polar webhook route SHALL not change subscription status from order events alone — subscription status is owned by `subscription.*` events per Requirement 7.

### Requirement 9: Refund Webhook Handling

**User Story:** As a Requo user requesting a refund, I want Polar's refund decisions to be reflected in my billing history, so that I can see whether my refund was approved or failed without contacting support.

#### Acceptance Criteria

1. WHEN a `refund.created` event arrives, THE Polar webhook route SHALL upsert a row in `refunds` keyed first by `providerRefundId` and then by `providerPaymentId`, with status mapped from the Polar refund status (`pending` → `pending`, `succeeded` → `approved`, `failed` → `failed`).
2. WHEN a `refund.updated` event with status `succeeded` arrives, THE Polar webhook route SHALL update the matching `refunds` row to status `approved` and SHALL call `applyApprovedRefundSideEffects` to cancel the user's subscription at period end.
3. WHEN a `refund.updated` event with status `failed` arrives, THE Polar webhook route SHALL update the matching `refunds` row to status `failed`.
4. IF a refund event arrives with no resolvable Requo user, THEN the refund handler SHALL mark the `billing_events` row `failed` so the issue surfaces to operators.

### Requirement 10: Self-Serve Refund Requests

**User Story:** As a Requo user, I want to request a refund from inside the app, so that I do not need to contact Polar or Requo support directly for eligible refunds.

#### Acceptance Criteria

1. WHEN an authenticated user POSTs `/api/billing/refund` with a payment attempt id they own, THE Refund_Service SHALL invoke `Polar_Provider.requestRefund(providerPaymentId, reason)`.
2. WHEN `Polar_Provider.requestRefund` succeeds, THE Refund_Service SHALL insert a `pending` row in `refunds` with `provider="polar"`, `providerRefundId`, `providerPaymentId`, `amount`, and `currency` copied from the source payment.
3. IF `Polar_Provider.requestRefund` returns an error, THEN THE Refund_Service SHALL return reason `"provider_error"` with the provider message and SHALL NOT insert a `refunds` row.
4. THE Refund_Service SHALL preserve the existing eligibility rules (ownership, payment status, refund window, no overlapping pending/approved refund).
5. WHEN the refund subsequently succeeds via webhook, THE Polar webhook route SHALL be the path that flips the `refunds` row from `pending` to `approved` and SHALL call `applyApprovedRefundSideEffects`.

### Requirement 11: Identity Mapping Between Polar and Requo

**User Story:** As a Requo developer, I want every Polar Customer to carry the Requo `user.id` as `external_id`, so that webhook handlers can resolve users deterministically without relying solely on metadata.

#### Acceptance Criteria

1. WHEN `Polar_Provider.createCheckoutSession` creates a checkout session, THE Polar_Provider SHALL set the customer `external_id` to the Requo `user.id`.
2. WHEN a webhook event includes `customer.external_id`, THE Polar webhook route SHALL resolve the Requo user via `external_id` first.
3. IF `customer.external_id` is missing on an event, THEN THE Polar webhook route SHALL fall back to looking up `account_subscriptions.providerCustomerId` and then `providerSubscriptionId`.
4. IF no Requo user can be resolved by either path, THEN THE Polar webhook route SHALL insert a row in `billing_events` with `userId = null`, mark the row `failed`, and persist the raw payload, so that every unresolvable event is guaranteed to be visible in `billing_events` for operator follow-up.
5. THE Polar webhook route SHALL also accept `metadata.userId` on subscription and order events as a tertiary fallback for events created from existing checkout sessions before `external_id` propagation completes.

### Requirement 12: Removal of Dodo Wiring

**User Story:** As a Requo developer, I want Dodo wiring removed cleanly in the same slice, so that there is no dead code path and no `"dodo"` value lingering in the database enum.

#### Acceptance Criteria

1. THE `lib/billing/providers/dodo.ts` file SHALL be removed.
2. THE `lib/billing/providers/index.ts` factory SHALL no longer reference `"dodo"`.
3. THE `app/api/billing/dodo/` route directory SHALL be removed.
4. THE Billing_Provider_Enum SHALL be migrated from `["dodo"]` to `["polar"]` via a Drizzle migration in `drizzle/`, and the schema in `lib/db/schema/subscriptions.ts` SHALL be updated accordingly.
5. THE `DODO_*` environment variables SHALL be removed from `lib/env`, `.env.example`, and any documentation under `docs/setup/` that references them.
6. THE checkout API route SHALL be updated to call `getBillingProvider("polar")` and to gate on `isPolarConfigured`.
