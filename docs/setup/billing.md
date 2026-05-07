# Billing Setup

Requo billing is business-scoped. A business has one effective plan.

The app supports two providers:

- **PayMongo** for QRPh payments in the Philippines, billed in PHP.
- **Paddle** for recurring card subscriptions, billed in USD.

Billing is optional in local development. When providers are not configured, paid
features can still show upgrade prompts, but checkout actions return clear
"not configured" errors.

## Data Model

Run migrations before testing billing:

```bash
npm run db:migrate
```

Billing tables:

| Table | Purpose |
| --- | --- |
| `business_subscriptions` | Authoritative subscription row for each business |
| `billing_events` | Idempotent provider event log |
| `payment_attempts` | Audit trail for checkout and webhook payment attempts |

`businesses.plan` is a denormalized read cache. Do not update it directly.
Subscription writes must go through `lib/billing/subscription-service.ts`.

## Pricing

Prices are intentional localized prices, not exchange-rate conversions.

| Plan | PHP QRPh | USD Card |
| --- | --- | --- |
| Free | PHP 0 | $0 |
| Pro monthly | PHP 299/mo | $4.99/mo |
| Pro yearly | PHP 2,990/yr | $49.90/yr |
| Business monthly | PHP 599/mo | $9.99/mo |
| Business yearly | PHP 5,990/yr | $99.90/yr |

Pricing is defined in `lib/billing/plans.ts`. Provider selection comes from
`lib/billing/region.ts`: Philippines/PHP uses PayMongo, and global/USD uses Paddle.

## PayMongo QRPh Setup

1. Create or open a PayMongo account.
2. Copy the secret and public keys from Dashboard > Developers > API Keys.
3. Add keys to `.env`:

```env
PAYMONGO_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxx
PAYMONGO_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxx
```

4. Create a webhook in Dashboard > Developers > Webhooks.
5. Set the endpoint:

```text
https://<your-domain>/api/billing/paymongo/webhook
```

For local webhook testing, run `npm run dev` so the app and ngrok tunnel start
together, then use the ngrok HTTPS URL:

```text
https://<your-ngrok-url>/api/billing/paymongo/webhook
```

6. Subscribe to these events:

- `payment.paid`
- `payment.failed`
- `qrph.expired`

7. Add the webhook secret:

```env
PAYMONGO_WEBHOOK_SECRET=whsk_xxxxxxxxxxxxxxxxxxxxxxxxx
```

PayMongo QRPh uses payment intents. Requo treats completed QRPh payments as
manual-renewal subscription periods and records attempts in `payment_attempts`.

## Paddle Card Setup

1. Create or open a Paddle account.
2. Create products/prices for Pro and Business in Paddle Catalog.
3. Create monthly and yearly recurring prices for each paid plan.
4. Copy the price IDs into `.env`:

```env
PADDLE_PRO_PRICE_ID=pri_...
PADDLE_PRO_YEARLY_PRICE_ID=pri_...
PADDLE_BUSINESS_PRICE_ID=pri_...
PADDLE_BUSINESS_YEARLY_PRICE_ID=pri_...
```

5. Create an API key and webhook secret:

```env
PADDLE_API_KEY=pdl_...
PADDLE_WEBHOOK_SECRET=pdl_ntfset_...
PADDLE_ENVIRONMENT=sandbox
```

6. Create a client-side token for Paddle.js overlay checkout:

```env
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=...
NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox
```

7. Configure the webhook endpoint:

```text
https://<your-domain>/api/billing/paddle/webhook
```

For local webhook testing:

```text
https://<your-ngrok-url>/api/billing/paddle/webhook
```

8. Subscribe to these events:

- `subscription.created`
- `subscription.activated`
- `subscription.updated`
- `subscription.canceled`
- `subscription.expired`
- `subscription.past_due`
- `transaction.completed`
- `transaction.payment_failed`

Paddle checkout creates transactions with `custom_data.business_id`,
`custom_data.plan`, and `custom_data.interval`. Webhooks use that data to sync
`business_subscriptions`.

## Local Testing Flow

For app-only work:

```bash
npm run dev:app
```

For provider callbacks and webhooks:

```bash
npm run dev
```

When using ngrok, update `BETTER_AUTH_URL` to the ngrok origin so return URLs and
provider callbacks use the public URL.

Use sandbox/test provider credentials locally. Do not disable webhook signature
checks in committed code. If you need to inspect webhook behavior, use provider
dashboard delivery logs plus local server logs.

## Troubleshooting

### Checkout says billing is not configured

- Confirm the provider env vars for the selected payment method are set.
- Restart the dev server after editing `.env`.
- For Paddle, confirm both server and public environment values match sandbox or production.

### PayMongo QR does not complete

- Check the PayMongo payment intent in the dashboard.
- Verify the webhook endpoint is public and reachable.
- Confirm `PAYMONGO_WEBHOOK_SECRET` matches the webhook configuration.
- Check `payment_attempts` and `billing_events`.

### Paddle subscription does not activate

- Confirm price IDs match the selected plan and interval.
- Confirm Paddle sends `custom_data.business_id` and `custom_data.plan`.
- Verify `PADDLE_WEBHOOK_SECRET`.
- Check `billing_events`, `payment_attempts`, and `business_subscriptions`.

### Business plan is wrong

- Treat `business_subscriptions` as authoritative.
- Use `getEffectivePlan()` in `lib/billing/subscription-service.ts` to resolve access.
- Do not patch `businesses.plan` directly; fix the subscription row or replay the provider event.
