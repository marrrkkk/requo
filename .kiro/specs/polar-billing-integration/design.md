# Design Document

## Overview

Polar Billing Integration replaces the current Dodo Payments wiring with Polar (polar.sh) as Requo's sole payment processor for account-scoped subscription billing. The design preserves every existing billing seam: `BillingProviderInterface`, `lib/billing/subscription-service.ts`, `lib/billing/refunds.ts`, `lib/billing/webhook-processor.ts`, the account-scoped subscription invariant, idempotent webhook deduplication, and the `app/api/billing/<provider>/{checkout,customer-portal,webhook}` route layout.

The slice is intentionally a like-for-like swap, not a refactor of the billing domain. Concretely:

- A new `PolarProvider` class in `lib/billing/providers/polar.ts` implements the existing `BillingProviderInterface`. The factory in `lib/billing/providers/index.ts` returns it for `"polar"` instead of `"dodo"`.
- New route handlers under `app/api/billing/polar/{customer-portal,webhook}` wrap the `@polar-sh/nextjs` adapter.
- The shared `app/api/account/billing/checkout/route.ts` is repointed at `getBillingProvider("polar")` and `isPolarConfigured`, with no other behavioral changes.
- The `billing_provider` Postgres enum is migrated from `["dodo"]` to `["polar"]` in the same slice. Because Requo has no paying users on Dodo, no data migration is required.
- All Dodo wiring is removed in the same slice: provider class, factory branch, route directory, env vars, schema enum value, and documentation.

The integration targets the Polar **sandbox** environment by default. Production cutover (`POLAR_SERVER=production` plus production product IDs, access token, and webhook secret) is documented in `docs/setup/billing.md` under "Production cutover" — pre-cutover checks, env replacement order, post-deploy verification, and the rollback path are all covered there.

### Note on AGENTS.md drift

`AGENTS.md` currently lists Paddle as the payment processor. That section is stale: the running code still wires Dodo (`lib/billing/providers/dodo.ts`, `app/api/billing/dodo/*`, `DODO_*` env vars). The canonical source of truth for this slice is the requirements document at `.kiro/specs/polar-billing-integration/requirements.md`, which describes a Dodo → Polar swap. AGENTS.md should be updated to reflect Polar after this slice ships; that doc edit is in scope alongside `.env.example` and `docs/setup/`.

## Architecture

### High-level flow

```mermaid
flowchart LR
    user[Requo user]
    subgraph next[Next.js App]
        checkoutApi[/api/account/billing/checkout]
        portalApi[/api/billing/polar/customer-portal]
        webhookApi[/api/billing/polar/webhook]
        provider[PolarProvider<br/>BillingProviderInterface]
        subSvc[subscription-service.ts]
        webhookProc[webhook-processor.ts]
        refunds[refunds.ts]
    end
    polar[Polar API<br/>sandbox or production]
    polarHosted[Polar hosted<br/>checkout / portal]
    db[(Postgres<br/>account_subscriptions<br/>billing_events<br/>payment_attempts<br/>refunds)]

    user -->|POST plan, interval| checkoutApi
    checkoutApi --> provider
    provider -->|create checkout session| polar
    polar --> checkoutApi
    checkoutApi -->|checkoutUrl| user
    user -->|redirect| polarHosted
    polarHosted -->|webhook delivery| webhookApi
    user -->|GET| portalApi
    portalApi --> polar
    polar --> user

    webhookApi --> webhookProc
    webhookProc --> db
    webhookApi --> subSvc
    subSvc --> db
    webhookApi --> refunds
    refunds --> db
```

### Layered responsibilities

| Layer | Module | Responsibility |
| --- | --- | --- |
| Route handler | `app/api/account/billing/checkout/route.ts` | Auth, Zod validation, eligibility checks, calls provider, returns checkout URL. |
| Route handler | `app/api/billing/polar/customer-portal/route.ts` | Auth, resolves `providerCustomerId`, delegates to `Polar_Adapter.CustomerPortal`. |
| Route handler | `app/api/billing/polar/webhook/route.ts` | Wraps `Polar_Adapter.Webhooks`. Per-event handlers route to subscription / payment / refund services through `withIdempotency`. |
| Provider adapter | `lib/billing/providers/polar.ts` | Implements `BillingProviderInterface`. Owns outbound API calls (create checkout session, cancel subscription, request refund). Maps `(plan, interval)` → Polar product id. |
| Factory | `lib/billing/providers/index.ts` | Returns the singleton `PolarProvider` for `"polar"`. |
| Domain | `lib/billing/subscription-service.ts` | Single write path for `account_subscriptions`. Keeps `businesses.plan` in sync. **Unchanged.** |
| Domain | `lib/billing/webhook-processor.ts` | Idempotent event recording in `billing_events`, payment attempt recording. **Unchanged.** |
| Domain | `lib/billing/refunds.ts` | Refund eligibility, refund row writes, `applyApprovedRefundSideEffects`. **Unchanged signatures.** |
| Schema | `lib/db/schema/subscriptions.ts` | `billingProviders` array changes from `["dodo"]` to `["polar"]`. |
| Env | `lib/env.ts` | `POLAR_*` vars added; `DODO_*` removed. `isDodoConfigured` → `isPolarConfigured`. |

The provider abstraction means the only modules that need to know "Polar" specifically are: the `PolarProvider` class, the `polar/customer-portal` route, the `polar/webhook` route, and the env loader. Everything else operates on the abstract `BillingProvider` enum value.

### Adapter (`@polar-sh/nextjs`) responsibilities

The `@polar-sh/nextjs` adapter ships three Next.js route helpers that we use directly. Following the same pattern we use today with `@dodopayments/nextjs`:

- `Checkout({ accessToken, server, ... })` — wraps Polar's checkout-session API. Not used for our route layout because we POST a JSON `{ plan, interval }` body to `/api/account/billing/checkout` and return `{ checkoutUrl }`. The provider class calls Polar's checkout-session API directly via the `@polar-sh/sdk` client to keep parity with the existing checkout flow, since the adapter's `Checkout` helper expects redirect-style query params rather than JSON post bodies.
- `CustomerPortal({ accessToken, server, getCustomerId })` — generates a portal session for the authenticated customer and redirects. Used by `app/api/billing/polar/customer-portal/route.ts`. Our route resolves `providerCustomerId` from `account_subscriptions` and supplies it via `getCustomerId`.
- `Webhooks({ webhookSecret, on*: ... })` — verifies the Standard-Webhooks signature using `POLAR_WEBHOOK_SECRET`, parses the payload, and dispatches typed handlers. Used by `app/api/billing/polar/webhook/route.ts`.

Webhook signature verification and payload typing are owned by the adapter. Our handlers run inside the `on*` callbacks and only contain billing-domain logic.

## Components and Interfaces

### `PolarProvider` class

File: `lib/billing/providers/polar.ts`

```ts
import "server-only";
import { Polar } from "@polar-sh/sdk";
import type { BillingInterval, PaidPlan } from "@/lib/billing/types";
import type {
  BillingProviderInterface,
  CancelSubscriptionResult,
  CheckoutSessionParams,
  CheckoutSessionResult,
  RefundResult,
} from "./interface";

export type PolarServer = "sandbox" | "production";

export type PolarProductIdMap = {
  proMonthly?: string;
  proYearly?: string;
  businessMonthly?: string;
  businessYearly?: string;
};

export type PolarProviderConfig = {
  accessToken: string | undefined;
  webhookSecret: string | undefined;
  server: PolarServer;
  productIds: PolarProductIdMap;
};

export class PolarProvider implements BillingProviderInterface {
  private readonly productIds: PolarProductIdMap;
  private readonly client: Polar;
  private readonly server: PolarServer;
  private readonly accessToken: string | undefined;

  constructor(config: PolarProviderConfig) { /* ... */ }

  createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult>;
  cancelSubscription(providerSubscriptionId: string): Promise<CancelSubscriptionResult>;
  requestRefund(providerPaymentId: string, reason: string): Promise<RefundResult>;
}

/**
 * Reverse-maps a Polar product id to the Requo `(plan, interval)` pair.
 * Exported for use by the webhook route handler when activating a
 * subscription from a `subscription.*` event.
 */
export function reversePolarProductId(
  productId: string,
  productIds: PolarProductIdMap,
): { plan: PaidPlan; interval: BillingInterval } | undefined;
```

Behavior contract:

- The constructor never throws. Missing `accessToken` is permitted; calls return structured errors at runtime.
- `createCheckoutSession` calls `client.checkouts.create({ products: [productId], externalCustomerId: userId, customerEmail, metadata: { userId, plan, interval }, successUrl, ... })`. It always sets `externalCustomerId` to the Requo `user.id` so the resulting Polar customer carries `external_id = user.id`. Returns `{ type: "redirect", url: session.url }` on success.
- If the requested `(plan, interval)` has no configured product id, returns `{ type: "error", message: "No Polar product configured for {plan} ({interval})." }`. The checkout API route maps this message to HTTP 503.
- `cancelSubscription` calls `client.subscriptions.update(id, { cancelAtPeriodEnd: true })`. Returns `true` on success. We choose `cancelAtPeriodEnd: true` rather than immediate revocation so the user keeps paid access until `currentPeriodEnd`, matching the existing Dodo behavior and `applyApprovedRefundSideEffects`.
- `requestRefund` calls `client.refunds.create({ orderId: providerPaymentId, reason, ... })`. Polar refunds are keyed by `order_id`; in our schema `providerPaymentId` already stores the Polar order id (recorded by `order.paid` webhook handling).
- Every method catches errors and returns `{ type: "error", message }`. Polar SDK errors are surfaced with their status code and message; network errors are surfaced as `Unable to reach Polar: {message}`.

The factory in `lib/billing/providers/index.ts` becomes:

```ts
let polarInstance: PolarProvider | null = null;

function getPolarProvider(): PolarProvider {
  if (!polarInstance) {
    polarInstance = new PolarProvider({
      accessToken: env.POLAR_ACCESS_TOKEN,
      webhookSecret: env.POLAR_WEBHOOK_SECRET,
      server: env.POLAR_SERVER,
      productIds: {
        proMonthly: env.POLAR_PRO_PRODUCT_ID,
        proYearly: env.POLAR_PRO_YEARLY_PRODUCT_ID,
        businessMonthly: env.POLAR_BUSINESS_PRODUCT_ID,
        businessYearly: env.POLAR_BUSINESS_YEARLY_PRODUCT_ID,
      },
    });
  }
  return polarInstance;
}

export function getBillingProvider(
  provider: BillingProvider,
): BillingProviderInterface {
  switch (provider) {
    case "polar":
      return getPolarProvider();
    default: {
      const exhaustive: never = provider;
      throw new Error(`Unknown billing provider: ${String(exhaustive)}`);
    }
  }
}
```

### Environment configuration

File: `lib/env.ts`

Added entries (`DODO_*` are removed in the same slice):

```ts
POLAR_ACCESS_TOKEN: emptyToUndefined(z.string().min(1)),
POLAR_WEBHOOK_SECRET: emptyToUndefined(z.string().min(1)),
POLAR_SERVER: emptyToUndefined(z.enum(["sandbox", "production"])).default("sandbox"),
POLAR_PRO_PRODUCT_ID: emptyToUndefined(z.string().min(1)),
POLAR_BUSINESS_PRODUCT_ID: emptyToUndefined(z.string().min(1)),
POLAR_PRO_YEARLY_PRODUCT_ID: emptyToUndefined(z.string().min(1)),
POLAR_BUSINESS_YEARLY_PRODUCT_ID: emptyToUndefined(z.string().min(1)),
```

`isPolarConfigured` mirrors the existing `isDodoConfigured`:

```ts
export const isPolarConfigured = Boolean(
  env.POLAR_ACCESS_TOKEN &&
    env.POLAR_WEBHOOK_SECRET &&
    (env.POLAR_PRO_PRODUCT_ID ||
      env.POLAR_BUSINESS_PRODUCT_ID ||
      env.POLAR_PRO_YEARLY_PRODUCT_ID ||
      env.POLAR_BUSINESS_YEARLY_PRODUCT_ID),
);
```

`POLAR_SERVER` defaults to `sandbox`. An invalid value (anything other than `sandbox` or `production`) fails `envSchema.parse(process.env)` at process start, satisfying Requirement 2.3.

`.env.example` adds:

```
# Polar (https://docs.polar.sh)
# Create products in the Polar dashboard, copy their product IDs below, and
# configure a webhook endpoint pointing to {NEXT_PUBLIC_APP_URL}/api/billing/polar/webhook.
# POLAR_SERVER must be "sandbox" (default) for the sandbox dashboard or
# "production" for live charges.
POLAR_ACCESS_TOKEN=
POLAR_WEBHOOK_SECRET=
POLAR_SERVER=sandbox
POLAR_PRO_PRODUCT_ID=
POLAR_BUSINESS_PRODUCT_ID=
POLAR_PRO_YEARLY_PRODUCT_ID=
POLAR_BUSINESS_YEARLY_PRODUCT_ID=
```

### Checkout route

File: `app/api/account/billing/checkout/route.ts`

Behavioral contract is unchanged; only the provider key flips. Handler shape:

1. Reject if `!isPolarConfigured` → HTTP 503 `{ "error": "Billing is not configured." }`.
2. `requireUser()`. Reject anonymous → HTTP 401.
3. Parse body with the existing `checkoutBodySchema` (`plan ∈ {"pro","business"}`, `interval ∈ {"monthly","yearly"}`, optional `returnTo`). Reject invalid → HTTP 400.
4. Sanitize `returnTo` with the existing `sanitizeReturnTo` helper.
5. Look up `getAccountSubscription(user.id)`. If `(status === "active" || status === "past_due") && plan === existing.plan` → HTTP 409.
6. Resolve `origin` via the existing `resolveAppOrigin()` helper.
7. Compose `successUrl = ${origin}/account/billing/checkout` (with sanitized `returnTo`) and `cancelUrl = ${origin}/pricing`.
8. Call `getBillingProvider("polar").createCheckoutSession({ plan, interval, userId, userEmail, successUrl, cancelUrl })`.
9. On `{ type: "redirect", url }` → return `{ checkoutUrl: url }`.
10. On `{ type: "error", message }` → HTTP 503 if message matches `/no polar product configured/i`, else HTTP 502.

The only diffs from the current Dodo implementation are the `isPolarConfigured` gate, the `getBillingProvider("polar")` call, and the regex used for the configuration-error case.

### Customer portal route

File: `app/api/billing/polar/customer-portal/route.ts`

```ts
import { NextResponse } from "next/server";
import { CustomerPortal } from "@polar-sh/nextjs";

import { requireUser } from "@/lib/auth/session";
import { getAccountSubscription } from "@/lib/billing/subscription-service";
import { env, isPolarConfigured } from "@/lib/env";

const portalHandler = CustomerPortal({
  accessToken: env.POLAR_ACCESS_TOKEN ?? "",
  server: env.POLAR_SERVER,
  getCustomerId: async (request) => {
    const customerId = request.headers.get("x-polar-customer-id");
    if (!customerId) throw new Error("Customer id missing");
    return customerId;
  },
});

export async function GET(request: Request): Promise<Response> {
  if (!isPolarConfigured) {
    return NextResponse.json(
      { error: "Billing is not configured." },
      { status: 503 },
    );
  }

  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const subscription = await getAccountSubscription(user.id);
  if (!subscription?.providerCustomerId) {
    return NextResponse.json(
      { error: "No billing account found. Subscribe to a plan first." },
      { status: 404 },
    );
  }

  const headers = new Headers(request.headers);
  headers.set("x-polar-customer-id", subscription.providerCustomerId);
  return portalHandler(new Request(request.url, { method: "GET", headers }));
}
```

The `getCustomerId` callback reads from a request header we set after authentication, so the Polar adapter never sees the raw user session and the handler stays scoped to the authenticated user's customer id.

UI counterpart: `features/billing/` already only renders a portal link when a subscription row exists. The link target updates from `/api/billing/dodo/customer-portal` to `/api/billing/polar/customer-portal`, and the rendering predicate becomes "user has `account_subscriptions` row with non-null `providerCustomerId`" so users without a billing relationship cannot trigger the HTTP 404 path (Requirement 4.6).

### Webhook route

File: `app/api/billing/polar/webhook/route.ts`

```ts
import "server-only";
import { Webhooks } from "@polar-sh/nextjs";
import { env } from "@/lib/env";
// ...other imports

export const POST = Webhooks({
  webhookSecret: env.POLAR_WEBHOOK_SECRET ?? "",
  onSubscriptionCreated: handleSubscriptionActivated,
  onSubscriptionActive: handleSubscriptionActivated,
  onSubscriptionUpdated: handleSubscriptionUpdated,
  onSubscriptionCanceled: handleSubscriptionCanceled,
  onSubscriptionUncanceled: handleSubscriptionUncanceled,
  onSubscriptionRevoked: handleSubscriptionRevoked,
  onOrderPaid: handleOrderPaid,
  onOrderUpdated: handleOrderUpdated,
  onOrderRefunded: handleOrderRefunded,
  onRefundCreated: handleRefundCreated,
  onRefundUpdated: handleRefundUpdated,
  onPayload: handleUnhandledPayload,
});
```

Each handler wraps its body in a shared `withIdempotency` helper — semantically identical to the existing Dodo helper, with the Polar-specific `providerEventId` derivation. See [Event id derivation](#event-id-derivation) below.

### `withIdempotency` shape

```ts
async function withIdempotency<TPayload>(
  payload: TPayload,
  eventType: string,
  resolveIds: (p: TPayload) => { providerEventId: string; userId: string | null },
  handler: (userId: string, eventId: string) => Promise<void>,
): Promise<void>;
```

Steps inside `withIdempotency`:

1. `resolveIds(payload)` produces `{ providerEventId, userId }`. `userId` is resolved from `customer.external_id` first, then `account_subscriptions.providerCustomerId` / `providerSubscriptionId`, then `metadata.userId` (Requirement 11.3, 11.5).
2. `recordWebhookEvent({ providerEventId, provider: "polar", eventType, userId, payload })`. If `isNew === false`, return early (Requirement 6.2).
3. If `userId === null`, `markEventFailed(eventId, "User not found")` and return (Requirement 11.4).
4. Call `handler(userId, eventId)`. On success, `markEventProcessed(eventId)`. On error, `markEventFailed(eventId, message)` and re-throw so Polar receives a 5xx and retries (Requirement 5.5, 6.4).

### Event id derivation

`providerEventId` must be unique per logical event so retries deduplicate but distinct events do not collide. Composition rule:

```
providerEventId = `${eventType}:${stableId}`
```

Where `stableId` is, in order of preference:

1. `payload.id` — Polar's top-level event id present on Standard-Webhooks payloads.
2. `payload.data.id` — the underlying object id (subscription id, order id, refund id).
3. `crypto.randomUUID()` — last-resort fallback for events with no id (extremely rare; logged as a warning).

The `${eventType}:` prefix is deliberate. The same Polar object (e.g. one subscription) can fire many events over its lifetime — `subscription.created`, `subscription.active`, `subscription.updated`, `subscription.canceled` — and each must process exactly once. A subscription-id-only key would collapse all of them into one row. This matches the existing Dodo design and Requirement 6.1.

### Subscription event handlers

Polar subscription events that mutate Requo state, mapped to `subscription-service` calls:

| Polar event | Polar status field | Handler call | Requo subscription status |
| --- | --- | --- | --- |
| `subscription.created` | `active` | `activateSubscription({ status: "active" })` | `active` |
| `subscription.active` | `active` | `activateSubscription({ status: "active" })` | `active` |
| `subscription.updated` | `active` | `activateSubscription({ status: "active" })` | `active` |
| `subscription.updated` | `past_due` | `updateSubscriptionStatus("past_due")` | `past_due` |
| `subscription.updated` | `canceled` and `current_period_end > now` | `updateSubscriptionStatus("canceled", { canceledAt, currentPeriodEnd })` | `canceled` |
| `subscription.updated` | `canceled` and `current_period_end <= now` | `expireSubscription` | `expired` |
| `subscription.updated` | `revoked` / `unpaid` / `incomplete_expired` | `expireSubscription` | `expired` |
| `subscription.updated` | `incomplete` / `trialing` | `updateSubscriptionStatus("incomplete")` | `incomplete` |
| `subscription.canceled` | (any) | `updateSubscriptionStatus("canceled", { canceledAt: event.canceled_at, currentPeriodEnd })` | `canceled` |
| `subscription.uncanceled` | `active` | `activateSubscription({ status: "active", canceledAt: null })` (clears `canceledAt`) | `active` |
| `subscription.revoked` | (any) | `expireSubscription` | `expired` |

Plan resolution: every handler that calls `activateSubscription` first looks up the Polar product id on the event payload and runs `reversePolarProductId(productId, productIds)` to recover `(plan, interval)`. If no mapping exists, the handler throws so the event is marked `failed` and Polar retries (Requirement 7.7); operator action is required to update env vars.

Period boundaries are read from `data.current_period_start` and `data.current_period_end` on the Polar payload. Polar emits these as ISO timestamps; the handler parses them with `new Date(...)`.

Customer id is read from `data.customer.id` (Polar customer id) and stored on `account_subscriptions.providerCustomerId`. Subscription id is read from `data.id` and stored on `providerSubscriptionId`.

### Order event handlers

| Polar event | Polar order status | Handler call |
| --- | --- | --- |
| `order.paid` | `paid` | `recordPaymentAttempt({ status: "succeeded", amount: data.amount, currency: data.currency, providerPaymentId: data.id })` |
| `order.updated` | `failed` (or `refunded` and previously paid) | `recordPaymentAttempt({ status: "failed", ... })` only when transitioning into `failed`; refunded transitions are handled by refund events |
| `order.refunded` | (any) | No-op for `payment_attempts`; refund events own the refund lifecycle |

Order events do not mutate subscription state. Subscription state is owned exclusively by `subscription.*` events (Requirement 8.5).

When an order event has no resolvable Requo user, the handler still records a `payment_attempts` row with `userId = null` and marks the `billing_events` row `failed` so an operator can reconcile (Requirement 8.4). `payment_attempts.userId` is already nullable in the schema (`onDelete: "set null"`).

### Refund event handlers

Polar refunds carry an `id` (refund id), an `order_id` (the source order), a `status` (`pending` | `succeeded` | `failed`), an `amount`, and a `currency`. They map onto our `refunds` rows where `providerPaymentId` stores the source order id and `providerRefundId` stores the Polar refund id.

| Polar event | Polar refund status | Action |
| --- | --- | --- |
| `refund.created` | `pending` | Upsert refund row: lookup by `providerRefundId`, fall back to `providerPaymentId` (matching the most recent `pending` row), insert if neither matches. Status: `pending`. |
| `refund.created` | `succeeded` | Same upsert. Status: `approved`. Call `applyApprovedRefundSideEffects(userId)`. |
| `refund.created` | `failed` | Same upsert. Status: `failed`. |
| `refund.updated` | `succeeded` | Same upsert. Status: `approved`. Call `applyApprovedRefundSideEffects(userId)`. |
| `refund.updated` | `failed` | Same upsert. Status: `failed`. |
| `order.refunded` | n/a | Treated as a redundant signal; recorded in `billing_events` with status `ignored`. The refund lifecycle is owned by `refund.*` events. |

The upsert preserves the existing `requestRefundForPayment` behavior: when a self-serve refund is requested, `requestRefundForPayment` inserts a `pending` row keyed by the Polar refund id returned synchronously. The webhook then matches that row by `providerRefundId` and flips it to `approved`/`failed`. When a refund originates outside the app (Polar dashboard refund), no `pending` row exists yet, so the handler inserts one keyed by `providerPaymentId` and goes straight to `approved` or `failed`.

Status mapping (Polar → Requo `refund_status` enum):

| Polar | Requo |
| --- | --- |
| `pending` | `pending` |
| `succeeded` | `approved` |
| `failed` | `failed` |

If a refund event has no resolvable Requo user, the handler marks the `billing_events` row `failed` (Requirement 9.4).

### Self-serve refund flow

Unchanged at the API layer. `lib/billing/refunds.ts` already calls `getBillingProvider(payment.provider)` and `provider.requestRefund(providerPaymentId, reason)`. The `payment.provider` value will be `"polar"` for any Polar payment, so the refund service automatically routes through `PolarProvider.requestRefund`. No changes to `requestRefundForPayment`, `checkRefundEligibility`, or `applyApprovedRefundSideEffects`.

### Identity resolution strategy

The webhook route resolves `userId` for every event via this fallback chain:

1. **`customer.external_id`** — preferred. We always set `external_id = user.id` at checkout-session creation, so any event whose payload includes a `customer` object resolves directly. Lookup: `external_id` is the Requo `user.id` itself; no DB query needed.
2. **`account_subscriptions.providerCustomerId`** — backup for events that include `customer.id` but not `customer.external_id` (older sessions, legacy data).
3. **`account_subscriptions.providerSubscriptionId`** — backup for events that include only `subscription_id`.
4. **`metadata.userId`** — tertiary fallback for subscription and order events created from older checkout sessions before `external_id` propagation completes (Requirement 11.5).

If all four fail, the handler records the event in `billing_events` with `userId = null` and status `failed`, so the issue is visible for operator follow-up (Requirement 11.4). The raw payload is always persisted in `billing_events.payload`.

Resolution helper sketch:

```ts
async function resolvePolarUserId(payload: PolarEventPayload): Promise<string | null> {
  const externalId = payload.data?.customer?.external_id ?? null;
  if (externalId) return externalId;

  const customerId = payload.data?.customer?.id ?? null;
  if (customerId) {
    const [row] = await db
      .select({ userId: accountSubscriptions.userId })
      .from(accountSubscriptions)
      .where(eq(accountSubscriptions.providerCustomerId, customerId))
      .limit(1);
    if (row) return row.userId;
  }

  const subId = payload.data?.subscription_id ?? payload.data?.id;
  if (subId && eventTypeIsSubscription(payload.type)) {
    const [row] = await db
      .select({ userId: accountSubscriptions.userId })
      .from(accountSubscriptions)
      .where(eq(accountSubscriptions.providerSubscriptionId, subId))
      .limit(1);
    if (row) return row.userId;
  }

  const metadataUserId = payload.data?.metadata?.userId ?? null;
  if (typeof metadataUserId === "string" && metadataUserId.length > 0) return metadataUserId;

  return null;
}
```

## Data Models

### Schema changes

The slice changes one schema constant. No table shape changes.

`lib/db/schema/subscriptions.ts`:

```ts
// Before
export const billingProviders = ["dodo"] as const;

// After
export const billingProviders = ["polar"] as const;
```

The Drizzle migration generated from this change rewrites the Postgres `billing_provider` enum.

### Drizzle migration strategy

Postgres does not allow rewriting an enum value in place with an open transaction when columns reference the enum. Drizzle's default `ALTER TYPE ... RENAME VALUE` is the simplest path *only* if we kept the same value name; we are changing it. So we generate an explicit migration that:

1. Creates a new enum type `billing_provider_new` containing only `'polar'`.
2. Drops default constraints on every column using `billing_provider`. Affected columns: `account_subscriptions.billing_provider`, `billing_events.provider`, `payment_attempts.provider`, `refunds.provider`.
3. `ALTER COLUMN ... TYPE billing_provider_new USING 'polar'::billing_provider_new` for each of the four columns. This is safe because Requo has zero paying users on Dodo — every existing row with `'dodo'` is non-production seed data and is acceptable to coerce. We will additionally truncate `billing_events`, `payment_attempts`, `refunds`, and `account_subscriptions` rows in a pre-migration step on environments where they are non-empty (development / preview only). Production has no rows.
4. Drops the old `billing_provider` enum.
5. Renames `billing_provider_new` to `billing_provider`.

Migration filename: `drizzle/0002_polar_billing_migration.sql` (next sequence after `0001_dodo_payments_migration.sql`).

Manual SQL sketch:

```sql
-- 0002_polar_billing_migration.sql

-- Optional safety net for non-production environments where dodo rows may exist.
DELETE FROM refunds;
DELETE FROM payment_attempts;
DELETE FROM billing_events;
DELETE FROM account_subscriptions;

CREATE TYPE billing_provider_new AS ENUM ('polar');

ALTER TABLE account_subscriptions
  ALTER COLUMN billing_provider TYPE billing_provider_new
  USING 'polar'::billing_provider_new;

ALTER TABLE billing_events
  ALTER COLUMN provider TYPE billing_provider_new
  USING 'polar'::billing_provider_new;

ALTER TABLE payment_attempts
  ALTER COLUMN provider TYPE billing_provider_new
  USING 'polar'::billing_provider_new;

ALTER TABLE refunds
  ALTER COLUMN provider TYPE billing_provider_new
  USING 'polar'::billing_provider_new;

DROP TYPE billing_provider;
ALTER TYPE billing_provider_new RENAME TO billing_provider;
```

The `DELETE FROM ...` block is intentionally listed first because the requirements explicitly state Requo has zero paying users on Dodo. If discovery during implementation reveals any production rows, the migration must be paused and the rows moved or cleaned up first; the migration is not safe with arbitrary `dodo` data.

### `billing_provider` enum semantics post-migration

After migration, the only legal value for every `billing_provider`-typed column is `'polar'`. The TypeScript `BillingProvider` type narrows to `"polar"`. The factory's `switch (provider)` exhaustiveness check produces a compile error if any caller passes another value.

### No other schema changes

`account_subscriptions`, `billing_events`, `payment_attempts`, and `refunds` table shapes are untouched. All Polar-specific identifiers (customer id, subscription id, order id, refund id) fit existing columns:

- Polar customer id → `account_subscriptions.providerCustomerId`
- Polar subscription id → `account_subscriptions.providerSubscriptionId`
- Polar checkout session id → `account_subscriptions.providerCheckoutId`
- Polar order id → `payment_attempts.providerPaymentId`, `refunds.providerPaymentId`
- Polar refund id → `refunds.providerRefundId`
- Polar webhook event composite id → `billing_events.providerEventId` (unique)

### Dodo removal plan

The same slice removes:

| Path | Action |
| --- | --- |
| `lib/billing/providers/dodo.ts` | Delete |
| `lib/billing/providers/index.ts` (Dodo branch) | Replace with Polar branch |
| `app/api/billing/dodo/customer-portal/route.ts` | Delete |
| `app/api/billing/dodo/webhook/route.ts` | Delete |
| `app/api/billing/dodo/` directory | Delete |
| `lib/env.ts` `DODO_*` entries and `isDodoConfigured` | Remove. Add `POLAR_*` and `isPolarConfigured`. |
| `lib/billing/index.ts` `export { isDodoConfigured }` | Replace with `export { isPolarConfigured }` |
| `.env.example` `DODO_*` block | Replace with Polar block |
| `docs/setup/` references to Dodo | Replace with Polar (file-level rewrite where Dodo is the only payment topic) |
| `package.json` `dodopayments`, `@dodopayments/nextjs` | Remove |
| `package.json` `@polar-sh/nextjs`, `@polar-sh/sdk` | Add |
| `AGENTS.md` Paddle / Dodo references in the billing section | Update to Polar |

Property-based search confirms no other module imports `@dodopayments/*` or references `DODO_` env vars outside the paths listed above. Any later integration tests or fixtures referencing the literal `"dodo"` string are updated alongside the code.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The properties below are derived from the prework analysis and consolidated to eliminate redundancy. Each property is universally quantified and references the requirements it validates. Each property maps to a single property-based test in `tests/unit/`, configured to run ≥100 iterations with `fast-check`, and tagged `// Feature: polar-billing-integration, Property {N}: {text}`.

Acceptance criteria classified as `EXAMPLE`, `EDGE_CASE`, `INTEGRATION`, or `SMOKE` in the prework are not represented here; they are covered by example-based unit tests, integration tests, or one-shot configuration checks.

### Property 1: Product id round-trip

*For any* `(plan, interval)` pair where `plan ∈ {"pro","business"}` and `interval ∈ {"monthly","yearly"}`, and *for any* `PolarProductIdMap` whose entry for that pair is a non-empty string, `reversePolarProductId(productIdMap[(plan, interval)], productIdMap)` returns exactly `{ plan, interval }`. Conversely, for any product id not present in the map, `reversePolarProductId` returns `undefined`.

**Validates: Requirements 3.4, 7.7**

### Property 2: Polar status mapping is total and deterministic

*For any* Polar subscription status string drawn from Polar's documented set (`active`, `past_due`, `canceled`, `revoked`, `unpaid`, `incomplete`, `incomplete_expired`, `trialing`), *for any* `current_period_end` timestamp, and *for any* `now` timestamp, the mapping function returns one of Requo's `SubscriptionStatus` values matching the table in [Subscription event handlers](#subscription-event-handlers). The function is total (returns a value for every legal Polar status), deterministic (same inputs produce same output), and never returns `"free"` (the free status is reserved for the absence of a subscription row).

**Validates: Requirements 7.2**

### Property 3: providerEventId composition

*For any* verified Polar webhook payload, the derived `providerEventId` equals `` `${eventType}:${id}` `` where `id` is selected by the priority `payload.id > payload.data.id > randomUuid()` and `eventType` is the Polar event type string. *For any* two payloads with different `eventType` values, the derived `providerEventId` values differ. *For any* two retries of the same logical event (same `eventType` and same available id), the derived `providerEventId` values are identical.

**Validates: Requirements 6.1**

### Property 4: Webhook idempotency

*For any* sequence of N ≥ 1 deliveries of the same verified Polar webhook event, after all deliveries the database state of `account_subscriptions`, `billing_events`, `payment_attempts`, and `refunds` is identical to the state produced by processing the event exactly once, the `billing_events` row for that event has `status = "processed"` with a non-null `processedAt`, and `billing_events.payload` deep-equals the raw event data.

**Validates: Requirements 5.3, 6.2, 6.4, 6.5**

### Property 5: Identity resolution priority

*For any* Polar webhook payload containing zero or more of `customer.external_id`, `customer.id`, `subscription_id` (or `data.id` for subscription events), and `metadata.userId`, the resolver `resolvePolarUserId` returns the `user.id` matching the highest-priority non-empty source under the order `customer.external_id > providerCustomerId lookup > providerSubscriptionId lookup > metadata.userId`. When multiple sources are present and resolve to different users, the highest-priority source wins.

**Validates: Requirements 8.3, 11.2, 11.3, 11.5**

### Property 6: Unresolvable identity is recorded as failed

*For any* verified Polar webhook payload where every identity source is either absent or fails to resolve to an existing Requo user, after processing there exists exactly one `billing_events` row for the event with `userId = null` and `status = "failed"`, and no rows are inserted into `account_subscriptions`. For order events, a `payment_attempts` row may still be inserted with `userId = null`; for refund events, no `refunds` row is inserted.

**Validates: Requirements 8.4, 9.4, 11.4**

### Property 7: Provider methods never throw

*For any* `PolarProviderConfig` (including configurations with missing or empty `accessToken`, `webhookSecret`, or any subset of product ids), *for any* method (`createCheckoutSession`, `cancelSubscription`, `requestRefund`), *for any* valid input parameters, and *for any* failure mode of the underlying Polar SDK client (thrown `Error`, network rejection, malformed response), the method resolves to a structured result of the documented shape (`CheckoutSessionResult`, `CancelSubscriptionResult`, `RefundResult`) and never throws.

**Validates: Requirements 1.3, 1.4, 1.5**

### Property 8: isPolarConfigured is a pure conjunction

*For any* env-shaped object with independently-present-or-absent values for `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_PRO_PRODUCT_ID`, `POLAR_PRO_YEARLY_PRODUCT_ID`, `POLAR_BUSINESS_PRODUCT_ID`, and `POLAR_BUSINESS_YEARLY_PRODUCT_ID`, the value of `isPolarConfigured` equals `Boolean(accessToken) && Boolean(webhookSecret) && (Boolean(proMonthly) || Boolean(proYearly) || Boolean(businessMonthly) || Boolean(businessYearly))`.

**Validates: Requirements 2.5**

### Property 9: Checkout session carries external_id and metadata

*For any* `userId` (non-empty string), *for any* `(plan, interval)` pair with a configured product id, and *for any* `userEmail`, `successUrl`, `cancelUrl`, the parameters passed to the Polar checkout-session API include `externalCustomerId === userId` and `metadata === { userId, plan, interval }`. The product id passed equals `productIds[planKey(plan, interval)]`.

**Validates: Requirements 3.2, 11.1**

### Property 10: Order events do not mutate subscription status

*For any* `account_subscriptions` row in any state, *for any* verified Polar order event (`order.paid`, `order.updated`, `order.refunded`) for that user, after the webhook handler runs the `account_subscriptions.status`, `plan`, `currentPeriodStart`, `currentPeriodEnd`, and `canceledAt` columns are unchanged compared to before. Any state changes for that user must come exclusively from `subscription.*` events.

**Validates: Requirements 8.5**

### Property 11: Self-serve refund insert iff provider success

*For any* eligible payment attempt (passing `checkRefundEligibility`), *for any* refund reason (≤500 chars), and *for any* outcome of `PolarProvider.requestRefund`, the result of `requestRefundForPayment` satisfies: `result.ok === true` iff the provider returned `{ type: "ok", refundId, status: "pending" }`; a `refunds` row exists with `status = "pending"`, `provider = "polar"`, `providerRefundId = refundId`, `providerPaymentId`, `amount`, and `currency` matching the source payment iff `result.ok === true`; and `result.reason === "provider_error"` with no inserted row iff the provider returned `{ type: "error" }`.

**Validates: Requirements 10.2, 10.3**

## Error Handling

### Provider-layer errors

`PolarProvider` methods never throw. Each catches Polar SDK errors and network errors and returns `{ type: "error", message }`. The route handlers and `refunds.ts` already pattern-match on `result.type` and surface user-facing messages, so no changes are needed at the call sites.

### Webhook handler errors

Inside `withIdempotency`:

- A duplicate `providerEventId` short-circuits and returns 200 to Polar (Standard-Webhooks idempotency).
- An unresolved `userId` is recorded as `failed` on the `billing_events` row. The handler returns to the adapter without throwing, so Polar still sees 200 and does not retry — the failure is logged for operator follow-up (Requirement 11.4). This intentionally differs from "handler threw" semantics: a missing user is a data problem, not a transient error, and retries will not fix it.
- Any other thrown error inside the handler body marks the event `failed` with the error message and re-throws so the adapter returns 5xx and Polar retries (Requirement 5.5).

### Configuration errors

When `isPolarConfigured` is false (any of access token, webhook secret, or all four product ids missing), every Polar route returns HTTP 503 with `{ "error": "Billing is not configured." }`. The provider's checkout method also returns a structured config error if a specific `(plan, interval)` is unmapped while the rest of Polar is configured; the checkout route maps that to 503 too.

### Schema migration errors

The Drizzle migration is non-resumable. If it fails partway, recovery is to drop `billing_provider_new` (if it was created) and re-run. Because the migration runs in a single transaction by default in Drizzle's runner, partial application is not expected. Production has no `dodo` data, so the worst case in production is a transient migration error that fully rolls back.

## Testing Strategy

### Test layers

| Layer | Tool | Scope |
| --- | --- | --- |
| Unit (logic) | Vitest (`tests/unit/`) | `reversePolarProductId`, status mapping table, identity resolution helper, `providerEventId` derivation. |
| Unit (property) | Vitest + `fast-check` (`tests/unit/`) | Universal properties listed below. Each property test runs ≥100 iterations. |
| Integration | Vitest + DB (`tests/integration/`) | End-to-end webhook handler runs against a real Postgres test DB: signed webhook payloads → `account_subscriptions` / `billing_events` / `payment_attempts` / `refunds` mutations. |
| E2E smoke | Playwright | Sign in, see pricing, click upgrade, redirect to mocked Polar checkout URL, return-to-app on success. No live Polar calls. |

### What property-based tests cover

Polar billing has several pure-logic seams that benefit from property-based testing:

- `(plan, interval) ↔ productId` round-trip via `reversePolarProductId`.
- Polar status string → Requo `SubscriptionStatus` mapping.
- `providerEventId` composition produces distinct ids for distinct events and identical ids for retries of the same event.
- Identity resolution returns the same Requo `user.id` regardless of which path resolves first when multiple inputs are present.

The actual property statements appear in the Correctness Properties section below.

### What property-based tests do NOT cover

Polar SDK calls and webhook signature verification are owned by `@polar-sh/sdk` and `@polar-sh/nextjs` respectively. We do not re-test those. Integration tests cover wiring (route handler → service) but use 1–3 representative payloads per event type, not 100 iterations, because the variation that matters (status mapping, id derivation) is covered at the unit/property layer.

The Drizzle migration is a one-shot SQL script; it is verified by running `npm run db:migrate` against the test DB during `npm run test:integration` and is not amenable to property-based testing.

UI rendering (the customer portal link, the upgrade buttons) uses snapshot- and intent-style component tests where they already exist, not new property tests.

### Property test configuration

- Library: `fast-check` (already common in the JavaScript ecosystem; not yet a project dependency, will be added with this slice).
- Iterations: ≥100 per property (`fc.assert(prop, { numRuns: 100 })`).
- Tag format on each test: `// Feature: polar-billing-integration, Property {N}: {property text}`.
- Each property test maps to exactly one numbered property in the Correctness Properties section, referenced by the `Validates: Requirements X.Y` annotation on that property.

### Integration test surface

DB-backed integration tests cover one happy path per event family plus the explicit failure modes:

- `subscription.created` → `account_subscriptions` row is `active`, `businesses.plan` matches.
- `subscription.updated` with `canceled` and future period end → `canceled` status, `businesses.plan` unchanged until period rolls over.
- `subscription.revoked` → `expired` status, `businesses.plan = "free"` for all owned businesses.
- `order.paid` → `payment_attempts` row inserted with `succeeded`.
- `refund.updated` with `succeeded` → existing `pending` refund row flips to `approved`, subscription is canceled at period end.
- Duplicate webhook delivery (same `providerEventId`) → second delivery is a no-op.
- Webhook for unknown user → `billing_events` row recorded with `userId = null`, status `failed`, no other side effects.

These follow the existing patterns in `tests/integration/` for the Dodo handler, so the directory layout and helpers already exist.

### Verification commands (per AGENTS.md)

- `npm run check`
- `npm run test`
- `npm run test:integration` (mandatory: this slice changes route handlers and DB writes)
- `npm run build`
- `npm run test:e2e:smoke`
