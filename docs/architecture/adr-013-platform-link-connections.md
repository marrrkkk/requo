# Platform-link provider connections (Stripe Connect / PayPal partner)

Status: accepted. Stripe Connect implemented (`lib/payments/providers/stripe/{platform,connect}.ts`, `features/payment-providers/mutations.ts` connect-attempt + start/callback/refresh, `app/api/payments/stripe/connect/{return,refresh}`); PayPal partner mode still gated on partner approval.

Requo connects businesses to their own Stripe/PayPal accounts through the providers' platform relationships instead of pasted merchant secrets: a per-business Connection row gains `provider_account_id`, `status` (`onboarding` | `action_required` | `ready` | `revoked`), and `auth_mode` (`byo` | `platform`). Stripe uses Connect direct charges (platform key + `Stripe-Account` header; webhooks keep per-connection URLs, verified with the platform secret, account-matched). PayPal uses the approved embedded/partner model once partner approval and configuration exist; until then its BYO REST-app flow stays operational. Both modes feed the unchanged `payment_events` → snapshot → monotonic reconciliation → `payments` pipeline.

## Why this shape

- **No merchant secrets in the normal flow.** Pasted keys remain only as an explicit Advanced fallback (tests, dev, PayMongo continuity). Platform mode replaces per-merchant secrets with Requo-held platform configuration plus the provider-hosted authorization experience.
- **Smallest additive model.** Three nullable/defaulted columns and one partial unique guard — `UNIQUE(provider, environment, provider_account_id) WHERE provider_account_id IS NOT NULL` — enforce the cross-business account rule in the DB. No `payments` change (the account id travels connection → adapter call), no second ledger, no new routes.
- **`ready` means capable, not merely authorized.** A callback success never implies readiness; Stripe derives it from `charges_enabled` + `details_submitted` + empty `currently_due` (never `payouts_enabled`), PayPal from managed-account status once the approved integration defines it.
- **Revocation preserves history.** Consent withdrawal flips status to `revoked`, blocks new provider operations, and keeps rows, events, and invoice history/drawable Reconnect UX.
- **Gated, not forked.** Absent platform config leaves platform mode inert and BYO untouched; PayPal production partner functionality waits on PayPal approval (sandbox first). Nothing here works around a missing prerequisite.

## Consequences

- New optional env (`STRIPE_PLATFORM_SECRET_KEY`, `STRIPE_PLATFORM_WEBHOOK_SECRET`); new `connection` audit entity with `connection.connected/updated/disconnected` labels (text columns, additive).
- Terminology locked: *Platform link* (Requo↔provider program) vs *Connection* (per-business row); "OAuth" only for actual OAuth flows.
- Amends the ADR-012 connection model; reconciliation, refund accounting, invoice math, and notification rules unchanged.
