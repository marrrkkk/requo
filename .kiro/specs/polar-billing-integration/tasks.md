# Implementation Plan: Polar Billing Integration

Convert the feature design into a series of prompts for a code-generation LLM that will implement each step with incremental progress. Make sure that each prompt builds on the previous prompts, and ends with wiring things together. There should be no hanging or orphaned code that isn't integrated into a previous step. Focus ONLY on tasks that involve writing, modifying, or testing code.

## Overview

This slice swaps the Dodo Payments wiring for Polar (polar.sh) as the sole payment processor while preserving the `BillingProviderInterface`, the account-scoped subscription invariant, idempotent webhook deduplication, and the `app/api/billing/<provider>/{checkout,customer-portal,webhook}` route layout. Implementation follows a build-from-the-inside-out order:

1. Land dependencies, env, and schema first so downstream code compiles.
2. Implement the `PolarProvider` and the factory branch.
3. Implement the customer-portal and webhook routes against the `@polar-sh/nextjs` adapter.
4. Repoint the existing checkout route at Polar.
5. Cover correctness with property-based unit tests (≥100 iterations each, fast-check) and DB-backed integration tests.
6. Remove all Dodo wiring (provider class, route directory, env, schema enum value, docs, AGENTS.md).
7. Run the full verification suite per AGENTS.md.

All code uses TypeScript, matching the design's code samples.

## Tasks

- [x] 1. Add Polar dependencies and remove Dodo dependencies
  - Add `@polar-sh/sdk` and `@polar-sh/nextjs` to `package.json` dependencies, pinned to exact versions.
  - Add `fast-check` to `devDependencies` (used by the property-based tests below).
  - Remove `dodopayments` and `@dodopayments/nextjs` from `package.json`.
  - Run `npm install` and commit the updated `package-lock.json`.
  - _Requirements: 1.1, 12.1_

- [x] 2. Update environment configuration for Polar
  - [x] 2.1 Add `POLAR_*` entries and `isPolarConfigured` to `lib/env.ts`
    - Add Zod entries for `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_SERVER` (default `"sandbox"`, enum `"sandbox" | "production"`), `POLAR_PRO_PRODUCT_ID`, `POLAR_BUSINESS_PRODUCT_ID`, `POLAR_PRO_YEARLY_PRODUCT_ID`, `POLAR_BUSINESS_YEARLY_PRODUCT_ID`.
    - Export `isPolarConfigured = Boolean(POLAR_ACCESS_TOKEN && POLAR_WEBHOOK_SECRET && (any product id set))` per the design.
    - Remove all `DODO_*` schema entries and `isDodoConfigured`.
    - _Requirements: 1.4, 2.1, 2.2, 2.3, 2.5, 12.5_
  - [x] 2.2 Update `.env.example`
    - Replace the Dodo block with the Polar block from the design (`POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_SERVER=sandbox`, four product ids), referencing `{NEXT_PUBLIC_APP_URL}/api/billing/polar/webhook`.
    - _Requirements: 2.4, 12.5_

- [x] 3. Migrate the `billing_provider` enum from `["dodo"]` to `["polar"]`
  - [x] 3.1 Update `lib/db/schema/subscriptions.ts`
    - Change `billingProviders` from `["dodo"] as const` to `["polar"] as const` so the inferred `BillingProvider` type narrows to `"polar"`.
    - _Requirements: 1.6, 12.4_
  - [x] 3.2 Add Drizzle migration `drizzle/0002_polar_billing_migration.sql`
    - Implement the SQL sketch in the design: create `billing_provider_new` enum with `'polar'`, swap each of `account_subscriptions.billing_provider`, `billing_events.provider`, `payment_attempts.provider`, `refunds.provider` via `ALTER COLUMN ... TYPE billing_provider_new USING 'polar'::billing_provider_new`, drop the old enum, rename `billing_provider_new` to `billing_provider`.
    - Include the safety-net `DELETE FROM refunds; DELETE FROM payment_attempts; DELETE FROM billing_events; DELETE FROM account_subscriptions;` block before the type swaps, since the requirement and design both state Requo has zero paying users on Dodo and any existing rows are dev/preview seed data only.
    - Update `drizzle/meta/_journal.json` and the corresponding snapshot so `npm run db:migrate` recognizes the new file.
    - _Requirements: 1.6, 12.4_

- [x] 4. Implement `PolarProvider`
  - [x] 4.1 Create `lib/billing/providers/polar.ts`
    - Add `import "server-only"`, instantiate `Polar` from `@polar-sh/sdk` with the access token (empty string when missing) and `server: "sandbox" | "production"`.
    - Define `PolarProductIdMap`, `PolarServer`, and `PolarProviderConfig` exactly as in the design.
    - Implement the `PolarProvider` class as `BillingProviderInterface`:
      - `createCheckoutSession`: look up the product id for `(plan, interval)`, return `{ type: "error", message: "No Polar product configured for {plan} ({interval})." }` when missing; otherwise call `client.checkouts.create({ products: [productId], externalCustomerId: userId, customerEmail, metadata: { userId, plan, interval }, successUrl, ... })` and return `{ type: "redirect", url: session.url }` on success.
      - `cancelSubscription`: call `client.subscriptions.update(id, { cancelAtPeriodEnd: true })`, return `true` on success, `false` on any thrown error or empty id.
      - `requestRefund`: call `client.refunds.create({ orderId: providerPaymentId, reason: reason.slice(0, 500), ... })`, return `{ type: "ok", refundId, status: "pending" }` on success and `{ type: "error", message }` otherwise.
    - Catch every Polar SDK error and network error inside each method; never throw. Surface SDK errors with status code and message; surface network errors as `Unable to reach Polar: {message}`.
    - Export `reversePolarProductId(productId, productIdMap)` returning `{ plan, interval } | undefined`. The function must be a pure lookup over the four `productIds` map entries.
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 3.2, 3.4, 7.7, 11.1_
  - [x] 4.2 Update factory `lib/billing/providers/index.ts` to return `PolarProvider`
    - Replace the `dodoInstance` / `getDodoProvider` with `polarInstance` / `getPolarProvider`, constructed from `env.POLAR_*` values per the design.
    - Replace the `case "dodo"` branch with `case "polar"`. Keep the `default: const exhaustive: never = provider` exhaustiveness check unchanged.
    - Drop the `import { DodoProvider } from "./dodo"` line.
    - _Requirements: 1.2, 12.2_

  - [ ]* 4.3 Write property test for `reversePolarProductId` round-trip
    - **Property 1: Product id round-trip** — `// Feature: polar-billing-integration, Property 1: For any (plan, interval) pair and any PolarProductIdMap whose entry is non-empty, reversePolarProductId(map[(plan, interval)], map) returns exactly { plan, interval }; for ids not in the map, it returns undefined.`
    - Use `fc.assert(prop, { numRuns: 100 })` in `tests/unit/polar-product-map.test.ts`.
    - **Validates: Requirements 3.4, 7.7**
    - _Requirements: 3.4, 7.7_

  - [ ]* 4.4 Write property test for `PolarProvider` never-throws contract
    - **Property 7: Provider methods never throw** — `// Feature: polar-billing-integration, Property 7: For any PolarProviderConfig and any failure mode of the underlying SDK client, createCheckoutSession / cancelSubscription / requestRefund resolve to a structured result of the documented shape and never throw.`
    - Stub the `Polar` client (Vitest `vi.mock` of `@polar-sh/sdk`) so every method can be made to throw an `Error`, reject, or return malformed data based on a `fast-check` arbitrary.
    - Place the test in `tests/unit/polar-provider-never-throws.test.ts`. Run with `numRuns: 100`.
    - **Validates: Requirements 1.3, 1.4, 1.5**
    - _Requirements: 1.3, 1.4, 1.5_

  - [ ]* 4.5 Write property test for `createCheckoutSession` payload shape
    - **Property 9: Checkout session carries external_id and metadata** — `// Feature: polar-billing-integration, Property 9: For any userId, (plan, interval) with a configured product id, and any userEmail/successUrl/cancelUrl, the parameters passed to client.checkouts.create include externalCustomerId === userId and metadata === { userId, plan, interval }, and product id matches productIds[planKey(plan, interval)].`
    - Spy on the mocked Polar client to capture the args.
    - Place in `tests/unit/polar-checkout-payload.test.ts`. Run with `numRuns: 100`.
    - **Validates: Requirements 3.2, 11.1**
    - _Requirements: 3.2, 11.1_

  - [ ]* 4.6 Write property test for `isPolarConfigured`
    - **Property 8: isPolarConfigured is a pure conjunction** — `// Feature: polar-billing-integration, Property 8: For any env-shaped object with independently-present-or-absent values for the six relevant keys, isPolarConfigured equals Boolean(accessToken) && Boolean(webhookSecret) && (Boolean(proMonthly) || Boolean(proYearly) || Boolean(businessMonthly) || Boolean(businessYearly)).`
    - Either re-import `lib/env.ts` per iteration with a stubbed `process.env`, or test the pure helper directly by extracting it into a tiny `computeIsPolarConfigured(input)` so the property can be exercised without process restarts.
    - Place in `tests/unit/polar-is-configured.test.ts`. Run with `numRuns: 100`.
    - **Validates: Requirements 2.5**
    - _Requirements: 2.5_

- [x] 5. Update `lib/billing/index.ts` re-exports
  - Replace `export { isDodoConfigured } from "@/lib/env"` with `export { isPolarConfigured } from "@/lib/env"`.
  - _Requirements: 12.5_

- [x] 6. Repoint the checkout API route at Polar
  - Edit `app/api/account/billing/checkout/route.ts`:
    - Replace `import { env, isDodoConfigured } from "@/lib/env"` with `import { env, isPolarConfigured } from "@/lib/env"`.
    - Replace the `if (!isDodoConfigured)` gate with `if (!isPolarConfigured)`.
    - Replace `getBillingProvider("dodo")` with `getBillingProvider("polar")`.
    - Replace the `/no dodo product configured/i` regex with `/no polar product configured/i`.
    - Leave the rest of the handler (auth, Zod parsing, `returnTo` sanitization, eligibility check, `resolveAppOrigin`, `successUrl`/`cancelUrl` composition, response shape) unchanged.
  - _Requirements: 2.6, 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 12.6_

  - [ ]* 6.1 Write unit tests for the checkout route gates
    - Cover the `isPolarConfigured = false` 503 branch, the unauthenticated 401 branch, the Zod-failure 400 branch, the duplicate-plan 409 branch, the missing-email 400 branch, and the `/no polar product configured/i` 503 mapping.
    - Place in `tests/unit/billing-checkout-route.test.ts`.
    - _Requirements: 2.6, 3.1, 3.3, 3.5, 3.7_

- [x] 7. Implement the Polar customer-portal route
  - Create `app/api/billing/polar/customer-portal/route.ts` per the design:
    - Configure `CustomerPortal({ accessToken: env.POLAR_ACCESS_TOKEN ?? "", server: env.POLAR_SERVER, getCustomerId: read `x-polar-customer-id` from request headers })`.
    - Export an async `GET(request: Request)` that returns 503 when `!isPolarConfigured`, 401 when `requireUser` throws, 404 when the user has no `account_subscriptions` row or `providerCustomerId` is null with body `"No billing account found. Subscribe to a plan first."`, and otherwise constructs a new `Request` with the `x-polar-customer-id` header set and forwards it to the `portalHandler`.
  - Update the billing UI under `features/billing/` so the "manage billing" link only renders when the current user's `account_subscriptions` row has a non-null `providerCustomerId`, and points to `/api/billing/polar/customer-portal`.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 8. Implement the Polar webhook route
  - [x] 8.1 Add the shared identity resolver helper
    - Create `app/api/billing/polar/webhook/identity.ts` (or a small unexported helper inside the route file) implementing `resolvePolarUserId(payload)` exactly per the design's resolver sketch: `customer.external_id > providerCustomerId lookup > providerSubscriptionId lookup > metadata.userId`.
    - Export it for unit-testing.
    - _Requirements: 8.3, 11.2, 11.3, 11.5_

  - [x] 8.2 Add the `withIdempotency` helper for Polar
    - Add a `withIdempotency<TPayload>(payload, eventType, resolveIds, handler)` helper alongside the route. Implementation must:
      1. Build `providerEventId = `${eventType}:${payload.id ?? payload.data.id ?? randomUUID()}``.
      2. Call `recordWebhookEvent({ providerEventId, provider: "polar", eventType, userId, payload })` — return early on duplicate.
      3. If `userId === null`, mark the event row `failed` with `"User not found"` and return without throwing (so Polar receives 200 and does not retry an unfixable data problem).
      4. Run `handler(userId, eventId)`. On success mark `processed`. On thrown error mark `failed` and re-throw so Polar retries.
    - _Requirements: 5.3, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 11.4_

  - [x] 8.3 Implement subscription event handlers
    - Create handlers for `subscription.created`, `subscription.active`, `subscription.updated`, `subscription.canceled`, `subscription.uncanceled`, `subscription.revoked` mapping Polar status to Requo `SubscriptionStatus` per the table in the design.
    - Each handler resolves `(plan, interval)` from `data.product_id` (or equivalent on the payload) via `reversePolarProductId`. If the lookup fails, throw so the event is marked `failed` and Polar retries (Requirement 7.7).
    - Call `subscription-service.ts` writers (`activateSubscription`, `updateSubscriptionStatus`, `expireSubscription`) with the period boundaries parsed from `data.current_period_start` / `data.current_period_end`, the `providerCustomerId` from `data.customer.id`, and the `providerSubscriptionId` from `data.id`.
    - For `subscription.uncanceled`, clear `canceledAt` and restore `status: "active"`.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 8.4 Implement order event handlers
    - Handle `order.paid` by calling `recordPaymentAttempt({ provider: "polar", providerPaymentId: data.id, userId, status: "succeeded", amount: data.amount, currency: data.currency })`.
    - Handle `order.updated` by calling `recordPaymentAttempt(... status: "failed")` only when the order transitions into a failed status. Treat refund transitions as no-op for `payment_attempts`.
    - Resolve user via `external_id` first, then `account_subscriptions.providerSubscriptionId` as a fallback.
    - When neither resolves, still insert the `payment_attempts` row with `userId = null` and mark `billing_events` `failed` for operator follow-up. Do not change subscription state from order events.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 8.5 Implement refund event handlers
    - Handle `refund.created` and `refund.updated`:
      - Look up an existing `refunds` row by `providerRefundId`, falling back to the most recent `pending` row matching `providerPaymentId`. Insert a new row when neither matches.
      - Map Polar status → Requo: `pending` → `pending`, `succeeded` → `approved` (and call `applyApprovedRefundSideEffects(userId)`), `failed` → `failed`.
    - Treat `order.refunded` as redundant; record it in `billing_events` with status `ignored`.
    - When the refund event has no resolvable user, mark the `billing_events` row `failed` and do not insert a `refunds` row.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.5_

  - [x] 8.6 Wire handlers into the `Webhooks` adapter
    - Create `app/api/billing/polar/webhook/route.ts` exporting `POST = Webhooks({ webhookSecret: env.POLAR_WEBHOOK_SECRET ?? "", onSubscriptionCreated, onSubscriptionActive, onSubscriptionUpdated, onSubscriptionCanceled, onSubscriptionUncanceled, onSubscriptionRevoked, onOrderPaid, onOrderUpdated, onOrderRefunded, onRefundCreated, onRefundUpdated, onPayload: handleUnhandledPayload })`.
    - `handleUnhandledPayload` records the event in `billing_events` with status `ignored`.
    - Wrap every handler body with `withIdempotency`.
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

  - [ ]* 8.7 Write property test for `providerEventId` composition
    - **Property 3: providerEventId composition** — `// Feature: polar-billing-integration, Property 3: For any verified Polar webhook payload, derived providerEventId equals \`${eventType}:${id}\` where id = payload.id > payload.data.id > randomUuid(); two payloads with different eventTypes always differ; two retries of the same logical event produce identical providerEventId.`
    - Place in `tests/unit/polar-event-id.test.ts`. Run with `numRuns: 100`.
    - **Validates: Requirements 6.1**
    - _Requirements: 6.1_

  - [ ]* 8.8 Write property test for Polar status mapping
    - **Property 2: Polar status mapping is total and deterministic** — `// Feature: polar-billing-integration, Property 2: For any Polar subscription status from {active, past_due, canceled, revoked, unpaid, incomplete, incomplete_expired, trialing}, current_period_end, and now, the mapping returns one of Requo's SubscriptionStatus values per the design table; never returns "free".`
    - Place in `tests/unit/polar-status-map.test.ts`. Run with `numRuns: 100`.
    - **Validates: Requirements 7.2**
    - _Requirements: 7.2_

  - [ ]* 8.9 Write property test for identity resolution priority
    - **Property 5: Identity resolution priority** — `// Feature: polar-billing-integration, Property 5: For any payload containing zero or more of customer.external_id, customer.id, subscription_id (or data.id), and metadata.userId, resolvePolarUserId returns the user.id matching the highest-priority non-empty source under external_id > providerCustomerId > providerSubscriptionId > metadata.userId.`
    - Stub the DB layer so `providerCustomerId` and `providerSubscriptionId` lookups return deterministic users keyed by the arbitrary inputs.
    - Place in `tests/unit/polar-identity-resolver.test.ts`. Run with `numRuns: 100`.
    - **Validates: Requirements 8.3, 11.2, 11.3, 11.5**
    - _Requirements: 8.3, 11.2, 11.3, 11.5_

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. DB-backed integration tests for the Polar webhook route
  - [x] 10.1 Add fixtures and signed-payload helpers
    - Add `tests/support/fixtures/polar.ts` returning sample payloads for `subscription.created`, `subscription.updated` (canceled with future period end), `subscription.revoked`, `order.paid`, `refund.updated` (succeeded), plus a duplicate-delivery payload and an unresolvable-user payload.
    - Add a small Standard-Webhooks signing helper so tests can post payloads through the actual route handler.
    - _Requirements: 5.1, 5.3, 6.1_

  - [x] 10.2 Write happy-path integration test for `subscription.created`
    - Posts a signed `subscription.created` payload and asserts: `account_subscriptions` row is `active` for the resolved user, all owned `businesses.plan` columns are updated, `billing_events` row exists with `status = "processed"` and a non-null `processedAt`, and `billing_events.payload` deep-equals the raw payload.
    - Place in `tests/integration/billing-polar-webhook.test.ts`.
    - _Requirements: 5.1, 5.3, 6.4, 6.5, 7.1, 7.6, 11.1, 11.2_

  - [x] 10.3 Write integration test for `subscription.updated` canceled-with-future-period-end
    - Asserts the row flips to `canceled`, `canceledAt` is set, `currentPeriodEnd` matches the payload, and `businesses.plan` is unchanged until the period rolls over.
    - _Requirements: 7.2, 7.3, 7.6_

  - [x] 10.4 Write integration test for `subscription.revoked`
    - Asserts the row is `expired` and all owned `businesses.plan` columns flip to `"free"`.
    - _Requirements: 7.5, 7.6_

  - [x] 10.5 Write integration test for `order.paid` and `subscription`-state isolation
    - Asserts a `payment_attempts` row is inserted with `status = "succeeded"`, the order amount/currency/`providerPaymentId` are stored, and the existing `account_subscriptions` row's status/plan/period boundaries/canceledAt are unchanged.
    - **Property 10: Order events do not mutate subscription status** — `// Feature: polar-billing-integration, Property 10: For any account_subscriptions row in any state and any order event, after the handler runs the subscription columns are unchanged.`
    - **Validates: Requirements 8.5**
    - _Requirements: 8.1, 8.5_

  - [x] 10.6 Write integration test for `refund.updated` (succeeded)
    - Seeds a `pending` `refunds` row inserted via the self-serve flow, posts a signed `refund.updated` succeeded payload, and asserts the row flips to `approved`, `applyApprovedRefundSideEffects` runs (subscription is canceled at period end), and the `billing_events` row is `processed`.
    - _Requirements: 9.2, 10.5_

  - [x] 10.7 Write integration test for duplicate webhook delivery
    - Posts the same signed payload twice and asserts: only one `billing_events` row exists with the composed `providerEventId`, all other tables match the single-delivery state exactly, and the second response is a no-op success.
    - **Property 4: Webhook idempotency** — `// Feature: polar-billing-integration, Property 4: For any sequence of N >= 1 deliveries of the same verified Polar webhook event, the final DB state of account_subscriptions, billing_events, payment_attempts, and refunds equals the single-delivery state; the billing_events row is processed with non-null processedAt; payload deep-equals the raw event.`
    - **Validates: Requirements 5.3, 6.2, 6.4, 6.5**
    - _Requirements: 5.3, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 10.8 Write integration test for unresolvable-user event
    - Posts a signed payload with no resolvable user and asserts a single `billing_events` row exists with `userId = null` and `status = "failed"`, no `account_subscriptions` row is created, and (for refund events) no `refunds` row is inserted.
    - **Property 6: Unresolvable identity is recorded as failed** — `// Feature: polar-billing-integration, Property 6: For any verified payload where every identity source is absent or unresolvable, exactly one billing_events row is recorded with userId = null and status = "failed"; no account_subscriptions row is inserted; no refunds row is inserted; payment_attempts may exist with userId = null for order events.`
    - **Validates: Requirements 8.4, 9.4, 11.4**
    - _Requirements: 8.4, 9.4, 11.4_

- [ ] 11. Self-serve refund property test
  - [ ]* 11.1 Write property test for `requestRefundForPayment`
    - **Property 11: Self-serve refund insert iff provider success** — `// Feature: polar-billing-integration, Property 11: For any eligible payment attempt and any reason (<=500 chars), result.ok === true iff PolarProvider.requestRefund returned { type: "ok", refundId, status: "pending" }; a refunds row exists with status "pending", provider "polar", providerRefundId, providerPaymentId, amount, currency matching the source iff result.ok; result.reason === "provider_error" with no inserted row iff the provider returned { type: "error" }.`
    - Stub `PolarProvider.requestRefund` and seed an eligible payment fixture; place in `tests/unit/billing-refunds.test.ts`. Run with `numRuns: 100`.
    - **Validates: Requirements 10.2, 10.3**
    - _Requirements: 10.2, 10.3_

- [x] 12. Remove all Dodo wiring
  - [x] 12.1 Delete `lib/billing/providers/dodo.ts`
    - _Requirements: 12.1_
  - [x] 12.2 Delete `app/api/billing/dodo/` directory
    - Removes `customer-portal/route.ts` and `webhook/route.ts` and any subfolders under `dodo/`.
    - _Requirements: 12.3_
  - [x] 12.3 Sweep remaining `dodo` / `Dodo` / `DODO_` literal references
    - Update unit/integration test fixtures that hard-code `"dodo"` (e.g. `tests/unit/billing-subscription.test.ts`, `tests/unit/billing-queries.test.ts`, `tests/support/fixtures/billing.ts`, `tests/integration/business-quota.test.ts`, `tests/integration/business-access.test.ts`) to use `"polar"`.
    - Update or remove `docs/setup/` files that reference Dodo as the payment processor; rewrite to point at Polar with the `POLAR_*` env vars.
    - Update `AGENTS.md` "Core Stack" and "Billing Architecture" sections so they reflect Polar (replace the Paddle line and any Dodo references with Polar; webhook route becomes `app/api/billing/polar/webhook/route.ts`).
    - Confirm with `grep -ri "dodo\|DODO_" .` that no live references remain outside `.kiro/specs/` and `drizzle/0001_dodo_payments_migration.sql` (the historical migration is preserved).
    - _Requirements: 12.1, 12.2, 12.3, 12.5_

- [x] 13. Final checkpoint - run the verification suite
  - Run, in order, and resolve any failures before declaring the slice complete:
    - `npm run check`
    - `npm run test`
    - `npm run test:integration`
    - `npm run build`
    - `npm run test:e2e:smoke`
  - Ask the user if questions arise.
  - _Requirements: All requirements_

- [x] 14. Switch checkout to the canonical Polar `Checkout` adapter
  - Replace the POST JSON checkout flow with the canonical `GET = Checkout({...})` adapter from `@polar-sh/nextjs`.
  - Create `app/api/billing/polar/checkout/route.ts` exporting `export const GET = Checkout({ accessToken: env.POLAR_ACCESS_TOKEN ?? "", successUrl: <origin>/account/billing/checkout, server: env.POLAR_SERVER })`.
  - Replace the body of `app/api/account/billing/checkout/route.ts` with a thin redirect route: keep the existing `requireUser` + Zod parse + eligibility gate (already-active, missing email, isPolarConfigured), then 302 to `/api/billing/polar/checkout?products=<polarProductId>&customerExternalId=<userId>&customerEmail=<email>` (URL-encoded). Resolve `<polarProductId>` from `(plan, interval)` using a small helper module.
  - Update `features/billing/start-checkout.ts` and any callers (`UpgradeButton`, `checkout-dialog.tsx`) to navigate to the redirect route via `<a href>` or `router.push` instead of a POST + JSON parse.
  - Remove client-side `fetch` JSON POST flow from `features/billing/start-checkout.ts`.
  - _Refactor: canonical Polar Checkout adapter usage_

- [x] 15. Switch customer-portal to canonical `CustomerPortal` adapter
  - Replace the custom auth-gate + header-injection + `NextRequest`-wrapping in `app/api/billing/polar/customer-portal/route.ts` with the canonical `GET = CustomerPortal({ accessToken, server, getCustomerId, returnUrl })` pattern.
  - `getCustomerId(req)` callback resolves the user from session + `account_subscriptions.providerCustomerId` directly. When no subscription exists, throw — the adapter will surface a 4xx.
  - Add `returnUrl` pointing back to `/account/billing` so the portal renders a back button.
  - Remove the `x-polar-customer-id` header injection trick.
  - _Refactor: adopt canonical CustomerPortal usage_

- [x] 16. Remove `BillingProviderInterface`, factory, and `PolarProvider` class
  - Delete `lib/billing/providers/interface.ts`, `lib/billing/providers/index.ts` (factory), and `lib/billing/providers/polar.ts` (PolarProvider class).
  - Move `reversePolarProductId` and `PolarProductIdMap` types into a new `lib/billing/polar-products.ts` (pure utility) so subscription webhook handlers can still recover `(plan, interval)` from a Polar product id.
  - Update `app/api/billing/polar/webhook/handlers/subscription.ts` to import from the new location.
  - Remove `getBillingProvider` and `BillingProviderInterface`-related re-exports from `lib/billing/index.ts`.
  - _Refactor: drop unused single-provider abstraction_

- [x] 17. Remove self-serve cancel + refund flows; redirect to portal
  - Delete `app/api/billing/refund/route.ts`.
  - Delete `lib/billing/refunds.ts`.
  - Delete `tests/unit/billing-refunds.test.ts`.
  - Update `cancelSubscriptionAction` in `features/billing/actions.ts`: replace with a redirect to the customer portal (or remove entirely if the cancel button can link directly to `/api/billing/polar/customer-portal`).
  - Update `features/billing/components/billing-status-card.tsx`: replace the "Cancel subscription" form with a "Manage subscription" link to the customer portal.
  - Update `features/billing/components/payment-history-table.tsx`: remove the refund eligibility column, refund button, and refund-status display. Payment history becomes read-only.
  - Remove all `applyApprovedRefundSideEffects` import sites.
  - _Refactor: cancel + refund happen in Polar portal_

- [x] 18. Remove refund webhook handlers and tests
  - Delete `app/api/billing/polar/webhook/handlers/refund.ts`.
  - Remove `onRefundCreated` + `onRefundUpdated` wiring from `app/api/billing/polar/webhook/route.ts`.
  - Remove `refund.created` + `refund.updated` from `HANDLED_EVENT_TYPES` so they fall through to `handleUnhandledPayload` and get recorded as `ignored`.
  - Drop refund fixture functions (`polarRefundUpdatedSucceededPayload`, `polarUnresolvableUserRefundPayload`) from `tests/support/fixtures/polar.ts`.
  - Drop the refund.updated integration test (was 10.6) and the refund variant of the unresolvable-user test (was 10.8) from `tests/integration/billing-polar-webhook.test.ts`.
  - Keep the `refunds` table in the schema and DB for historical reads, but document it's read-only post-refactor. Add a JSDoc comment on the `refunds` Drizzle table.
  - _Refactor: refunds happen in portal; subscription.canceled drives state change_

- [x] 19. Add Drizzle migration to drop `account_subscriptions.adaptive_currency`
  - Add `drizzle/0003_drop_adaptive_currency.sql` with `ALTER TABLE account_subscriptions DROP COLUMN adaptive_currency;`.
  - Drop `adaptiveCurrency` from `lib/db/schema/subscriptions.ts` `accountSubscriptions` table definition.
  - Update `drizzle/meta/_journal.json` and add the new snapshot.
  - Update `subscription-service.ts` writers (`activateSubscription`, etc.) to remove the `adaptiveCurrency` parameter and DB column write.
  - Update `features/admin/mutations.ts` if it sets `adaptiveCurrency`.
  - Update `scripts/seed-demo.ts` if it sets `adaptiveCurrency`.
  - _Refactor: drop adaptive currency column_

- [x] 20. Delete `lib/billing/adaptive-currency.ts` and remove PHP approximation UI
  - Delete `lib/billing/adaptive-currency.ts` entirely (`USD_TO_PHP_RATE`, `getPhpApproximation`, `formatPhpApproximation`, `getPhpDisclaimer`).
  - Remove the corresponding re-exports from `lib/billing/index.ts`.
  - Search the codebase for callers and remove all PHP approximation rendering from marketing + checkout UI:
    - `components/marketing/pricing-*.tsx` and `app/(marketing)/pricing/*`
    - `features/billing/components/checkout-dialog.tsx`, `upgrade-button.tsx`, `pricing-interval-toggle.tsx`
  - Pricing UI shows USD only. Polar handles geo pricing natively per product.
  - _Refactor: delete adaptive-currency module and PHP approximation rendering_

- [x] 21. Remove `BillingRegion` and region detection from `lib/billing/region.ts`
  - Drop `getBillingRegion`, `getBillingRegionFromCountry`, `getDefaultCurrency`, `getDefaultProvider`, `getProviderForCurrency`, `isPhilippinesRegion` from `lib/billing/region.ts`.
  - If the file becomes empty, delete it.
  - Remove the corresponding re-exports from `lib/billing/index.ts`.
  - Drop `BillingRegion` type from `lib/billing/types.ts`.
  - Update callers:
    - `features/billing/queries.ts` — drop `region` and `defaultCurrency` from `AccountBillingOverview` shape
    - `features/billing/types.ts` — drop `region` and `defaultCurrency` from `AccountBillingOverview` and `CheckoutDialogProps`
    - `features/billing/components/billing-status-card.tsx`, `checkout-dialog.tsx`, `upgrade-button.tsx`, `business-checkout-provider.tsx` — drop region prop and currency selection
  - _Refactor: Polar handles regional pricing per product; Requo doesn't need a region concept_

- [x] 22. Update tests and fixtures to drop adaptive_currency / region references
  - Update `tests/support/fixtures/billing.ts` — drop `adaptiveCurrency` field.
  - Update `tests/support/fixtures/polar.ts` — no-op if no adaptive_currency references remain.
  - Update `tests/unit/billing-subscription.test.ts`, `tests/unit/billing-queries.test.ts` — drop `adaptiveCurrency` field assertions.
  - Update `tests/integration/billing-polar-webhook.test.ts`, `tests/integration/business-quota.test.ts`, `tests/integration/business-access.test.ts` — drop `adaptiveCurrency` field from any direct inserts.
  - _Refactor: test cleanup for tasks 19, 20, 21_

- [x] 23. Final verification suite for the canonical refactor
  - Run `npm run check`, fix any failures introduced by tasks 14–22.
  - Run `npm run test`, fix any failures.
  - Run `npm run build`, fix any build errors.
  - Skip `npm run test:integration` (remote DB) and `npm run test:e2e:smoke` (needs local dev server) — note in the report.
  - Report status.
  - _Final verification_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP, but are recommended for landing the property-based correctness coverage promised by the design.
- Each task references the granular sub-requirements it implements or validates for traceability.
- Property-based tests use `fast-check` with `numRuns: 100` per property and the tag format `// Feature: polar-billing-integration, Property {N}: {text}` per the design's testing strategy.
- Integration tests run against a real Postgres test DB and post signed payloads through the actual `Webhooks` adapter, exercising signature verification, idempotency, identity resolution, and the per-event handler chain end-to-end.
- The Drizzle migration assumes zero production rows on Dodo; the embedded `DELETE FROM ...` statements are the safety net documented in the design and should be re-checked against any non-production preview DB before the slice ships there.
- AGENTS.md is updated as part of task 12.3; the design explicitly calls out that doc as stale on the current Paddle/Dodo wording.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2.1", "2.2", "3.1"] },
    { "id": 1, "tasks": ["3.2", "4.1"] },
    { "id": 2, "tasks": ["4.2", "4.3", "4.4", "4.5", "4.6", "5"] },
    { "id": 3, "tasks": ["6", "8.1", "8.2"] },
    { "id": 4, "tasks": ["6.1", "8.3", "8.4", "8.5", "8.7", "8.8", "8.9"] },
    { "id": 5, "tasks": ["8.6"] },
    { "id": 6, "tasks": ["10.1"] },
    { "id": 7, "tasks": ["10.2", "10.3", "10.4", "10.5", "10.6", "10.7", "10.8", "11.1"] },
    { "id": 8, "tasks": ["12.1", "12.2", "12.3"] },
    { "id": 9, "tasks": ["18"] },
    { "id": 10, "tasks": ["14", "15", "17"] },
    { "id": 11, "tasks": ["16"] },
    { "id": 12, "tasks": ["19", "20", "21"] },
    { "id": 13, "tasks": ["22"] },
    { "id": 14, "tasks": ["23"] }
  ]
}
```

## Workflow Completion

This workflow is complete once `tasks.md` is created. The implementation has not been performed — to begin executing the plan, open `.kiro/specs/polar-billing-integration/tasks.md` and click "Start task" next to the first task item.

