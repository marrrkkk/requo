# Migration history notes

## Runner semantics (read before touching this directory)

The migration runner (`drizzle-orm` migrator, invoked via `scripts/migrate.ts`)
records one row per applied migration in `drizzle.__drizzle_migrations` but decides
what to run by comparing each journal entry's `when` timestamp against the single
highest `created_at` already recorded — **not** against the set of applied hashes.
Consequences:

- A migration whose `when` regresses below its predecessor's is skipped permanently
  and silently on any database that already applied the predecessor.
- A database rebuilt from scratch (empty history table) applies everything in
  journal order, which hides ordering defects and lets the test suite pass.

## Invariants

1. **Journal `when` timestamps must increase monotonically.**
2. **A migration must be idempotent** (existence-guarded DDL: `IF NOT EXISTS` /
   `IF EXISTS`, `DO ... IF NOT EXISTS (SELECT ...)` for types and policies)
   **unless it is provably applied exactly once.**

## Known regressive timestamps (do not "fix" — document only)

- `0009_remove_ai_tone_preference` (`when` 1780439108479) and
  `0010_add_default_invoice_due_days` (`when` 1780440159375) both regress below
  `0008_performance_indexes` (`when` 1780500000000). Their statements are already
  safe under the runner's all-or-nothing behaviour for their position in history:
  re-timestamping or splitting them now would create a second incident for
  databases that already recorded them. Leave them exactly as they are.

## 2026-09 repair (AI agent / assistant surfaces)

- `0016_ai_agent_v1` (`when` 1756737600000) and `0017_ai_assistant_ux_enhancement`
  (`when` 1756824000000) regressed ~351 days below `0015_add_account_issuer`
  (`when` 1787100000000) and were skipped on incrementally-migrated databases.
- Repair, in order:
  1. `0016` type creation (`CREATE TYPE` x3) and policy creation (`CREATE POLICY`
     x3) were wrapped in existence guards. Table / index / FK / column statements
     were already guarded.
  2. `0019_add_ai_assistant_beta_enabled` was **deleted**: it added
     `businesses.ai_assistant_beta_enabled` without a guard, duplicating the
     guarded `ADD COLUMN IF NOT EXISTS` in `0017`. It was never journalled, so no
     database ever recorded it.
  3. `0018_owner_assistant_sessions` was **registered** (`idx` 18,
     `when` 1787150000000). It gained a prepended guarded enum creation (it
     depends on `ai_agent_message_role`), the `title` column, and deny-all RLS
     policies mirroring `0016`.
  4. `0020_ai_surfaces_repair` (`idx` 19, `when` 1787200000000) re-issues the
     `0016` + `0017` + `0018` bodies plus the remediation feature columns
     (`inquiries.escalated`, `owner_assistant_sessions.title`). Every statement is
     guarded: it applies on incrementally-migrated databases and no-ops on
     rebuilt ones.
  5. `0020_snapshot.json` was regenerated from the TypeScript schema via
     `generateDrizzleJson`, with `prevId` chaining to `0013`. Verified with
     `generateMigration(snapshot, snapshot)` === `[]`, i.e. the normal
     `db:generate` workflow diffs empty again.
