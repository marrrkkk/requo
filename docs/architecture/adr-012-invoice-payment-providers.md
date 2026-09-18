# Invoice payment providers (BYO PayMongo / Stripe / PayPal)

Status: accepted. Connection model amended by ADR-013 (platform links add `provider_account_id`, `status`, `auth_mode`; BYO keys remain as the Advanced fallback).

Requo adds bring-your-own payment provider accounts for customer invoice payments while keeping `payments` as the single ledger, Polar SaaS billing isolated in `billing_events`, and provider webhooks authoritative via snapshot + monotonic reconciliation. Businesses connect their own test/live provider accounts (credentials encrypted with `PAYMENT_CREDENTIALS_KEY`, AES-256-GCM, server-only); adapters in `lib/payments/providers/*` isolate all provider SDK/API code; checkout/session identity and money identity stay separate; no public invoice pages, no marketplace/Connect architecture, no automatic OAuth, no automatic webhook registration, no wallets/payouts/subscriptions through these providers.

## Why this shape

- **BYO, never merchant of record.** Requo never touches customer money. Each business connects its own PayMongo/Stripe/PayPal account per environment (`payment_provider_connections`, unique on business/provider/environment), so provider outages, KYC, and payouts stay the business's relationship with its provider.
- **One ledger.** Provider payments extend `payments` (`source = "provider"`, `method = "other"`, status machine, cumulative `refunded_amount_in_cents`) instead of a second ledger, so manual + provider money share the invoice math: net = `sum(amount - refunded)` over non-void manual rows and succeeded-family provider rows. Overpayment is display-only; there is no `overpaid` status.
- **Webhooks authoritative, redirects informational.** `/pay/return` never writes. Routes verify raw-body signatures, atomically insert `payment_events` (`UNIQUE(connection_id, provider_event_id)`), enqueue `requo/payment.event-received`, and return 2xx fast; the Inngest worker reconciles `SELECT ... FOR UPDATE` with forward-only state transitions, so out-of-order or duplicate deliveries cannot downgrade a payment.
- **Provider specifics contained.** Canonical money per provider (PayMongo `pay_…`, Stripe PaymentIntent, PayPal capture); async/unpaid completions and order approvals never count as paid; PayPal approval triggers a server-side capture in the worker. Credentials never reach the client, logs, or props.

## Consequences

- Amends ADR-010: payment gateways are no longer permanently out of scope for customer invoices (BYO only; Polar remains the sole SaaS billing path).
- Manual-payment behavior frozen (`recordPaymentForBusiness` overpay guard, `voidPaymentForBusiness` manual-only); provider reversals flow through refund states.
- New env key `PAYMENT_CREDENTIALS_KEY` (base64 32-byte, server-only); missing key fails explicitly when used.
- Setup per provider documented in `docs/setup/payments.md` (test → live transition, webhook URL + event checklist).
