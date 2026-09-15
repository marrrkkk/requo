# Requo Technical Debt

Architectural inconsistencies found during the documentation reset. Documented only — nothing here is fixed.

## 1. Duplicated `0021` migration prefix

- Evidence: `drizzle/0021_invoice_payment_tracking.sql` + `drizzle/0021_invoice_notifications.sql` (30 files total; no `0019`).
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

- Evidence: `DESIGN.md` Cleanup Targets: remaining `space-y-*`/`space-x-*` stacks, raw status-color utilities, arbitrary radii/shadows; quote editor `<form>` carries the raw `dashboard-detail-layout` grid class because the shared wrapper cannot wrap forms yet.
- Affected: visual consistency, density audit (`audit:density`).
- Impact: low-medium (cleanup, not behavior).
- Direction: migrate opportunistically per `DESIGN.md` rules; promote repeating values into tokens/shared classes instead of one-off fixes.
