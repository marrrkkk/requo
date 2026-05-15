# Requirements Document

## Introduction

Migrate Requo's billing system from Paddle to Dodo Payments. This involves completely removing Paddle from the codebase, resetting the database to a clean state, and implementing Dodo Payments as the new billing provider using hosted checkout only. The system supports SaaS subscriptions (free/pro/business plans) with USD base pricing and Dodo Adaptive Currency for Philippines users (PHP display at checkout). The architecture must be provider-agnostic to allow future billing provider additions.

**Reference Documentation:** All Dodo Payments integration work SHALL use the official documentation at https://docs.dodopayments.com/ as the authoritative source for API endpoints, webhook event schemas, SDK usage, checkout session creation, subscription lifecycle, refund operations, and Adaptive Currency behavior.

## Glossary

- **Billing_Provider_Interface**: An abstraction layer defining the contract that any billing provider implementation must satisfy, enabling future provider additions without modifying consuming code.
- **Dodo_Client**: The server-side client module that communicates with the Dodo Payments API for checkout session creation, subscription management, and refund operations.
- **Checkout_Session_Service**: The API endpoint that creates a Dodo Payments hosted checkout session and returns the redirect URL to the client.
- **Webhook_Processor**: The idempotent event handler that receives Dodo Payments webhook events, deduplicates them via `billing_events`, and dispatches subscription state mutations.
- **Subscription_Service**: The single write path (`lib/billing/subscription-service.ts`) for all subscription mutations, responsible for keeping `account_subscriptions` and the denormalized `businesses.plan` column in sync.
- **Feature_Gate**: Helper functions that resolve the current user's effective plan and determine access to plan-gated features based on internal subscription state.
- **Adaptive_Currency**: Dodo Payments' feature that displays the equivalent local currency amount (PHP) at checkout while the product's base price remains in USD.
- **Account_Subscription**: The single `account_subscriptions` row per user that represents the authoritative billing state. All businesses owned by the user inherit this plan.
- **Billing_Event**: A row in the `billing_events` table recording a webhook event for idempotency. Duplicate `providerEventId` values are skipped.
- **Refund_Service**: The module that handles refund eligibility checks, initiates refunds through the Dodo Payments API, and tracks refund status.
- **Database_Reset_Script**: A script that drops existing billing tables, recreates the schema with updated enums and columns, and reseeds the database with fresh data containing no Paddle references.

## Requirements

### Requirement 1: Remove Paddle from Codebase

**User Story:** As a developer, I want all Paddle-specific code, configuration, and references removed from the codebase, so that the project has no dead code or dependencies from the previous billing provider.

#### Acceptance Criteria

1. WHEN the migration is complete, THE Codebase SHALL contain no imports, references, or dependencies on the Paddle SDK or Paddle API client, verified by zero matches for "paddle" (case-insensitive) in source files excluding documentation and migration history.
2. WHEN the migration is complete, THE Codebase SHALL contain no Paddle-specific environment variables (PADDLE_API_KEY, PADDLE_WEBHOOK_SECRET, PADDLE_PRO_PRICE_ID, PADDLE_PRO_YEARLY_PRICE_ID, PADDLE_BUSINESS_PRICE_ID, PADDLE_BUSINESS_YEARLY_PRICE_ID, PADDLE_ENVIRONMENT, NEXT_PUBLIC_PADDLE_CLIENT_TOKEN, NEXT_PUBLIC_PADDLE_ENVIRONMENT) in the env schema, .env.example, or any configuration file.
3. WHEN the migration is complete, THE Codebase SHALL contain no Paddle webhook route handler at `app/api/billing/paddle/webhook/route.ts` and the `app/api/billing/paddle/` directory SHALL be deleted.
4. WHEN the migration is complete, THE Codebase SHALL contain no Paddle checkout overlay or inline checkout components, defined as any component importing from `@paddle/paddle-js` or rendering Paddle-specific checkout UI elements.
5. WHEN the migration is complete, THE Codebase SHALL contain no Paddle-specific refund logic (adjustment creation, adjustment status mapping), including the removal of Paddle-specific code in `lib/billing/refunds.ts` and `lib/billing/providers/paddle.ts`.
6. WHEN the migration is complete, THE Codebase SHALL contain no Paddle-specific test files or test fixtures, verified by zero test files containing Paddle imports or Paddle mock data.
7. WHEN the migration is complete, THE Env_Schema SHALL validate only Dodo Payments environment variables (DODO_API_KEY, DODO_WEBHOOK_SECRET, DODO_ENVIRONMENT, DODO_PRO_PRODUCT_ID, DODO_BUSINESS_PRODUCT_ID, DODO_PRO_YEARLY_PRODUCT_ID, DODO_BUSINESS_YEARLY_PRODUCT_ID) for billing configuration, and SHALL export `isDodoConfigured` instead of `isPaddleConfigured`.
8. WHEN the migration is complete, THE Codebase SHALL have no Paddle-related package listed in package.json dependencies or devDependencies, and the `publicEnv` export SHALL contain no Paddle client tokens.
9. WHEN the migration is complete, THE Codebase SHALL pass the TypeScript type check (`npm run typecheck`) and production build (`npm run build`) with zero errors related to missing Paddle modules or references.

### Requirement 2: Database Reset and Schema Migration

**User Story:** As a developer, I want the database wiped and recreated with a fresh schema that supports Dodo Payments, so that no Paddle-era data or enum values remain.

#### Acceptance Criteria

1. WHEN the database reset script executes, THE Database_Reset_Script SHALL drop all existing billing-related tables (account_subscriptions, business_subscriptions, billing_events, payment_attempts, refunds).
2. WHEN the database reset script executes, THE Database_Reset_Script SHALL drop and recreate the `billing_provider` enum to contain only the value "dodo", removing "paddle".
3. WHEN the database reset script executes, THE Database_Reset_Script SHALL recreate the `account_subscriptions` table with columns for: plan key (text, one of "pro" or "business"), billing provider (billing_provider enum), billing currency (billing_currency enum), adaptive currency flag (boolean, default false), provider customer ID (text, nullable), provider subscription ID (text, nullable), provider checkout ID (text, nullable), payment method (text, nullable), subscription status (subscription_status enum), current period start (timestamptz, nullable), current period end (timestamptz, nullable), cancellation timestamp (timestamptz, nullable), and audit timestamps (created_at, updated_at as timestamptz with defaults).
4. WHEN the database reset script executes, THE Database_Reset_Script SHALL recreate the `billing_events` table with columns for: provider (billing_provider enum), provider event ID (text, unique), event type (text), user ID (text, nullable FK), processed timestamp (timestamptz, nullable), raw payload (JSONB), processing status (text, one of "processing", "processed", or "failed"), error message (text, nullable), and creation timestamp (timestamptz with default).
5. WHEN the database reset script executes, THE Database_Reset_Script SHALL recreate the `payment_attempts` table with columns for: user ID (text, nullable FK), plan (text), provider (billing_provider enum), provider payment ID (text), amount (integer, in smallest currency unit), currency (billing_currency enum), status (payment_attempt_status enum), and creation timestamp (timestamptz with default).
6. WHEN the database reset script executes, THE Database_Reset_Script SHALL recreate the `refunds` table with columns for: provider (billing_provider enum), provider refund ID (text), provider payment ID (text), user ID (text, FK), amount (integer, in smallest currency unit), currency (billing_currency enum), reason (text, nullable), refund status (refund_status enum), raw payload (JSONB, nullable), and audit timestamps (created_at, updated_at as timestamptz with defaults).
7. WHEN the database reset script executes, THE Database_Reset_Script SHALL drop and recreate the `billing_currency` enum to include both "USD" and "PHP".
8. WHEN the database reset script executes, THE Database_Reset_Script SHALL reseed the database with fresh application data where no billing-related rows reference the value "paddle" in any provider column and no seed data contains Paddle-specific identifiers (e.g., provider IDs prefixed with "txn_", "sub_", "ctc_" from Paddle).
9. WHEN the database reset script completes, THE Database SHALL have the deprecated `business_subscriptions` table removed permanently with no corresponding Drizzle schema export remaining in the codebase.

### Requirement 3: Dodo Payments Environment Configuration

**User Story:** As a developer, I want validated environment variables for Dodo Payments, so that the application can connect to the correct Dodo environment with proper credentials.

#### Acceptance Criteria

1. THE Env_Schema SHALL validate DODO_API_KEY as an optional string that treats empty values as undefined, with a minimum length of 1 character when provided.
2. THE Env_Schema SHALL validate DODO_WEBHOOK_SECRET as an optional string that treats empty values as undefined, with a minimum length of 1 character when provided.
3. THE Env_Schema SHALL validate DODO_ENVIRONMENT as an enum of "test_mode" or "live_mode", treating empty values as undefined, defaulting to "test_mode" when the value is absent or empty.
4. THE Env_Schema SHALL validate DODO_PRO_PRODUCT_ID as an optional string that treats empty values as undefined, with a minimum length of 1 character when provided.
5. THE Env_Schema SHALL validate DODO_BUSINESS_PRODUCT_ID as an optional string that treats empty values as undefined, with a minimum length of 1 character when provided.
6. THE Env_Schema SHALL validate DODO_PRO_YEARLY_PRODUCT_ID as an optional string that treats empty values as undefined, with a minimum length of 1 character when provided.
7. THE Env_Schema SHALL validate DODO_BUSINESS_YEARLY_PRODUCT_ID as an optional string that treats empty values as undefined, with a minimum length of 1 character when provided.
8. THE Env_Schema SHALL validate NEXT_PUBLIC_APP_URL as an optional URL string that treats empty values as undefined, using the same URL validation as other URL fields in the schema.
9. THE Env_Schema SHALL export an `isDodoConfigured` boolean that evaluates to true only when DODO_API_KEY is a non-empty string AND at least one of DODO_PRO_PRODUCT_ID, DODO_BUSINESS_PRODUCT_ID, DODO_PRO_YEARLY_PRODUCT_ID, or DODO_BUSINESS_YEARLY_PRODUCT_ID is a non-empty string.

### Requirement 4: Billing Provider Abstraction

**User Story:** As a developer, I want a clean provider abstraction layer, so that another billing provider can be added in the future without modifying the subscription service or feature-gating logic.

#### Acceptance Criteria

1. THE Billing_Provider_Interface SHALL define a method for creating a hosted checkout session that accepts plan, interval, user ID, user email, and success/cancel URLs, and returns either a redirect URL on success or a structured error containing a user-facing message on failure.
2. THE Billing_Provider_Interface SHALL define a method for canceling a subscription given a provider subscription ID, returning a boolean indicating whether the cancellation request was accepted by the provider.
3. THE Billing_Provider_Interface SHALL define a method for requesting a full refund given a provider payment ID and a reason string of at most 500 characters, returning either a provider-assigned refund identifier and initial status on success, or a structured error containing a user-facing message on failure.
4. THE Billing_Provider_Interface SHALL define a method for verifying webhook signature given a raw body string and a signature header value, returning a boolean.
5. THE Billing_Provider_Interface SHALL define a method for parsing a verified webhook payload into a normalized event structure containing event ID, event type enum (subscription activated, subscription canceled, subscription updated, payment succeeded, payment failed, refund updated), and typed payload data keyed by event type.
6. THE Subscription_Service SHALL consume only the Billing_Provider_Interface, not Dodo-specific types, for provider interactions.
7. THE Dodo_Client SHALL implement the Billing_Provider_Interface using the Dodo Payments API.
8. IF a Billing_Provider_Interface method call fails due to a network or provider error, THEN THE Billing_Provider_Interface implementation SHALL return the structured error result rather than throwing an unhandled exception.

### Requirement 5: Dodo Payments Hosted Checkout

**User Story:** As a user, I want to subscribe to a paid plan through a hosted checkout page, so that I can complete payment securely on Dodo's hosted page and return to the app.

#### Acceptance Criteria

1. WHEN a user selects a plan on the pricing page, THE Checkout_Session_Service SHALL create a Dodo Payments checkout session with the corresponding product ID, user email, and success/cancel redirect URLs.
2. WHEN the checkout session is created successfully, THE Checkout_Session_Service SHALL return the Dodo hosted checkout URL for client-side redirect.
3. IF the checkout session creation fails, THEN THE Checkout_Session_Service SHALL return a structured error containing a user-facing message indicating the failure reason, and SHALL NOT redirect the user away from the pricing page.
4. THE Checkout_Session_Service SHALL pass the user's account ID as metadata in the checkout session for webhook correlation.
5. THE Checkout_Session_Service SHALL use only hosted checkout (external redirect). The system SHALL NOT use inline or overlay checkout modes.
6. WHEN the user returns to the success URL before the webhook arrives, THE Success_Page SHALL display a "processing payment" state and poll for subscription activation at intervals of no more than 3 seconds, for a maximum duration of 60 seconds.
7. IF the polling duration exceeds 60 seconds without webhook confirmation, THEN THE Success_Page SHALL display a message indicating that payment is still being processed and instruct the user to check their account billing page later.
8. WHEN the webhook confirms payment, THE Success_Page SHALL transition to a confirmed state showing the active plan.
9. WHEN the user returns to the cancel URL from the Dodo hosted checkout page, THE System SHALL redirect the user back to the pricing page without creating or modifying any subscription record.
10. IF the user already has an active subscription for the selected plan, THEN THE Checkout_Session_Service SHALL return an error indicating the user is already subscribed to that plan, and SHALL NOT create a new checkout session.

### Requirement 6: Dodo Adaptive Currency for Philippines

**User Story:** As a Philippines-based user, I want to see approximate PHP pricing on the marketing page and pay in PHP at checkout when available, so that I understand the cost in my local currency.

#### Acceptance Criteria

1. THE Pricing_UI SHALL display USD as the primary price for all plans.
2. WHEN the user's detected region is Philippines, THE Pricing_UI SHALL display an approximate PHP equivalent below the USD price using a server-side exchange rate that is no more than 24 hours stale, with the disclaimer text: "Approx. ₱X/month. Final PHP amount shown at checkout."
3. IF the exchange rate source is unavailable or returns an error, THEN THE Pricing_UI SHALL display USD pricing only without a PHP approximation.
4. THE System SHALL NOT create separate PHP-priced products in Dodo Payments. USD remains the base product currency.
5. THE System SHALL rely on Dodo Adaptive Currency to present PHP at checkout when available for the user's payment method and region. IF Adaptive Currency is not available for the user's payment method or region, THEN the checkout SHALL proceed in USD without error.
6. WHEN a subscription webhook event includes a billing currency of "PHP", THE Subscription_Service SHALL store the billing currency as "PHP" and set the adaptive currency flag to true on the Account_Subscription row.
7. WHEN a subscription is activated via Adaptive Currency, THE Feature_Gate SHALL grant the same plan access as a USD subscription for the same product.
8. THE System SHALL NOT hard-code specific payment methods (GCash, Maya, or others) as available or unavailable. Payment method availability is determined by Dodo Payments at checkout time.

### Requirement 7: Webhook Event Processing

**User Story:** As a system operator, I want all Dodo Payments webhook events processed idempotently, so that retries and duplicate deliveries do not corrupt subscription state.

#### Acceptance Criteria

1. WHEN a webhook request arrives, THE Webhook_Processor SHALL verify the request signature using DODO_WEBHOOK_SECRET before processing.
2. IF the webhook signature verification fails, THEN THE Webhook_Processor SHALL return HTTP 401 and log the rejection without processing the event.
3. WHEN a verified event is received, THE Webhook_Processor SHALL check `billing_events` for a matching `providerEventId`. IF a match exists, THEN THE Webhook_Processor SHALL return HTTP 200 without reprocessing.
4. WHEN a new verified event is received, THE Webhook_Processor SHALL insert a row into `billing_events` with status "processing" before dispatching the event handler. IF a concurrent insert for the same `providerEventId` conflicts, THEN THE Webhook_Processor SHALL treat the event as a duplicate and return HTTP 200 without reprocessing.
5. WHEN event processing completes successfully, THE Webhook_Processor SHALL update the `billing_events` row with `processedAt` timestamp and status "processed".
6. IF event processing fails, THEN THE Webhook_Processor SHALL update the `billing_events` row with status "failed" and the error message, and return HTTP 500 to trigger provider retry.
7. THE Webhook_Processor SHALL handle the following Dodo Payments event types: subscription.created, subscription.active, subscription.renewed, subscription.updated, subscription.cancelled, subscription.expired, subscription.past_due, subscription.on_hold, payment.succeeded, payment.failed, refund.succeeded, refund.failed.
8. WHEN a subscription.active or subscription.renewed event is received, THE Webhook_Processor SHALL call Subscription_Service.activateSubscription with the plan, provider IDs, currency, and period dates extracted from the event payload.
9. WHEN a subscription.cancelled event is received, THE Webhook_Processor SHALL call Subscription_Service.updateSubscriptionStatus with status "canceled" and the cancellation timestamp.
10. WHEN a subscription.expired event is received, THE Webhook_Processor SHALL call Subscription_Service.expireSubscription for the user.
11. WHEN a subscription.past_due or subscription.on_hold event is received, THE Webhook_Processor SHALL call Subscription_Service.updateSubscriptionStatus with status "past_due".
12. WHEN a payment.succeeded event is received, THE Webhook_Processor SHALL record a payment attempt in the `payment_attempts` table with the provider payment ID, amount in smallest currency unit, currency, associated plan, and status "succeeded".
13. WHEN a payment.failed event is received, THE Webhook_Processor SHALL record a payment attempt in the `payment_attempts` table with the provider payment ID, amount in smallest currency unit, currency, associated plan, and status "failed".
14. THE Webhook_Processor SHALL resolve the target user for each event by reading the account ID from the checkout session metadata passed during session creation. IF no matching user is found for the event, THEN THE Webhook_Processor SHALL mark the `billing_events` row as status "failed" with an error message indicating user not found, and return HTTP 200 to prevent infinite retries.
15. IF a verified event has an unrecognized event type not listed in criterion 7, THEN THE Webhook_Processor SHALL record the event in `billing_events` with status "ignored" and return HTTP 200 without further processing.
16. THE Webhook_Processor SHALL respond to all webhook requests within 30 seconds. IF processing exceeds 30 seconds, THEN THE Webhook_Processor SHALL return HTTP 500 to allow the provider to retry.

### Requirement 8: Subscription State Management

**User Story:** As a user, I want my subscription state accurately maintained based on webhook events, so that my plan access reflects my current payment status.

#### Acceptance Criteria

1. THE Subscription_Service SHALL remain the single write path for all subscription mutations to `account_subscriptions`.
2. WHEN a subscription is activated, THE Subscription_Service SHALL sync the plan to the `businesses.plan` column on all businesses owned by the user.
3. WHEN a subscription is canceled, THE Subscription_Service SHALL set the subscription status to "canceled" and record the cancellation timestamp. THE Subscription_Service SHALL resolve the effective plan as the paid plan until `currentPeriodEnd` has passed, and as "free" once `currentPeriodEnd` is in the past, evaluated at each access-check invocation.
4. WHEN a subscription transitions to past_due, THE Subscription_Service SHALL maintain paid access until the billing provider sends a subscription.expired event. THE Subscription_Service SHALL NOT independently time out the grace period.
5. WHEN a subscription expires, THE Subscription_Service SHALL downgrade the user to the free plan and sync all owned businesses' `businesses.plan` column to "free".
6. THE Subscription_Service SHALL resolve the effective plan as follows: "active" and "past_due" statuses grant the stored paid plan; "canceled" status grants the stored paid plan if `currentPeriodEnd` is in the future, otherwise resolves to "free"; "expired", "pending", "incomplete", and "free" statuses resolve to "free". IF no `account_subscriptions` row exists for a user, THEN THE Subscription_Service SHALL resolve the effective plan as "free".
7. THE Account_Subscription row SHALL store: provider subscription ID, provider customer ID, provider checkout ID, plan key, billing provider ("dodo"), billing currency ("USD" or "PHP"), adaptive currency flag, subscription status, current period start, current period end, cancellation timestamp, and audit timestamps.
8. WHEN the Subscription_Service updates a subscription status, THE Subscription_Service SHALL re-resolve the effective plan and sync the `businesses.plan` column on all businesses owned by the user to match the resolved effective plan.

### Requirement 9: Feature Gating

**User Story:** As a product owner, I want feature access determined by internal subscription state rather than direct Dodo API calls, so that feature gating is fast, reliable, and provider-independent.

#### Acceptance Criteria

1. THE Feature_Gate SHALL expose a `getCurrentPlan(userId)` function that returns the effective plan ("free", "pro", or "business") based on the Account_Subscription row. IF no Account_Subscription row exists for the user, THEN the function SHALL return "free".
2. THE Feature_Gate SHALL expose a `hasActiveSubscription(userId)` function that returns true when the user has an Account_Subscription row with status "active" or "past_due".
3. THE Feature_Gate SHALL expose a `canCreateBusiness(userId)` function that returns true when the count of businesses owned by the user is less than the `businessesPerPlan` usage limit for the user's effective plan.
4. THE Feature_Gate SHALL expose a `canUseFeature(userId, featureKey)` function that checks whether the user's effective plan includes the specified feature using the `planEntitlements` map. IF the featureKey is not a recognized PlanFeature, THEN the function SHALL return false.
5. THE Feature_Gate SHALL expose a `canAccessBillingFeature(userId)` function that returns true when the user has an Account_Subscription row (regardless of status), indicating they have billing history to manage.
6. THE Feature_Gate SHALL expose a `canRequestRefund(userId)` function that returns true when the user has at least one payment_attempts row with status "succeeded" whose creation timestamp is within the last 30 days AND no refund row with status "pending" or "approved" exists for that payment.
7. THE Feature_Gate SHALL NOT make any external API calls to Dodo Payments. All decisions are based on the local `account_subscriptions`, `payment_attempts`, and `refunds` tables.
8. WHEN a subscription is paid in PHP via Adaptive Currency, THE Feature_Gate SHALL grant identical plan access as a USD subscription for the same plan key.

### Requirement 10: Refund Processing

**User Story:** As a user, I want to request a refund for a recent payment, so that I can recover funds if the service does not meet my needs.

#### Acceptance Criteria

1. WHEN a user requests a refund, THE Refund_Service SHALL verify the payment belongs to the requesting user by matching the user ID on the payment_attempts row.
2. WHEN a user requests a refund, THE Refund_Service SHALL verify the payment was made within the refund window (30 days from the payment_attempts creation timestamp).
3. WHEN a user requests a refund, THE Refund_Service SHALL verify no existing refund row with status "pending" or "approved" exists for the same provider payment ID.
4. WHEN a user requests a refund, THE Refund_Service SHALL verify the payment_attempts row has status "succeeded". Refunds SHALL NOT be initiated for failed or pending payments.
5. IF any eligibility check fails, THEN THE Refund_Service SHALL return a structured error indicating which check failed without calling the Dodo Payments API or creating a refund row.
6. WHEN eligibility checks pass, THE Refund_Service SHALL call the Dodo Payments API to create a full refund for the payment.
7. WHEN the Dodo refund API returns success, THE Refund_Service SHALL insert a refund row with status "pending" and the provider refund ID.
8. WHEN a refund.succeeded webhook event is received, THE Refund_Service SHALL update the refund row status to "approved" and call Subscription_Service to cancel the subscription at the end of the current period.
9. WHEN a refund.failed webhook event is received, THE Refund_Service SHALL update the refund row status to "failed".
10. IF the Dodo refund API returns an error, THEN THE Refund_Service SHALL return a structured error to the caller without creating a refund row.
11. THE Refund_Service SHALL support full refunds only. Partial refund support is deferred to a future iteration.
12. THE Refund_Service SHALL accept a reason string (max 500 characters) from the requester and store it in the refund row.

### Requirement 11: Checkout Flow Integration

**User Story:** As a user, I want a seamless flow from the pricing page through checkout and back to the app, so that subscribing feels smooth and trustworthy.

#### Acceptance Criteria

1. WHEN a user clicks a plan's subscribe button on the pricing page, THE System SHALL call the Checkout_Session_Service API endpoint with the selected plan and interval.
2. IF the Checkout_Session_Service API call fails or returns an error, THEN THE System SHALL display an error message indicating the checkout session could not be created and keep the user on the pricing page.
3. WHEN the API returns a checkout URL, THE System SHALL redirect the user's browser to the Dodo hosted checkout page.
4. WHEN the user completes payment on Dodo's hosted page, THE System SHALL redirect the user back to the app's success URL with the checkout session ID as a query parameter.
5. WHEN the user cancels on Dodo's hosted page, THE System SHALL redirect the user back to the app's pricing page.
6. WHEN the user arrives at the success URL, THE Success_Page SHALL check the Account_Subscription status. IF the webhook has not yet arrived, THEN THE Success_Page SHALL display "Your payment is being processed" and poll the Account_Subscription status every 3 seconds for a maximum of 60 seconds.
7. IF the polling duration exceeds 60 seconds without the Account_Subscription transitioning to active, THEN THE Success_Page SHALL display a message indicating payment confirmation is delayed and instruct the user that their subscription will activate shortly.
8. WHEN the Account_Subscription transitions to active, THE Success_Page SHALL display a confirmation with the activated plan name.
9. THE Checkout_Session_Service SHALL require an authenticated session. IF the user is unauthenticated, THEN THE System SHALL redirect the user to login with a return URL that preserves the selected plan and interval, so that checkout resumes after authentication.

### Requirement 12: Pricing UI with Adaptive Currency Display

**User Story:** As a Philippines-based user, I want to see approximate PHP pricing alongside USD on the pricing page, so that I can estimate the cost in my local currency before entering checkout.

#### Acceptance Criteria

1. THE Pricing_UI SHALL display plan prices in USD as the authoritative price for all users.
2. WHEN the user's region is detected as Philippines, THE Pricing_UI SHALL display an approximate PHP conversion below the USD price, rounded to the nearest whole peso.
3. WHILE the PHP approximation is displayed, THE Pricing_UI SHALL show a disclaimer on each PHP amount: "Approx. ₱X/month. Final PHP amount shown at checkout."
4. THE Pricing_UI SHALL derive the PHP approximation from a hardcoded indicative exchange rate defined in the billing configuration. The rate SHALL be updated manually and is not required to reflect real-time market rates.
5. THE Region_Detection SHALL determine the user's country from server-side geo-IP headers in the following priority order: `x-vercel-ip-country`, then `cf-ipcountry`. The first non-empty value SHALL be used.
6. IF region detection headers are absent or the resolved country is not "PH", THEN THE Pricing_UI SHALL display USD pricing only without any PHP approximation or disclaimer.
7. THE Pricing_UI SHALL NOT display PHP amounts as exact or guaranteed prices. No language such as "costs", "priced at", or "pay" SHALL be used for the PHP figure.
