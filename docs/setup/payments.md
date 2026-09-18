# Invoice Payments Setup (platform links / BYO keys)

Businesses accept online invoice payments through their **own** provider accounts. Requo creates provider-hosted checkouts, verifies webhooks, and reconciles money into the existing `payments` ledger — it never holds customer funds and is never the merchant of record. Rules: ADR-012, and ADR-013 for platform links.

Two ways a business connects an account:

- **Platform link** (Stripe): the owner authorizes their own Stripe account through Stripe's hosted onboarding. Requo holds the platform credentials; no merchant secret is pasted or stored. This is the normal path.
- **BYO keys** (PayMongo, PayPal, and Stripe as an Advanced fallback): the owner pastes their own merchant keys, encrypted at rest. Still the only path for PayMongo, and for PayPal until partner approval lands.

Both modes write the same `payment_provider_connections` row and feed the identical webhook → reconcile → `payments` pipeline.

## Data model

Run migrations before testing payments:

```bash
npm run db:migrate
```

Payment tables:

- `payment_provider_connections`: one row per business/provider/`test|live` (unique). Secrets live AES-256-GCM-encrypted in `credentials_ciphertext`; only a masked hint is readable. A platform-linked row stores `provider_account_id` with `auth_mode = platform` and no merchant secret.
- `provider_connection_attempts`: short-lived (30 min), single-use pointers binding a provider-hosted flow to `(user, business, provider, environment, account)`. They carry no secrets — authentication always comes from the Requo session plus an owner-role check, never the URL.
- `payment_events`: idempotent webhook delivery log, unique on `(connection_id, provider_event_id)`.
- `payments`: the single ledger. Provider rows use `source = "provider"`, `method = "other"`, a status machine, and cumulative `refunded_amount_in_cents`. Net paid = manual records plus succeeded-family provider rows minus refunds. Polar's `billing_events` stays completely separate.

App-level env (one key for all businesses):

```env
PAYMENT_CREDENTIALS_KEY=<base64 32-byte key>   # server-only, never NEXT_PUBLIC_*
```

Generate with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`. If unset, connecting a provider fails explicitly — there is no dev fallback key.

Optional platform-link env (Stripe Connect):

```env
STRIPE_PLATFORM_SECRET_KEY=sk_...        # Requo's own Stripe platform account
STRIPE_PLATFORM_WEBHOOK_SECRET=whsec_... # platform endpoint signing secret
```

When both are unset, platform mode is inert: the Stripe card still shows **Connect with Stripe** (it is the primary path, so it stays discoverable) but the control is disabled with the reason, and pasted keys remain the working fallback. Setting one without the other counts as unset (`isStripePlatformConfigured`).

## Connecting a provider

Always wire **test/sandbox** first.

### Stripe platform link (recommended)

1. Set `STRIPE_PLATFORM_SECRET_KEY` and `STRIPE_PLATFORM_WEBHOOK_SECRET`, then restart the app.
2. As the business owner: Settings → Integrations → Stripe → pick **Test** → **Connect with Stripe**.
3. Requo creates a connected account (controller-based Express) and sends the owner to Stripe's hosted onboarding.
4. The owner completes onboarding at Stripe. Stripe returns to Requo, which re-reads the account and records the outcome.
5. **`ready` is derived, never assumed.** Requo requires `charges_enabled` + `details_submitted` + an empty `currently_required` list. A finished callback alone is not enough — incomplete accounts show *Action required* with a **Finish Stripe setup** button. `payouts_enabled` is deliberately not a requirement (a payout hold must not block taking money).
6. Webhooks are delivered through Requo's platform configuration; the owner pastes no signing secret. Each event is account-matched, so an event for one connected account can never credit another business.

Statuses the card can show: *Setup incomplete* (`onboarding`), *Action required*, *Ready*, *Revoked*.

### PayMongo / PayPal / Stripe with your own keys (Advanced)

Pick provider and environment → paste credentials → Connect. The page shows the connection's webhook URL plus the exact events to enable:

```text
/api/payments/webhooks/{paymongo,stripe,paypal}/{connectionId}
```

Use the `npm run dev` ngrok URL (or any HTTPS tunnel) when testing locally.

### PayMongo (test)

1. In the PayMongo dashboard (test mode), copy the secret key (`sk_test_…`) and create a **test** webhook endpoint pointing at the connection URL. Copy its signing secret (`whsk_…`).
2. Paste both into the PayMongo Test card and Connect.
3. Subscribe the endpoint to: `payment.paid`, `payment.failed`, `payment.refunded`, `payment.refund.updated`, `checkout_session.payment.paid`.

### Stripe (test)

1. In the Stripe dashboard (test mode), copy the secret key (`sk_test_…`) and create a **test** webhook endpoint pointing at the connection URL. Reveal and copy the endpoint signing secret (`whsec_…`).
2. Paste both into the Stripe Test card and Connect.
3. Subscribe the endpoint to: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`, `charge.refund.updated`.

### PayPal (sandbox)

1. In the PayPal Developer dashboard, create/find the sandbox REST app. Copy the sandbox client ID and secret.
2. Create a sandbox webhook pointing at the connection URL and copy its **webhook ID**.
3. Paste all three into the PayPal Test card and Connect.
4. Subscribe to: `CHECKOUT.ORDER.APPROVED`, `CHECKOUT.ORDER.COMPLETED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.PENDING`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.CAPTURE.REVERSED`, `CHECKOUT.PAYMENT-APPROVAL.REVERSED`.

## Sandbox verification checklist

Per provider, in order:

1. Settings → Integrations shows a status badge plus the environment and masked hint (never the secret). Platform link: *Ready*. Pasted keys: *Ready · test · ••••1234*. An incomplete platform account shows *Action required* with **Finish Stripe setup**, and no checkout is offered for it.
2. On a sent invoice: Create payment link → provider checkout opens for the exact remaining balance.
3. Complete a test payment → webhook lands in `payment_events` (`processed`), one `payments` row reaches `succeeded`, invoice becomes `paid`, one `invoice_paid` notification fires.
4. Delayed/async method (Stripe) or approve-without-capture (PayPal): invoice stays unpaid until the provider confirms money; the return page (`/pay/return`) never marks anything paid.
5. Redeliver the same webhook from the provider dashboard → still one payment row, no duplicate notification.
6. Partial payment → `partially_paid`; second payment → `paid`; overpayment → `paid` with an overpaid display.
7. Refund from the invoice (owner/manager) → provider refund accepted → refund webhook arrives → net drops, status follows (`partially_refunded`/`refunded`).
8. Refresh on a payment row reconciles current provider truth without duplicating rows.

## Live cutover

Cut over only after the sandbox checklist passes end-to-end for that provider. Live charges real money.

1. **Create the live connection.** Platform link: repeat the Connect flow with the **Live** environment selected — Stripe onboards the owner's live account and Requo stores a separate `live` row. Pasted keys: repeat the credential + webhook-endpoint steps in the provider's live dashboard. Either way it is a separate connection row (same provider, `live` environment). Test and live connections coexist; test events can never touch the live row (separate URLs, signature secrets, and `livemode`/payload guards).
2. **Create a live payment link** on a real invoice and complete a small payment you own.
3. **Verify:** `payment_events` row `processed` for the live connection, `payments` row `succeeded` with the live checkout/money IDs, invoice `paid`, notification fired once.
4. **Refund it** from the invoice and confirm the net returns to the pre-payment state.
5. **Monitor for 24 hours:** watch `payment_events` for `failed` rows (permanent mismatches: currency, unknown invoice, wrong environment) and logs for signature errors. Duplicate deliveries are normal — redelivery must stay a no-op.

## Rollback

Disconnecting a provider (owner-only, Settings → Integrations) deletes the connection row; recorded payments stay on the ledger (their `provider_connection_id` is nulled, amounts untouched). To stop new online payments immediately without losing history, disconnect the live connection and keep the test one.

For a platform link, disconnecting only removes Requo's reference: the connected account, its charges, and its payouts stay in the owner's own Stripe dashboard, untouched. Reconnecting creates or reuses a connected account for the selected environment.

Every connect, key replacement, and disconnect writes a `connection.connected` / `connection.updated` / `connection.disconnected` audit entry, so the credential and consent history is reviewable independently of the connection row.

## Troubleshooting

### "Payment provider connection not found" on checkout/refresh/refund

- The connection was disconnected or belongs to another business. Reconnect in Settings → Integrations.

### Webhook events stuck in `processing`

- The Inngest worker may be down (`npm run dev:inngest`, `INNGEST_DEV=1`). Events older than 15 minutes are automatically resubmitted by `cron-payment-events-recovery`. Do not replay manually unless the worker is healthy.

### Valid PayMongo/Stripe events rejected (400 signature errors)

- Confirm the secret pasted is the **endpoint** signing secret (`whsk_…`/`whsec_…`), not the API secret key.
- Confirm JSON middleware never parses the body before verification (the route reads the raw body itself).
- Confirm the clock is accurate (5-minute replay window) and, for PayMongo, that test events hit the test connection (test/live secrets differ).

### PayPal events rejected

- Confirm the webhook ID matches the webhook configured in the PayPal dashboard (test vs sandbox IDs differ).
- Sandbox cert hosts only verify on test connections; production cert hosts only on live.
- Simulator mock events use webhook ID `WEBHOOK_ID` and cannot verify — use sandbox webhooks from real sandbox activity instead.

### Invoice stays unpaid after a successful-looking checkout

- Stripe `checkout.session.completed` with an async method, or PayPal order approval, is not money yet. Wait for the success/failure/capture webhook, then use Refresh. Check `payment_events` for the matching `provider_event_id` and its `error`.

### Currency mismatch failures

- The provider amount currency must exactly equal the invoice currency. No conversion exists — recreate the invoice (draft) or checkout in the matching currency.

### The Stripe card offers pasted keys, not "Connect with Stripe"

- **Connect with Stripe is disabled with a "not configured" note.** `STRIPE_PLATFORM_SECRET_KEY` / `STRIPE_PLATFORM_WEBHOOK_SECRET` are unset (or only one is set). Platform mode is inert by design; pasted keys keep working. Set both and restart the app to enable it.
- **The card shows only the key form.** A Stripe connection already exists for that environment. A platform link and pasted keys are mutually exclusive: disconnect the existing row first. The same rule runs the other way — pasting keys over a linked account is refused.

### "Stripe platform is not configured" on Connect or on a webhook

- Platform env was removed or rotated while a platform-linked row still exists. Restore the keys, or disconnect and reconnect the Stripe account.

### Stripe events rejected with `account_mismatch`

- The event's connected account does not match the account stored on the connection. This is the cross-tenant guard working: an event for one Stripe account can never credit another business. Confirm the endpoint's `connect` setting and the `Stripe-Account` used at checkout.

### Stripe onboarding finished but the status is still *Action required*

- Readiness is derived from `charges_enabled` + `details_submitted` + an empty `currently_required` list. Stripe is still asking for something; open **Finish Stripe setup** to see what. `payouts_enabled` being false does not block accepting money.
