# Requo Codebase Cleanup

Audit trail for the dead-code removal pass on branch `cleanup/dead-code`.

## Objective

Reduce the repository to code that has a reason to exist — no behavior change, no
redesign, no architecture refactor. Framework entry points, migrations, security
controls, external contracts, and design-system foundations were preserved.

## Initial repository state

- Working tree carried a large uncommitted refactor (327 files); it was committed
  first as 13 logical commits (security hardening, account naming, migrations,
  inquiries, AI, admin console, analytics, quotes, docs reset, deps bump).
- Baseline before cleanup: `npm run check` ✅, `npm run test` ✅ after aligning
  three suites with shipped behavior (see `test: align menus and capacity
  selector`), `npm run build` ✅.
- Local dev server was running throughout; `.next/dev/types` and `.next/types`
  were cleared once because the generated route types were corrupt/stale.

## Analysis tools

- `npx knip@latest` (temporary, **not** added to `package.json`) for unused files,
  exports, types, dependencies, duplicate exports.
- Single-pass reference cross-checks over the whole repo for every candidate
  (path fragments, exact import specifiers, dynamic imports, config/JSON/docs
  references, npm scripts).
- `git log`/`grep` for history and intent; `tsc --noEmit`, `npm run check`,
  `npm test`, `npm run build` after each batch.

Knip findings were treated as leads only. All 114 unused-file candidates were
verified by reference; false positives (`public/sw.js`, `styles/typeset.css`,
documented scripts, `.agents/skills` assets, template-string references) were
retained rather than ignored via config. Unused-file count went 114 → 19, and
the 4 unused dependencies are gone.

## Cleanup performed

Totals across the cleanup commits: **124 files deleted**, 12 modified,
−14,292 / +23 lines.

### Deleted files

- **Dead dev/debug artifacts**: `features/dev-tools/**` (dev-only panel, 8 files)
  and its root-layout mount, `check_migration.sql`,
  `playwright.repro.config.ts`, `tests/e2e/zz-back-nav-repro.spec.ts`.
- **Orphaned dev API routes**: `app/api/dev/{ai-capacity,context,revalidate,routes,skeleton,switch-plan,timing}`
  (dev-only, 403 in production, only consumer was the removed panel).
- **Superseded analytics/dashboard surface**: `analytics-dashboard`,
  `analytics-tabbed-dashboard`, `analytics-free-panel`, `analytics-free-section`,
  `analytics-pro-section`, `analytics-business-section`, `analytics-nav-selector`,
  `annotation-marker`, `benchmark-indicator`, `campaign-performance-card`,
  `export-button`, `goal-threshold-overlay`, `mini-sparkline`,
  `pipeline-velocity-card`, `revenue-forecast-card`, `top-sources-card`,
  `analytics-funnel`, `features/analytics/config.ts`,
  `pipeline-velocity-query.ts`, `cohort-analysis-query.ts`,
  `queries/benchmarks.ts`, `utils/benchmark-comparison.ts`,
  `components/application/dashboard/revenue-chart-card.tsx`,
  `components/shell/nav-link-status.tsx`.
- **Unused feature components**: businesses (9: dashboard overview/velocity/
  activation/see-more/recently-opened/starter-template pickers/create dialog/
  copy-link/workflow-next-action), quotes (9 dialogs/panels/actions),
  follow-ups (4), inquiries (3 + `reply-snippet-types`), onboarding (4 +
  `personalization.ts`), settings (3), billing (3), auth (2),
  business-members (1), owner-assistant (1), paywall `lib/server-access.ts`.
- **Whole dead feature**: `features/data-export/**` (card, actions, service).
- **Unused libs**: `lib/openrouter/client.ts`, `lib/admin/auth.ts`,
  `lib/billing/feature-gate.ts` + `lib/billing/index.ts`,
  `lib/supabase/server.ts`, `lib/pdf/html-to-pdf.ts`, `lib/security/csrf.ts`,
  `lib/instant-navigation/{rollout,stale-times,migration-coverage}.ts`,
  `types/app.ts`.
- **Unused hooks**: `hooks/use-count-up.ts`, `hooks/use-md-screen.ts`.
- **Dead test fixtures**: `tests/support/fixtures/{billing,quotes}.ts`.
- **Unused stylesheets**: `styles/{globals,theme,typography}.css` (the BoardUI
  entry was never imported — `styles/typeset.css` stays, it is imported).
- **One-off scripts**: `apply-migration-0003`, `backfill-polar-subscription`,
  `debug-billing-events`, `fix-db`, `fix-plan-column`, `generate-og-fallback`,
  `verify-index-usage` (+ `.sql`), and — after explicit sign-off — the
  destructive local rescue tools `db-nuke`, `wipe-db`, `billing-reset`.
- **Sign-off removals**: `components/base/kbd/kbd.tsx`,
  `features/businesses/components/business-status-badge.tsx`,
  `features/admin/components/primitives/admin-error-state.tsx`, and
  `tests/support/third-party-mocks.ts` (its `fetch-guard.ts` message and
  `tests/README.md` note were reworded to stop pointing at it).
- **Unreferenced assets**: `public/{next,vercel,globe,file,window}.svg`,
  `public/{calendar,mastercard,qrph}.svg`.

### Deleted components / hooks / utilities

89 component/hook/utility files plus 10 modules with no remaining importer
(see above). Two files (`features/account/components/account-settings-nav.tsx`,
`features/account/navigation.ts`) completed a dead chain — they were the only
importers of the removed settings-nav components.

### Removed exports

- Deprecated alias `BusinessSwitcherPreview` (superseded by
  `HomeOverviewPreview`).
- Unused `quoteFollowUpEmailMergeTags`, `quoteFollowUpEmailMergeValues`,
  `quoteFollowUpEmailSampleMergeValues` (follow-up emails reuse the quote tags).
- Stale `vi.mock("sonner")` blocks in two component suites.
- knip still lists ~557 unused exports / 233 unused types; these are dominated by
  intentional barrel re-exports (`lib/ai/index.ts`, `lib/plans/index.ts`,
  `lib/email/index.ts`, …) and were deliberately left alone.

### Removed dependencies

`marked`, `react-qr-code`, `rough-notation`, `sonner` — all unreferenced
(toaster now renders the BoardUI notification stack; QR codes use
`qrcode.react`; markdown uses `react-markdown`). Removed via `npm uninstall`;
lockfile updated by the package manager.

### Removed configuration / scripts

No config files were deleted — every remaining config is wired to a live tool.
Eight one-off scripts were removed (list above). No npm script was removed.

## Intentionally retained

| Item | Why |
| --- | --- |
| `public/sw.js` | Registered at runtime by `features/notifications/push-client.ts` |
| `styles/typeset.css` | Imported by `app/globals.css` |
| `.agents/skills/**` assets (4) | Skill reference files, not application code |
| `scripts/bootstrap-admin.ts` | Referenced by `.env.example` + `docs/setup/deployment.md` |
| `scripts/mark-migrations-applied.ts` | Referenced by `docs/database-migrations.md` |
| `scripts/instant-navigation/check-coverage.ts` | Referenced by instant-navigation docs + registry |
| `scripts/apply-performance-indexes-concurrently.sql` | Companion SQL for kept migration tooling |
| `lib/dev/server-timing.ts` | Dev-gated `timed()` helper used across pages |
| `features/paywall/**` (except `lib/server-access.ts`) | Documented paywall system; still wired |
| `drizzle/**`, RLS, seeds | Migration history and DB lifecycle — never touched |

## Potentially dead but uncertain

- `.tmp-cache-audit.mjs`, `.tmp-verify-profile.mjs`, `tests/e2e/tmp-profile-name-save.spec.ts`,
  and the `features/account/*` + `features/theme/*` edits — in-flight local work
  from the parallel profile/theme change; not touched.
- Remaining knip duplicate export: `getAccountBillingOverview` (canonical) vs
  deprecated `getBusinessBillingOverview` (14 call sites). Resolving it is a
  rename refactor, out of scope here.
- Missing declared dependencies detected by knip — both resolved in a
  follow-up commit: `components/ui/checkbox.tsx` now imports the unified
  `radix-ui` package like the other 19 primitives (instead of the undeclared
  hoisted `@radix-ui/react-checkbox`), and `@ai-sdk/provider` is declared in
  `package.json` since three AI modules import it directly.

## Verification

Run on `cleanup/dead-code` after the final batch:

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | ✅ clean |
| `npm run check` (lint + typecheck + SEO audits + model catalog) | ✅ |
| `npm run test` (93 unit files / 767 tests, 25 component files / 170 tests) | ✅ |
| `npm run build` (production, Next 16.3.5) | ✅ all routes compiled |
| `npx knip` | unused files 114 → 19 (all justified keeps) |

Not run here because they need a local database and a running app:
`npm run test:integration`, `npm run test:e2e:smoke`. Run them before merging.

## Notes

- Recommended follow-ups: add `knip.json` (entries for `app/**`, `scripts/**`,
  test configs; ignore `.agents/**`) if the check should run in CI — it is not
  installed as a dependency on purpose.
- Approved but **not yet executed**: dropping the unused
  `quote_post_acceptance_status` enum (`docs/technical-debt.md` §2) via a
  dedicated `0030` migration. It is a schema change and should ship on its own.
