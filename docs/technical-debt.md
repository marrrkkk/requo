# Requo Technical Debt

Architectural inconsistencies found during the documentation reset. Documented only — nothing here is fixed.

## 1. Duplicated `0021` migration prefix

- Evidence: `drizzle/0021_invoice_payment_tracking.sql` + `drizzle/0021_invoice_notifications.sql` (34 files total; no `0019`).
- Affected: migration ordering / history readability.
- Impact: low today (Drizzle applies journal order), but the next `db:generate` numbering needs care to avoid a third collision.
- Direction: leave history untouched (never edit committed migrations); verify the next generated prefix sequences correctly.

## 2. ~~Unused `quote_post_acceptance_status` enum~~ (resolved)

- Evidence: was defined in `lib/db/schema/quotes.ts`; zero references in `lib/`, `features/`, `app/`.
- Resolved: the declaration was removed and `drizzle/0030_omniscient_cassandra_nova.sql` drops the type. The column and its index were already dropped back in `0012_remove_jobs_invoices_automations.sql`, and no table, policy, or view referenced the type, so the drop is data-free. Post-acceptance state continues to live on invoices, not this enum.

## 3. BoardUI / shadcn duality

- Evidence: `components/base/*` (16 dirs) + `components/application/` + `components/foundations/` exist alongside canonical `components/ui/*` (shadcn) and `DESIGN.md`; only 3 BoardUI compat tokens mapped in `app/globals.css:50-54`.
- Affected: UI contributions — two component systems invite parallel patterns.
- Impact: medium (drift risk). `DESIGN.md` + shadcn remain canonical per this reset; the BoardUI rules block was removed from `AGENTS.md` for that reason.
- Direction: decide per component whether `components/base/*` stays (adopt + document in `DESIGN.md`) or is removed; until then, build new UI on `components/ui/*` + `components/shared/*`.

## 4. Legacy styling debt (already tracked in `DESIGN.md`)

- Evidence: `DESIGN.md` Cleanup Targets: remaining `space-y-*`/`space-x-*` stacks, arbitrary radii/shadows; quote editor `<form>` carries the raw `dashboard-detail-layout` grid class because the shared wrapper cannot wrap forms yet.
- Affected: visual consistency, density audit (`audit:density`).
- Impact: low-medium (cleanup, not behavior).
- Direction: migrate opportunistically per `DESIGN.md` rules; promote repeating values into tokens/shared classes instead of one-off fixes.
- **Resolved — status colour.** `components/shared/status-badge.tsx` now owns the single tone → class map. The eight per-domain class maps and their 222 `!important` tokens are gone; quotes, inquiries, invoices, follow-ups, businesses, the admin console, the assistant tool-result cards, and the settings service pills all compose `StatusBadge`. `scripts/audit-status-tokens.ts` (wired into `check:seo`) enforces it.
- **Remaining — raw palette on non-pill surfaces.** Status *pills* are tokenized, but raw palette still colours semantic surfaces: `components/shared/archived-record-banner.tsx` (amber), `components/shared/paywall.tsx` (violet brand accent), `features/quotes/components/ai-pricing-review-panel.tsx` and `send-quote-dialog.tsx` (amber alerts), and `features/quotes/components/public-quote-interactive-column.tsx` + `public-quote-preview-interactive-column.tsx` (emerald/red/amber option cards). Move these to `--warning` / `--success` / `--destructive` opportunistically.
- **Remaining — the same cascade-order bug outside status.** `meta-label !text-primary` (`components/marketing/marketing-hero.tsx`, `marketing-feature-row.tsx`, `solutions/solutions-shared.tsx`, `solutions/solution-detail.tsx`) and `!bg-sidebar-accent` (`components/application/dashboard/dashboard-sidebar.tsx`) are the identical failure mode the status migration removed: a custom class in `@layer utilities` setting a colour that a utility then cannot override. Fix by giving the custom class a variant that does not set colour (as `Badge variant="status"` does), not by keeping the `!`.

## 5. `revoked` connection status has no write path

- Evidence: `connectionStatuses` includes `revoked` (`lib/db/schema/payment-providers.ts`), `providerOperationBlocked` and the settings card both handle it, and `tests/unit/connection-status.test.ts` asserts the vocabulary — but nothing in `lib/`, `features/`, or `app/` ever sets it. ADR-013 describes consent withdrawal flipping the row to `revoked` and keeping it drawable for a Reconnect flow.
- Affected: `features/payment-providers/mutations.ts` (disconnect deletes the row instead), Stripe Connect webhook handling (`account.application.deauthorized` is not consumed).
- Impact: low today. A business that revokes Requo's access at Stripe keeps a row stuck at its last derived status, so operations fail at the provider rather than being blocked up front with the "revoked — reconnect" message. Deleting the row (the current disconnect) is a working escape hatch.
- Direction: when Stripe revocation handling is built, consume the deauthorization event to set `revoked` instead of leaving the row stale; decide then whether owner-initiated Disconnect should also revoke rather than delete.

## 6. Disconnecting a connection deletes its `payment_events`

- Evidence: `paymentEvents.connectionId` is `.notNull()` with `onDelete: "cascade"`, so `disconnectProviderForBusiness` removes the webhook delivery log along with the row. `payments.providerConnectionId` is `onDelete: "set null"`, so the ledger and invoice math are unaffected.
- Affected: webhook history / dispute forensics for a disconnected provider.
- Impact: low — `payments` keeps the money trail and the audit log keeps the connect/disconnect trail. What is lost is the raw delivery log (`payload`, `error`, processed state) that made a failed reconcile diagnosable after the fact.
- Direction: if post-disconnect forensics matter, switch to soft-delete or keep events with a nullable `connectionId`; do not change the cascade without also re-checking the `UNIQUE(connection_id, provider_event_id)` idempotency guarantee.
