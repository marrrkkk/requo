# Requo Codebase Cleanup — Execution Plan

Status: **plan** (not started). Companion report once executed: `docs/codebase-cleanup.md`.

## 0. Objective and guardrails

Remove dead code so the repository contains only code that has a reason to exist — smaller, cleaner, easier for humans and AI agents to work with. **No behavior change, no redesign, no architecture refactor, no library migrations, no API contract changes.**

Protected (never delete):
- Framework entry points: `app/**/page|layout|loading|error|not-found|route|opengraph-image|twitter-image|sitemap|robots|global-error`, `proxy.ts`, `next.config.ts`, `vercel.json`, `app/llms.txt`, `app/.well-known`.
- `drizzle/` migration history, RLS policies, DB functions/triggers, seeds, `drizzle.config.ts`.
- External contracts: webhooks in `app/api` (Polar, Resend, Inngest, `api/cron/*`), public routes, OAuth callbacks, any URL referenced from email templates, docs, or external automation.
- Design-system foundations per `DESIGN.md` (canonical `components/ui/*` shadcn + `components/shared/*`).
- Documentation work: `AGENTS.md` (report inaccuracies separately, do not rewrite), `docs/*` unless demonstrably obsolete.
- Tooling/skill state the last commits deliberately set up (`.agents/skills/*`, `CLAUDE.md`, `.gitignore` entries for local agent directories).

Rules of conduct:
- Never delete on analyzer output alone. Investigate. `UNCERTAIN` ⇒ keep.
- No `knip --fix --allow-remove-files`. No `git reset --hard` / `git clean -fd`.
- Delete in small batches, verifying after each (see §7).
- Don't touch files belonging to the in-flight admin-console refactor.

## 1. Precondition — clean baseline (user action, step 0)

The working tree currently carries an uncommitted refactor (327 changed files: admin-console rebuild `features/admin/components/*`, migrations `0028/0029`, docs reset, new tests). Dead-code analysis on top of a half-merged tree is misleading and risky.

1. User commits the WIP **first, split by logical units** (e.g., docs reset, admin console rebuild, AI/model changes, migrations, tests). Offer to review any diff chunk on request; do not commit on the user's behalf without explicit instruction.
2. Confirm `git status` is clean except the plan file (`docs/plans/codebase-cleanup-plan.md`), then create branch `cleanup/dead-code` from the committed baseline.
3. Record a green baseline with the repo's real commands:
   - `npm run check` (lint + typecheck + `check:seo` + `check:models`)
   - `npm run test` (unit + components)
   - `npm run test:integration` (requires local Postgres — see `docs/setup/local.md`; gate script `scripts/test/check-db.mjs`)
   - `npm run build` (production build — mandatory per cleanup rules §40)
   - `npm run test:e2e:smoke` (requires local DB + app)
   - `git diff --check`
   Any failure here must be resolved **before** cleanup starts; record results as the baseline in the report.

## 2. Phase 1 — Repository inventory and entry-point map

Build a registry (scratch file, not committed) covering:

1. **Next.js convention entries**: `app/**/page|layout|route|loading|error|not-found|template|default|sitemap|robots|opengraph-image|twitter-image`, `proxy.ts`, `next.config.ts`, `app/globals.css`, `app/layout.tsx` (imports `DevTools` — see Phase 3A), `app/(marketing)`, `app/home`, `app/llms.txt`. Every `app/api/**/route.ts` is an entry point (HTTP), not an imported module — classify each: frontend-fed / server-fed / webhook-external / cron (`lib/security/cron.ts`, Vercel cron in `vercel.json`?) / public.
2. **Config & tooling entries**: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `vitest.config.ts` + `vitest.integration.config.ts` + `vitest.shared.ts`, `playwright.config.ts` (+ `playwright.screenshots.config.ts` — gitignored but wired to `npm run screenshots`; flag oddity), `drizzle.config.ts`, `components.json` (shadcn CLI), `vercel.json`, `.gitignore`.
3. **Script entries**: every file in `scripts/` + `app/../scripts` — wire each to `package.json`, CI, or docs (see Phase 3A).
4. **DB shape**: `lib/db/schema/*` vs `drizzle/*.sql` — schema files map 1:1 to live tables; migration history stays untouched.
5. **External refs**: read `docs/integrations.md`, `docs/architecture.md`, `docs/frontend.md`, `README.md`, `AGENTS.md`, `.agents/skills/requo-repo-guide/SKILL.md` for documented contracts and architecture before touching anything.
6. **Feature map**: reachability of each `features/*` dir from `app/` routes (esp. `marketing`, `legal`, `search`, `importer`, `customers`, `notifications`, `audit`, `dev-tools`).

Deliverable of the phase: a table `{path, why-visible, entry-point-kind, risk}` for every file with no import graph, plus the `SAFE_DELETE / LIKELY_DELETE / KEEP / KEEP_FRAMEWORK_ENTRY / KEEP_DYNAMIC / KEEP_EXTERNAL / KEEP_HISTORICAL / UNCERTAIN` classification per item.

## 3. Phase 2 — Static analysis

**Knip** (not installed; do **not** add to `package.json` — run from `npx knip@latest` per session):

1. First run with the Next.js plugin and explicit entry config covering: `next.config.ts`, `proxy.ts`, `app/**`, `scripts/*` (each script is an entry), `drizzle.config.ts`, all `vitest`/`playwright` configs, `vercel.json`, `scripts/test/*.mjs`, plus `project` = `app components features hooks lib utils types emails`.
2. **Sanity-check every surprise before trusting it.** This repo is heavy on: dynamic imports, env-gated code, Inngest functions registered by name (`lib/inngest/functions/*`), Resend template rendering, model catalogs (`lib/ai/catalog.ts` — actively maintained per recent commits), route groups, and worker/edge boundaries. Do not silence findings via ignore lists without a recorded reason.
3. Secondary checks:
   - `npx depcheck` (cross-check for dependency findings only)
   - targeted greps: `console.log|debugger`, `TODO|FIXME|HACK|TEMP|temp|mock|dummy|legacy|deprecated|backup|copy|experimental`, commented-out blocks (5+ consecutive `//` lines), `zz-`/`repro`/`old`/`v1`/`v2` in filenames
   - `git log -- <path>` / `git log -S '<symbol>'` for history questions
   - `npm ls` for duplicate-purpose libraries (see Phase 3D)
4. Iterate: after each removal wave, rerun knip — findings cascade (unused file → unused utility → unused dependency).

## 4. Phase 3 — Removal batches (each followed by verification, §7)

### Batch A — Confirmed dead files (user-approved)
1. `playwright.repro.config.ts` — isolated repro config; machine-specific `testDir` (`C:/Code/Projects/requo`); referenced nowhere else.
2. `tests/e2e/zz-back-nav-repro.spec.ts` — `zz-`-prefixed repro spec, referenced only by the repro config.
3. `check_migration.sql` — one-off diagnostic at repo root.
4. `features/dev-tools/` (whole dir: `dev-tools.tsx`, `dev-tools-panel.tsx`, `tabs/*`, `types.ts`) — verify it is dev-only (env-gated `DevTools` in `app/layout.tsx:203`); if the gate strips it in production, remove the feature dir and the layout import. Check tests referencing it.
5. Root `tsconfig.tsbuildinfo` is already gitignored (no action; confirm no tracked copies).

### Batch B — Scripts audit (`scripts/`)
Wired to `package.json` / `check:seo` / CI ⇒ **keep**: `migrate.ts`, `seed.ts`, `seed-prod.ts`, `db-reset.ts`, `dev-health-check.ts`, `check-model-catalog.ts`, `generate-support-knowledge-csv.ts`, `audit-*.ts` (9), `scripts/test/*`.
Candidates — verify against docs (`docs/development.md`, `docs/setup/*`) and `git log` before removing; likely one-off dev/diagnostic scripts:
`apply-migration-0003.ts`, `backfill-polar-subscription.ts`, `billing-reset.ts`, `db-nuke.ts`, `debug-billing-events.ts`, `fix-db.ts`, `fix-plan-column.ts`, `mark-migrations-applied.ts`, `verify-index-usage.ts` (+ `.sql`), `wipe-db.ts`, `apply-performance-indexes-concurrently.sql`, `dev-defender-exclusions.ps1` (Windows dev convenience — confirm, likely keep or delete with user).
`billing-reset.ts` / `db-nuke.ts` / `wipe-db.ts` are destructive dev tools — if unreferenced, remove only with user sign-off (ask in the cleanup report otherwise).

### Batch C — Unused components / hooks / utilities
1. **`components/base/*` (BoardUI, 16 dirs) + `components/application/*` + `components/foundations/icons`** — technical-debt.md §3 documents the BoardUI/shadcn duality as an open decision. Greps show `components/application/dashboard/*` (sidebar, team/user menus) and `settings/*` import `components/base/*`; `dashboard-sidebar.tsx` is actively used + modified in WIP. Expected outcome: both layers are reachable ⇒ **keep**, record in report as intentional BoardUI compat; remove only individual `base/*` components knip proves unreachable. Do not purge the system.
2. **`components/feedback/*`** — used by public inquiry/quote pages (grep confirmed) ⇒ keep.
3. **`components/marketing/*`** — verify each is reached from `app/(marketing)` or `app/home`; remove only unreachable ones (e.g., unused mock/scaffold files, `scaled-dashboard-stage` if unused).
4. **`hooks/`, `utils/`, `types/`, `lib/*` top-level** (`csv.ts`, `files.ts`, `action-state.ts`, `public-action-rate-limit.ts`, `public-env.ts`, `slugs.ts`) — knip + grep; remove confirmed dead, drop `export` keyword where the implementation is used internally.
5. **Feature dirs** — verify reachability of `features/search`, `features/importer`, `features/customers`, `features/legal`, `features/marketing`, `features/notifications`, `features/audit`, `features/business-members`, `features/theme`, `features/data-export`. Each maps to routes or is imported by live features; investigate before deleting. Post-refactor orphans are likely here.
6. **AI/RAG/email/Supabase/Redis audits** (per task sections 16–21): trace full execution paths —
   - `lib/ai/*`: catalog, routing-profiles, cache-layer, token-logger, usage-limiter, output-filter, embeddings, `canary.ts`; `features/ai`, `features/ai-agent`, `features/owner-assistant`, `features/memory` (retrieval+embeddings live). Remove only unreachable utils; **keep all providers that participate in routing/fallback**.
   - RAG pipeline stages: upload → parse (`unpdf`) → chunk → embed (`lib/ai/embeddings.ts`) → store → retrieve (`features/memory/retrieval.ts`) → generate. Verify each stage is wired; remove dead stages, never a live one.
   - `lib/supabase/*` clients: browser / server / service-role — all three roles may be legitimately used; verify server-side usage of service-role before touching.
   - `lib/cache`, `lib/rate-limit/redis-rate-limiter.ts`, `lib/ai/usage-limiter.ts` (Upstash Redis) — live per WIP; keep.
   - `emails/templates/*` (10 templates) — verify each is referenced by `lib/email/` builders; watch for duplicates (`analytics-digest` vs `analytics-scheduled-report`).
   - `lib/inngest/functions/*` — registered by name; all entries are runtime code.

### Batch D — Unused exports and types
1. **`quote_post_acceptance_status` enum** (documented dead, `lib/db/schema/quotes.ts:31`, zero refs). User-approved path:
   - Confirm no DB-side dependency: grep `drizzle/**/*.sql` + check via `psql` if available (no column/policy/function references).
   - Remove enum from schema, run `npm run db:generate` to produce migration `0030_remove_quote_post_acceptance_status.sql` (+ snapshot) — do **not** hand-edit history/journal.
   - Keep migration separate in the commit; it is the one schema change in this cleanup.
2. Knip unused-exports pass: for each, decide export-only vs whole-implementation dead; remove `export` keyword where the rest is used.
3. Dead constants/types/validators in `features/*/types.ts`, `features/*/schemas.ts`, `lib/db/schema/*` — only entries with no DB presence and no runtime refs.

### Batch E — Dependencies (after code removal)
1. Rerun knip (unused deps cascade from batches A–D); cross-check with `depcheck`.
2. **Duplicate-purpose pairs to resolve by usage evidence**: `framer-motion` vs `motion`; `react-qr-code` vs `qrcode.react`; `marked` vs `react-markdown`+`remark-gfm`/`remark-breaks`; `pdf-lib` vs `unpdf` (generate vs parse — may both be legit); `@remixicon/react` vs `lucide-react` (verify both used); `@thesvg/react`.
3. Remove via the project package manager only (`npm uninstall <pkg>` — never hand-edit `package-lock.json`). Re-run `npm run check` + build after lockfile changes.
4. Do **not** remove: `@types/*` used by tests/types, `shadcn` (CLI), `@polar-sh/*` (billing), `@opentelemetry/api` (verify — likely instrumentation), `crisp-sdk-web` (support chat), anything referenced from scripts/configs/tests rather than source.

### Batch F — Assets (`public/`)
Reference-check every file from TS/TSX, CSS, metadata, `app/globals.css`, email templates, `next.config.ts`, HTML:
- Likely dead create-next-app defaults: `public/next.svg`, `public/vercel.svg`, `public/globe.svg`, `public/file.svg`, `public/window.svg` (verify favicon/metadata icons).
- Verify: `calendar.svg`, `mastercard.svg` (payments UI), `qrph.svg` (QR), `logo.svg`, `sw.js` (service worker — check registration), `ai-chat/*`, `brand/boardui_logo_circle.webp`, `fonts/ApfelGrotezk-*` (marketing CSS), `og/fallback.png` (`generate-og-fallback.ts` + `opengraph-image.tsx`), `marketing/dashboard-overview.png`, `templates/settings-plan-art.png`.
- Delete only zero-reference files. No aggressive CSS purge of `globals.css` tokens (dynamic classes); flag `space-*`/token debt to `DESIGN.md` Cleanup Targets instead of bulk-deleting.

### Batch G — Configuration and scripts
1. `package.json`: remove scripts whose targets are gone (e.g., scripts for deleted one-off tools); merge duplicate `test:e2e`/`test:e2e:full` (both run the full suite — keep one, verify docs/CI references first). Keep all `audit:*` + `check:*` wired scripts.
2. Only remove config files if the tool is unused AND nothing else requires them — expected outcome: everything wired (`next.config`, `tsconfig`, `eslint`, `postcss`, `vitest.*`, `playwright.config`, `drizzle.config`, `components.json`, `vercel.json`, `.gitignore`) stays.
3. Flag (don't fix) oddities in the report: `playwright.screenshots.config.ts` gitignored but referenced by `npm run screenshots`; `.claude/`, `.cursor/`, `.freebuff/`, `.workbuddy-ai/`, `.kilo/`, `.kiro/` local agent state (mostly gitignored by design — keep, note in report).

### Batch H — Debug/temporary code
1. `console.log`: remove debug-only logs; keep intentional/error logging and anything in `lib/ai/token-logger.ts`-style infrastructure.
2. `debugger` statements: remove all.
3. TODO/FIXME/HACK/TEMP: triage — keep meaningful future work, remove abandoned experiments.
4. Commented-out code blocks (5+ lines): delete where clearly historical (git is the record); keep explanatory comments describing current behavior.
5. Files matching `old|backup|copy|zz-|repro|temp|mock` patterns found in phase 2.

## 5. Phase 4 — Iteration

Repeat phases 2–3 until knip output contains only: legitimate (reachable), framework-required, dynamically referenced, externally referenced, development-only wired scripts, historical, or intentionally retained (BoardUI compat, catalog providers, dev scripts) items. Record each retained-with-reason entry.

## 6. Phase 5 — Final audit and report

1. Final independent scan answering the §48 checklist (unreachable files? unused components/exports/deps/assets? obsolete scripts/configs? AI/RAG/DB leftovers? commented code? duplicates? experiments?).
2. Write `docs/codebase-cleanup.md` using the §47 template (Objective / Initial state / Tools / Cleanup performed by category with real counts / Intentionally retained / Uncertain-but-kept / Verification / Final state / Notes). Keep it concise — audit trail, not prose.
3. Update docs that became inaccurate: `docs/technical-debt.md` (close the enum item; record the BoardUI decision; mark resolved items), any other doc the cleanup renders stale (e.g., scripts removed from `docs/development.md`). **Leave `AGENTS.md` untouched**; report inaccuracies separately per §43.
4. Final verification suite (§7) green.

## 7. Verification gates

After every batch:
1. `npm run check` (lint + typecheck + SEO audits + model catalog)
2. `npm run test` (unit + components)
3. `npm run build` after file-heavy or dependency batches
4. `git diff --check`

Final full run:
- `npm run test` → `npm run test:integration` (DB-backed) → `npm run build` → `npm run test:e2e:smoke`, plus spot checks of marketing pages, public inquiry/quote flows, admin console, emails rendering, and webhook routes that unit/integration tests may not cover.

## 8. Report-out

Final response must include: cleanup summary with **actual** counts (files/components/hooks/utilities/exports/deps/assets/scripts-config removed), major deletions, commands run + pass/fail, remaining candidates retained with reasons, `docs/codebase-cleanup.md` status, and a final assessment.

## Appendix — discovered candidates snapshot (verify before acting)

| Item | First impression | Decision path |
|---|---|---|
| `playwright.repro.config.ts`, `zz-back-nav-repro.spec.ts`, `check_migration.sql` | repro/diagnostic | remove (user-approved) |
| `features/dev-tools/` | dev-only panel in `app/layout.tsx` | remove if prod-gated |
| `scripts/apply-migration-0003|backfill-polar-subscription|billing-reset|db-nuke|debug-billing-events|fix-db|fix-plan-column|mark-migrations-applied|verify-index-usage|wipe-db|apply-performance-indexes-concurrently` | one-off dev scripts | verify refs → remove or keep w/ reason |
| `quote_post_acceptance_status` enum | dead enum (`technical-debt.md` §2) | migration 0030 + schema removal (user-approved) |
| `components/base/*` + `components/application/*` | BoardUI layer (technical-debt.md §3) | keep if reachable; remove only proven-unreachable pieces |
| `public/{next,vercel,globe,file,window}.svg` | create-next-app leftovers | reference check → remove if unreferenced |
| `framer-motion`×`motion`, `react-qr-code`×`qrcode.react`, `marked`×`react-markdown`, `pdf-lib`×`unpdf` | duplicate-purpose deps | usage evidence → remove loser |
| `docs/plans` (empty), `docs/prompts` (empty), vacated dirs | emptied by WIP | remove empty dirs; git records none if empty |
| `test:e2e` vs `test:e2e:full` | duplicate npm scripts | keep one, check CI/docs refs |