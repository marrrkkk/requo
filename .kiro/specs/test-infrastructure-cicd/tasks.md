# Implementation Plan: Test Infrastructure and CI/CD

Convert the feature design into a series of prompts for a code-generation LLM that will implement each step with incremental progress. Make sure that each prompt builds on the previous prompts, and ends with wiring things together. There should be no hanging or orphaned code that isn't integrated into a previous step. Focus ONLY on tasks that involve writing, modifying, or testing code.

## Overview

This plan rebuilds `tests/`, the runner configs, CI scripts, and `.github/workflows/ci.yml` as a non-destructive evolution of the current infrastructure. Work flows bottom-up:

1. Consolidate shared helpers under `tests/support/` (prefix, env, fetch guard, DOM stubs, DB client, fixtures, third-party mocks).
2. Layer in structural guards (layout, secrets, outbound-http, timing, residue).
3. Update Vitest, Playwright, and `package.json` scripts without swapping runners.
4. Ship the CI workflow changes in two passes: merge-gate jobs first, non-gating `preview-smoke` second.
5. Document everything in `tests/README.md` and `docs/ci-cd.md`.

Implementation language is TypeScript (matching the existing Vitest + Playwright stack) with Node scripts (`.mjs`) and a small Bash helper for CI-only work.

## Tasks

- [x] 1. Establish `tests/support/` foundation for shared helpers
  - [x] 1.1 Create `tests/support/prefix.ts` with `derivePerFilePrefix`
    - Normalize a file path's basename (sans extension) to `[a-zA-Z0-9][a-zA-Z0-9_]*` by collapsing non-alphanumerics to `_` and trimming leading/trailing underscores
    - Fall back to `"test"` when normalization yields an empty string
    - _Requirements: 1.2, 10.3, 10.12_

  - [ ]* 1.2 Write property tests for per-file prefix derivation
    - **Property 1: Per-file prefix is identifier-safe**
    - **Property 2: Per-file prefix is stable across directory changes**
    - Use `fast-check` with at least 100 runs; tag each test with `// Feature: test-infrastructure-cicd, Property N: ...`
    - Place at `tests/unit/test-infra/prefix.test.ts`
    - **Validates: Requirements 10.3, 10.4, 10.12**

  - [x] 1.3 Create `tests/support/env.ts` with `applyTestEnv`
    - Seed `Test_Secret_Placeholder` defaults for `BETTER_AUTH_SECRET`, `APP_ENCRYPTION_KEYS`, `APP_TOKEN_HASH_SECRET`, Better Auth URLs, `DATABASE_URL`, Supabase keys, and empty strings for Resend/Groq/Gemini/OpenRouter/Paddle credentials
    - Only set values that are currently `undefined`; never overwrite values supplied by the caller
    - _Requirements: 2.9, 11.1, 11.3_

  - [x] 1.4 Create `tests/support/fetch-guard.ts` with `installFetchGuard`
    - Monkey-patch `globalThis.fetch` to reject any request whose hostname is not `127.0.0.1` or `localhost`
    - Error message must name the blocked hostname and point the reader at `tests/support/third-party-mocks.ts`
    - Delegate to the original `fetch` for local hostnames with the same arguments
    - _Requirements: 7.3, 7.4_

  - [ ]* 1.5 Write property tests for the fetch guard
    - **Property 6: Fetch guard blocks non-local hosts**
    - **Property 7: Fetch guard passes through local hosts**
    - Place at `tests/unit/test-infra/fetch-guard.test.ts`
    - **Validates: Requirements 7.3, 7.4**

  - [x] 1.6 Extract DOM stubs into `tests/support/dom-stubs.ts`
    - Move `ResizeObserver`, `PointerEvent`, `scrollIntoView`, and `matchMedia` stubs out of `tests/setup.ts` into `installDomStubs()`
    - Keep behavior identical for Radix-driven component tests
    - _Requirements: 1.2_

  - [x] 1.7 Move the integration DB client to `tests/support/db.ts`
    - Relocate `tests/integration/db.ts` so non-integration tiers can import schema types without crossing the unit/integration boundary
    - Re-export `testDb` and `closeTestDb` from the new path; remove the old file
    - _Requirements: 1.2, 5.2_

  - [x] 1.8 Rewrite `tests/setup.ts` to compose env, DOM stubs, and the fetch guard
    - Call `applyTestEnv()` first, then `installDomStubs()`, then `installFetchGuard()`
    - Keep `@testing-library/jest-dom` side-effect import at the top
    - _Requirements: 1.5, 2.9, 7.3, 7.4, 11.3_

- [x] 2. Consolidate fixture factories and third-party client mocks under `tests/support/`
  - [x] 2.1 Move the workflow fixture to `tests/support/fixtures/workflow.ts`
    - Relocate `tests/integration/workflow-fixtures.ts` and adjust imports
    - Ensure `createWorkflowFixture(prefix)` calls `cleanupWorkflowFixture(prefix)` before inserting any rows
    - Cover every table in Requirement 10.4 during cleanup
    - Namespace all identifiers by the caller's `Per_File_Prefix` per the data-model section of the design
    - _Requirements: 5.11, 5.12, 10.3, 10.4, 10.9_

  - [ ]* 2.2 Write property tests for the workflow fixture
    - **Property 3: Workflow fixture rows are namespaced by prefix**
    - **Property 4: Workflow fixture create-then-cleanup is a round trip**
    - **Property 5: Workflow fixture create is idempotent**
    - Place at `tests/integration/test-infra/workflow-fixture.test.ts`; run against the real Test_Database
    - **Validates: Requirements 5.13, 10.3, 10.4, 10.9, 10.12**

  - [x] 2.3 Create `tests/support/fixtures/billing.ts`
    - Implement `createBillingFixture(prefix, states)` and `cleanupBillingFixture(prefix)` for `active`, `past_due`, `canceled`, and `grace_period`
    - Route all writes through `lib/billing/subscription-service.ts` so `businesses.plan` stays in sync; never issue raw SQL
    - Produce deterministic IDs shaped `${prefix}_sub_${state}` and `${prefix}_account`
    - _Requirements: 5.11, 10.5, 10.9_

  - [ ]* 2.4 Write property test for the billing fixture round trip
    - **Property 11: Billing fixture round trip for supported states**
    - Place at `tests/integration/test-infra/billing-fixture.test.ts`
    - **Validates: Requirements 10.5, 10.9**

  - [x] 2.5 Create `tests/support/fixtures/quotes.ts`
    - Implement `createQuoteFixture(prefix, states, workflow)` for every `QuoteFixtureState`
    - Produce deterministic public tokens shaped `${prefix}_token_${state}`
    - Implement `cleanupQuoteFixture(prefix)` covering `quotes` and `quote_items`
    - _Requirements: 5.6, 5.7, 5.11, 10.6, 10.9_

  - [ ]* 2.6 Write property test for the quote fixture round trip
    - **Property 10: Quote fixture round trip for supported states**
    - Place at `tests/integration/test-infra/quote-fixture.test.ts`
    - **Validates: Requirements 10.6, 10.9**

  - [x] 2.7 Create `tests/support/third-party-mocks.ts`
    - Export `mockResend`, `mockGroq`, `mockGemini`, `mockOpenRouter`, `mockPaddle`, `mockSupabaseStorage`, and `mockAllThirdParties`
    - Each wrapper targets the Requo-side module path (for example `@/lib/email/resend-client`), never the SDK's npm name
    - _Requirements: 7.3, 11.4_

  - [x] 2.8 Repoint existing integration tests to import from `tests/support/`
    - Replace imports of `tests/integration/workflow-fixtures` with `@/tests/support/fixtures/workflow`
    - Replace imports of `tests/integration/db` with `@/tests/support/db`
    - Leave behavior unchanged; this is an import-path migration
    - _Requirements: 1.2, 5.12_

- [x] 3. Checkpoint — support helpers and fixtures are green
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Add structural guards and the residue check
  - [x] 4.1 Implement layout verifier at `tests/unit/_guards/layout.test.ts`
    - Recursively scan `tests/`; fail with the absolute paths of every `*.test.ts`, `*.test.tsx`, or `*.spec.ts` outside the four allowed folders
    - _Requirements: 1.1, 1.7_

  - [ ]* 4.2 Write property test for the layout verifier
    - **Property 8: Layout verifier flags every misplaced test file**
    - Use synthetic in-memory trees; place at `tests/unit/test-infra/layout-verifier.test.ts`
    - **Validates: Requirement 1.7**

  - [x] 4.3 Implement secret-leakage scanner at `tests/unit/_guards/secrets.test.ts`
    - Walk `tests/`, `reports/`, `playwright-report/`, and `test-results/`
    - Fail with the absolute path of any file that contains the verbatim value of any known `Test_Secret_Placeholder`
    - Exclude binary and media files from the scan to keep the run fast
    - _Requirements: 11.6, 12.1, 12.2_

  - [ ]* 4.4 Write property test for the secret-leakage scanner
    - **Property 9: Secret-leakage scanner flags every file containing a placeholder**
    - Place at `tests/unit/test-infra/secret-scanner.test.ts`
    - **Validates: Requirement 11.6**

  - [x] 4.5 Implement outbound-http self-test at `tests/unit/_guards/outbound-http.test.ts`
    - Install the guard on a disposable `globalThis.fetch`, call `fetch("https://example.com")`, and assert the error message contains `Blocked request to example.com`
    - _Requirements: 7.4_

  - [x] 4.6 Implement timing guard at `tests/unit/_guards/timing.test.ts`
    - Record per-test durations via `onTestFinished`/`afterAll` hooks
    - Fail the run when a Vitest test exceeds 30s or a Component_Test exceeds 10s without an explicit per-test timeout and a justification comment on the preceding line
    - _Requirements: 4.7, 6.11, 7.8_

  - [x] 4.7 Implement integration residue check at `tests/integration/_afterAll/residue.test.ts`
    - Run last in the integration suite
    - Select rows from the Requirement 10.4 cleanup table set whose identifiers match any known `Per_File_Prefix`; fail with the offending Test_File and each affected table
    - _Requirements: 5.13, 10.4, 10.9_

- [x] 5. Update Vitest configuration
  - [x] 5.1 Extract shared coverage excludes into a reusable constant
    - New module (for example `vitest.shared.ts`) exporting `COVERAGE_EXCLUDES`: `tests/`, `**/*.config.*`, `**/layout.tsx`, `**/page.tsx`
    - _Requirements: 12.3_

  - [x] 5.2 Update `vitest.config.ts` for unit and component tiers
    - jsdom environment, `server-only` stub, `@` alias, shared coverage excludes
    - Add `reporters: [['default'], ['json', { outputFile: 'reports/vitest-verify.json' }]]`
    - Set `testTimeout: 30_000`; document the 10s component guideline is enforced by `tests/unit/_guards/timing.test.ts`
    - Wire `setupFiles` to `tests/setup.ts`
    - _Requirements: 1.4, 1.5, 1.6, 4.7, 7.8, 12.1, 12.3, 12.5_

  - [ ]* 5.3 Write unit test that parses `vitest.config.ts`
    - Assert environment, `server-only` alias, `@` alias, coverage excludes, and reporter configuration
    - Place at `tests/unit/test-infra/vitest-config.test.ts`
    - _Requirements: 1.4, 1.5, 1.6, 12.1, 12.3_

  - [x] 5.4 Update `vitest.integration.config.ts` for the node tier
    - node environment, `@` alias, shared coverage excludes
    - Add `reporters: [['default'], ['json', { outputFile: 'reports/vitest-integration.json' }]]`
    - _Requirements: 1.4, 1.6, 5.1, 5.2, 12.2, 12.3_

  - [ ]* 5.5 Write unit test that parses `vitest.integration.config.ts`
    - Assert node environment, `@` alias, coverage excludes, and reporter configuration
    - Extend `tests/unit/test-infra/vitest-config.test.ts` or add a sibling spec
    - _Requirements: 1.4, 1.6, 12.2, 12.3_

- [x] 6. Update Playwright configuration and smoke tagging
  - [x] 6.1 Update `playwright.config.ts` with the runtime mode switch
    - When `PLAYWRIGHT_BASE_URL` is set: use it as `baseURL`, omit `webServer`, skip migrations and seeds
    - When unset: preserve the current `webServer` command that runs `npm run db:migrate && npm run db:seed-demo && npm run dev:app -- --hostname 127.0.0.1 --port <port>`
    - Keep `retries: process.env.CI ? 1 : 0`, `trace: 'retain-on-failure'`, `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`
    - Reporters: `list` + `html` (`open: 'never'`) + `json` at `reports/playwright.json` for flake parsing
    - _Requirements: 6.6, 6.7, 6.8, 6.11, 7.5, 9.5_

  - [ ]* 6.2 Write unit test that parses `playwright.config.ts`
    - Cover both local and preview modes by toggling `PLAYWRIGHT_BASE_URL`; assert `webServer` presence/absence and resolved `baseURL`
    - Place at `tests/unit/test-infra/playwright-config.test.ts`
    - _Requirements: 6.6, 6.7, 9.5_

  - [x] 6.3 Create `tests/e2e/smoke-registry.ts` and enforce tag usage
    - Map `@smoke` tags to the five required workflows (sign-in, non-member denial, public inquiry, quote creation/sending, public quote response)
    - Wire a Playwright `beforeAll` hook that fails any spec tagging `@smoke` without appearing in the registry
    - _Requirements: 6.9, 6.10_

  - [x] 6.4 Ensure the five smoke specs exist and are tagged
    - Confirm `tests/e2e/auth-and-dashboard.spec.ts`, `tests/e2e/public-inquiry.spec.ts`, `tests/e2e/dashboard-workflows.spec.ts`, and `tests/e2e/public-quote.spec.ts` cover every workflow in Requirements 6.1 through 6.5
    - Reference seeded data only through demo-seed named exports (for example `DEMO_QUOTE_PUBLIC_TOKEN`)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.10, 10.7_

- [x] 7. Add local-developer and CI helper scripts
  - [x] 7.1 Create `scripts/test/check-db.mjs`
    - Exit non-zero with a message containing `DATABASE_URL` when the env var is unset or when a TCP probe to the Postgres host fails within 10s
    - Exit 0 otherwise
    - _Requirements: 2.8_

  - [x] 7.2 Create `scripts/test/run-sequential.mjs`
    - Accept two npm script names; always run both even when the first exits non-zero
    - Exit with the first non-zero code among the two, or 0 if both pass
    - _Requirements: 2.3, 2.7_

  - [x] 7.3 Create `scripts/ci/wait-for-postgres.sh`
    - Poll `pg_isready -h 127.0.0.1 -p 5432 -U postgres -d requo` every 2s up to 120s
    - Exit non-zero with an error message identifying the Postgres service when the budget runs out
    - _Requirements: 8.8, 8.9_

  - [x] 7.4 Create `scripts/ci/resolve-preview-url.mjs`
    - Read `DEPLOYMENT_PAYLOAD` and prefer `deployment_status.target_url`
    - Fall back to the Vercel REST API filtered by `gitCommitSha` using `VERCEL_TOKEN` and `VERCEL_PROJECT_ID`
    - Total resolution budget 60s; write `url=<resolved>` to `$GITHUB_OUTPUT`; fail non-zero when neither source yields a URL
    - _Requirements: 9.2, 9.3_

  - [ ]* 7.5 Write unit tests for the helper scripts
    - Cover `check-db.mjs`, `run-sequential.mjs`, `wait-for-postgres.sh`, and `resolve-preview-url.mjs`
    - Place at `tests/unit/test-infra/ci-scripts.test.ts`
    - _Requirements: 2.3, 2.7, 2.8, 8.8, 8.9, 9.2, 9.3_

- [x] 8. Update `package.json` scripts
  - [x] 8.1 Wire `test` and `check` through `run-sequential.mjs`
    - `test`: runs `test:unit` then `test:components`; both halves always run
    - `check`: runs `lint` then `typecheck`; both halves always run
    - _Requirements: 2.3, 2.7_

  - [x] 8.2 Prepend `check-db.mjs` to `test:integration` and the local `test:e2e:smoke` path
    - Keep `test:integration` pipeline as: `check-db` → `db:migrate` → Vitest integration run against the node config
    - For `test:e2e:smoke`, only enforce `check-db` when `PLAYWRIGHT_BASE_URL` is unset so preview runs skip the guard
    - _Requirements: 2.4, 2.5, 2.8, 10.1, 10.2_

  - [x] 8.3 Update `test:coverage` to emit v8 text and HTML reports with shared excludes
    - Fail with a clear error identifying the missing format when either report does not materialize
    - Keep coverage non-blocking during the rollout (report-only)
    - _Requirements: 12.3, 12.4, 12.5, 12.6_

- [x] 9. Checkpoint — runner configs and local scripts are green
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Update the GitHub Actions workflow
  - [x] 10.1 Update `verify` and `server-tests` merge-gate jobs
    - Replace `npm run test` with `npm run test:coverage` in the verify job
    - Add `actions/upload-artifact` steps with `if: always()`, `retention-days: 14`, and `if-no-files-found: ignore`
    - Artifact names use `${{ github.sha }}` truncated to 7 chars: `verify-reports-<sha7>`, `integration-reports-<sha7>`, `playwright-report-smoke-<sha7>`
    - Add a "Wait for Postgres" step that runs `./scripts/ci/wait-for-postgres.sh` before integration tests, with its own 2-minute timeout
    - Add a post-run "Annotate flakes" step that parses the Playwright JSON reporter and emits flake markers to `$GITHUB_STEP_SUMMARY` so a run cannot display green without the flake annotation
    - Preserve `permissions: contents: read`, `concurrency: cancel-in-progress`, job timeouts of 20 and 25 minutes, and the `postgres:16` service with deterministic `postgres:postgres` credentials
    - _Requirements: 7.5, 7.6, 7.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 11.1, 11.2, 11.5, 11.7, 12.1, 12.2, 12.5, 12.7, 12.8_

  - [x] 10.2 Add the non-gating `preview-smoke` job
    - Trigger on `deployment_status` when `state == 'success'` and `environment == 'preview'`
    - Check out `${{ github.event.deployment.sha }}` so tests match the deployed commit
    - Resolve the preview URL via `node scripts/ci/resolve-preview-url.mjs` with a 1-minute step timeout
    - Run `npm run test:e2e:smoke` with `PLAYWRIGHT_BASE_URL` set, step timeout 10 minutes
    - `continue-on-error: true` during rollout; upload `playwright-report-preview-<sha7>` with 14-day retention
    - Annotate flakes in the PR summary using the same post-run parser as `server-tests`
    - Add a sibling failure-path that comments a link to the Vercel deployment logs when Vercel reports a failed preview deployment
    - _Requirements: 7.6, 7.7, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.9, 12.7_

  - [ ]* 10.3 Write unit test that parses `.github/workflows/ci.yml`
    - Use `js-yaml` to load the workflow; assert jobs, triggers, timeouts, permissions, Postgres service config, artifact retention, and the `preview-smoke` non-gating status during rollout
    - Place at `tests/unit/test-infra/ci-workflow.test.ts`
    - _Requirements: 8.1, 8.4, 8.7, 8.8, 8.10, 9.7, 11.1, 11.2, 11.5, 11.7, 12.7_

- [x] 11. Write contributor documentation
  - [x] 11.1 Create `tests/README.md`
    - Enumerate the four tiers plus `tests/support/`; one-paragraph purpose and one example command per tier
    - Document the fixtures (`Workflow_Fixture`, `createBillingFixture`, `createQuoteFixture`), the `Per_File_Prefix` rule, and a concrete derivation example such as `derivePerFilePrefix("quote-mutations.test.ts") === "quote_mutations"`
    - List environment variables for each command from Requirement 2 grouped under "required for the test run" and "required only for demo seeding"
    - Link back to the design document
    - _Requirements: 1.8, 13.1, 13.2, 13.3, 13.4_

  - [x] 11.2 Create `docs/ci-cd.md`
    - List every job (`verify`, `server-tests`, `preview-smoke`) with triggers, timeouts, and merge-gate status
    - Describe the preview URL resolution order (`deployment_status` payload → Vercel API fallback, combined 60s budget)
    - Document the ten-consecutive-green promotion path for `preview-smoke` to become a merge gate
    - Cover how to rerun a failed job through the GitHub Actions UI and the `gh run rerun <run-id>` CLI equivalent
    - _Requirements: 9.8, 13.5, 13.6, 13.7_

- [x] 12. Final checkpoint — full verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; they carry property tests and config-parsing tests that protect the invariants in the design's Correctness Properties and Testing Strategy sections.
- Every sub-task references the requirements or properties it covers for traceability.
- Checkpoints sit at the boundaries between infrastructure layers so a broken layer does not hide behind a green top-level job.
- `package.json` and `.github/workflows/ci.yml` are edited across multiple waves intentionally to keep each diff surgical; the dependency graph sequences those edits to avoid merge conflicts.
- Work stays inside `tests/`, `scripts/`, `.github/`, `docs/`, and the three runner configs. No product-code changes are required beyond re-pointing imports in integration tests.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3", "1.4", "1.6", "1.7", "5.1", "6.3", "7.1", "7.2", "7.3", "7.4"] },
    { "id": 1, "tasks": ["1.8", "2.1", "2.3", "2.5", "2.7", "5.2", "5.4", "6.1", "8.1"] },
    { "id": 2, "tasks": ["1.2", "1.5", "2.2", "2.4", "2.6", "2.8", "4.1", "4.3", "4.5", "4.6", "4.7", "5.3", "5.5", "6.2", "6.4", "7.5", "8.2"] },
    { "id": 3, "tasks": ["4.2", "4.4", "8.3", "10.1", "11.1", "11.2"] },
    { "id": 4, "tasks": ["10.2"] },
    { "id": 5, "tasks": ["10.3"] }
  ]
}
```
