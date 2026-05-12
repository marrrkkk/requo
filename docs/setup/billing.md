# Billing Setup

Requo uses Paddle only. Billing is USD-only.

## Data model

Run migrations before testing billing:

```bash
npm run db:migrate
```

Billing tables:

- `account_subscriptions`: source of truth for account subscription status
- `billing_events`: idempotent webhook event log
- `payment_attempts`: checkout and payment history

`businesses.plan` is a denormalized cache synchronized by `lib/billing/subscription-service.ts`.

## Pricing

Pricing is defined in `lib/billing/plans.ts` and uses USD cents:

- Pro monthly: `$4.99`
- Pro yearly: `$49.90`
- Business monthly: `$9.99`
- Business yearly: `$99.90`

## Paddle setup

1. Create Paddle products and recurring prices for Pro and Business (monthly + yearly).
2. Add env values:

```env
PADDLE_API_KEY=pdl_...
PADDLE_WEBHOOK_SECRET=pdl_ntfset_...
PADDLE_PRO_PRICE_ID=pri_...
PADDLE_PRO_YEARLY_PRICE_ID=pri_...
PADDLE_BUSINESS_PRICE_ID=pri_...
PADDLE_BUSINESS_YEARLY_PRICE_ID=pri_...
PADDLE_ENVIRONMENT=sandbox
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=...
NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox
```

3. Configure webhook endpoint:

```text
https://<your-domain>/api/billing/paddle/webhook
```

4. Subscribe to events:

- `subscription.created`
- `subscription.activated`
- `subscription.updated`
- `subscription.canceled`
- `subscription.expired`
- `subscription.past_due`
- `transaction.completed`
- `transaction.payment_failed`

## Troubleshooting

### Checkout says billing is not configured

- Confirm Paddle env vars are set.
- Restart the dev server after editing `.env`.
- Verify `NEXT_PUBLIC_PADDLE_ENVIRONMENT` matches `PADDLE_ENVIRONMENT`.

### Subscription does not activate

- Confirm price IDs map to the selected plan and interval.
- Verify webhook signature secret.
- Check `billing_events` and `payment_attempts`.
