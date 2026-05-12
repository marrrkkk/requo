# Requirements Document

## Introduction

This feature rebuilds the Requo automated test suite and continuous integration/continuous delivery pipeline so that merge gates, preview deployments, and production deployments are all backed by a predictable, behavior-focused, Vercel-aware test strategy.

The rebuild replaces the existing `tests/unit/`, `tests/components/`, `tests/integration/`, and `tests/e2e/` folders with a fresh organization that mirrors product risk: schema boundaries, authorization, the inquiry → quote → share/send → follow-up → viewed/accepted/rejected workflow, billing webhooks, public pages, and account subscription state. It also replaces the current `.github/workflows/ci.yml` with a workflow that owns merge gates (lint, typecheck, unit, component, build, DB-backed integration, and Playwright smoke) while Vercel keeps ownership of preview and production deployments.

Scope for this feature:

- Test runner configuration (Vitest for unit/component/integration, Playwright for end-to-end) and a single, documented test directory layout.
- A new test suite organized by product risk tier, with deterministic fixtures and cleanup, covering schema validation, server actions, route handlers, authorization, public pages, and billing webhooks.
- A GitHub Actions workflow that enforces merge gates on pull requests and pushes to default branches, uses a Postgres service for integration and Playwright smoke tests, caches dependencies, and surfaces artifacts for failures.
- Integration with Vercel: preview and production deploys remain owned by Vercel, but the CI workflow runs a post-deploy smoke check against the Vercel preview URL for pull requests.
- A documented local developer workflow (`npm` scripts and environment variables) that mirrors the CI gates.

Out of scope for this feature:

- Changes to product code other than test-only touch points (factories, mocks, exported test helpers).
- Introducing a new test runner or a new component testing framework beyond Vitest + Testing Library.
- Load testing, chaos testing, accessibility audits beyond existing Playwright assertions, visual regression testing, and mutation testing.
- Vercel project configuration changes (environment variables on Vercel, build command overrides, preview branch rules) beyond reading the preview deployment URL.
- New CI providers or self-hosted runners.

## Glossary

- **Test_Suite**: The complete set of automated tests under `tests/` including unit, component, integration, and end-to-end tests.
- **Test_File**: A source file whose basename matches `*.test.ts`, `*.test.tsx`, or `*.spec.ts` under `tests/`.
- **Unit_Test**: A Vitest test under `tests/unit/` that exercises a pure function, schema, or module in isolation without a database, network, or browser.
- **Component_Test**: A Vitest + Testing Library test under `tests/components/` that renders a React component in `jsdom` and asserts on user-visible behavior.
- **Integration_Test**: A Vitest test under `tests/integration/` that runs in a Node environment against a real Postgres database and exercises server actions, mutations, queries, or route handlers.
- **E2E_Test**: A Playwright test under `tests/e2e/` that drives the full application through a headless browser against a running Next.js server.
- **Smoke_Test**: An E2E_Test tagged with `@smoke` that covers one of the required smoke workflows and must pass on every merge gate.
- **CI_Workflow**: The GitHub Actions workflow defined at `.github/workflows/ci.yml` that enforces merge gates.
- **Merge_Gate**: A required CI_Workflow job (`verify`, `server-tests`) whose success is required for a pull request to be merged into `main` or `master`.
- **Verify_Job**: The CI_Workflow job that runs lint, typecheck, unit tests, component tests, and the production build.
- **Server_Tests_Job**: The CI_Workflow job that runs integration tests and smoke end-to-end tests against a Postgres service container.
- **Preview_Smoke_Job**: The CI_Workflow job that runs smoke end-to-end tests against a Vercel preview deployment URL for pull requests.
- **Vercel_Preview**: A deployment created by Vercel for a pull request, reachable at a unique Vercel URL.
- **Test_Database**: A Postgres 16 database used exclusively by integration and smoke tests, seeded through `npm run db:migrate` and `npm run db:seed-demo`.
- **Fixture_Factory**: An exported function in `tests/support/` that creates deterministic, cleanup-safe test data for integration tests and returns the created identifiers to the caller.
- **Workflow_Fixture**: A Fixture_Factory that creates the standard owner/manager/staff/outsider users, two businesses, and seeded inquiries used across workflow integration tests.
- **Authorization_Test**: An Integration_Test that asserts that a business-scoped server action, query, or route handler refuses access to non-members, archived businesses, and cross-business identifiers.
- **Schema_Test**: A Unit_Test that exercises a Zod schema used for external input at an inquiry, quote, billing, or route handler boundary.
- **Round_Trip_Test**: A Unit_Test that asserts `decode(encode(value)) === value` or an equivalent parse/print property for a serializer or parser across at least three representative values.
- **Pure_Utility**: An exported function whose output depends only on its arguments and that performs no database, file system, network, clock, or randomness side effects at call time.
- **Input_Boundary**: A public inquiry submission handler, quote creation action, public quote response handler, billing webhook route handler, or any route handler that parses external request input through a Zod schema.
- **Test_Artifact**: A file produced by a test run that is uploaded by the CI_Workflow for debugging, including Playwright traces, HTML reports, and Vitest reporter output.
- **Flaky_Test**: An automated test that passes and fails non-deterministically across repeated runs of the same commit against the same environment.
- **Secret_Variable**: A CI_Workflow environment value sourced from the GitHub Actions `secrets:` context rather than plaintext workflow YAML.
- **Test_Secret_Placeholder**: A deterministic, non-empty ASCII string of at least 32 characters, disjoint from any production secret store, used for values such as `BETTER_AUTH_SECRET`, `APP_ENCRYPTION_KEYS`, and `APP_TOKEN_HASH_SECRET` during local and CI test runs.
- **Per_File_Prefix**: An identifier-safe prefix derived from the test file's basename without extension, used by Fixture_Factory to namespace all generated rows.

## Requirements

### Requirement 1: Test directory layout and runner configuration

**User Story:** As a Requo engineer, I want a single documented test directory layout and runner configuration, so that I can find and run the right tests without guessing.

#### Acceptance Criteria

1. THE Test_Suite SHALL place every Test_File under exactly four top-level folders: `tests/unit/`, `tests/components/`, `tests/integration/`, and `tests/e2e/`.
2. THE Test_Suite SHALL place every helper, factory, or mock module imported by two or more Test_Files under `tests/support/` and SHALL NOT place such shared modules alongside Test_Files.
3. THE Test_Suite SHALL use Vitest as the runner for `tests/unit/`, `tests/components/`, and `tests/integration/`, and Playwright as the runner for `tests/e2e/`.
4. THE Test_Suite SHALL configure Vitest to use the `jsdom` environment for `tests/unit/` and `tests/components/`, and the `node` environment for `tests/integration/`.
5. WHEN Vitest executes a Unit_Test or Component_Test, THE Test_Suite SHALL stub the `server-only` module so that server code imports resolve without throwing and the run continues to completion.
6. THE Test_Suite SHALL expose the `@` path alias resolving to the repository root in every Vitest configuration file.
7. IF any Test_File matching `*.test.ts`, `*.test.tsx`, or `*.spec.ts` exists outside the four folders listed in criterion 1, THEN THE Test_Suite SHALL exit with a non-zero status code and SHALL emit an error message containing the absolute path of the offending Test_File.
8. THE Test_Suite SHALL include a `tests/README.md` that lists the four folder names from criterion 1, the purpose of each folder, the Vitest environment or Playwright runner used, and the purpose of `tests/support/`.

### Requirement 2: Local developer scripts mirror CI gates

**User Story:** As a Requo engineer, I want local `npm` scripts that run the same checks as CI, so that I can reproduce CI failures without pushing commits.

#### Acceptance Criteria

1. THE Test_Suite SHALL expose `npm run test:unit` that runs Vitest in a single non-watch run against only the Test_Files under `tests/unit/` and exits with the Vitest exit code.
2. THE Test_Suite SHALL expose `npm run test:components` that runs Vitest in a single non-watch run against only the Test_Files under `tests/components/` and exits with the Vitest exit code.
3. WHEN `npm run test` is invoked, THE Test_Suite SHALL run `npm run test:unit` and then `npm run test:components` regardless of the exit code of `npm run test:unit`, and SHALL exit with a non-zero code if either sub-command exits non-zero.
4. WHEN `npm run test:integration` is invoked, THE Test_Suite SHALL run `npm run db:migrate` first and, IF `npm run db:migrate` exits non-zero, SHALL exit non-zero without executing any Integration_Test; otherwise THE Test_Suite SHALL run Vitest in a non-watch run against only the Test_Files under `tests/integration/` using the Test_Database.
5. THE Test_Suite SHALL expose `npm run test:e2e:smoke` that runs Playwright in a single non-watch run against only E2E_Tests tagged `@smoke` and exits with the Playwright exit code.
6. THE Test_Suite SHALL expose `npm run test:e2e` that runs Playwright in a single non-watch run against every E2E_Test under `tests/e2e/` and exits with the Playwright exit code.
7. WHEN `npm run check` is invoked, THE Test_Suite SHALL run `npm run lint` and then `npm run typecheck` regardless of the exit code of `npm run lint`, and SHALL exit with a non-zero code if either sub-command exits non-zero.
8. IF any of the scripts in criteria 4, 5, 6 requires a database and `DATABASE_URL` is unset, empty, or the referenced Postgres instance is not reachable within 10 seconds, THEN THE Test_Suite SHALL exit with a non-zero status code and SHALL emit an error message containing the string `DATABASE_URL`.
9. THE Test_Suite SHALL complete `npm run test`, `npm run test:integration`, and `npm run test:e2e:smoke` successfully when every third-party API credential for Resend, Groq, Gemini, OpenRouter, PayMongo, Paddle, and Supabase storage is set to an empty string or a Test_Secret_Placeholder.

### Requirement 3: Unit test scope and quality

**User Story:** As a Requo engineer, I want unit tests that focus on behavior at external input boundaries and on pure logic, so that I catch regressions without testing implementation details.

#### Acceptance Criteria

1. THE Test_Suite SHALL include a Schema_Test for every Zod schema exported from files located at an Input_Boundary under `app/api/`, `features/inquiries/`, `features/quotes/`, `features/billing/`, or their `schemas.ts` modules.
2. WHEN a Schema_Test exercises an input schema, THE Schema_Test SHALL assert at least one accepted input and at least one rejected input per Zod constraint type present on that schema (`min`, `max`, `length`, `regex`, `email`, `url`, `uuid`, `enum`, `refine`, required versus optional fields), and SHALL include boundary-value assertions for any numeric or string length bounds.
3. THE Test_Suite SHALL include a Unit_Test for every Pure_Utility exported from `lib/` and `features/` whose output varies with input, and the covered Pure_Utilities SHALL include price rounding, currency conversion, slug generation, token parsing, plan access resolution, and workflow status transitions.
4. WHEN a Unit_Test covers a Pure_Utility, THE Unit_Test SHALL assert on at least one nominal input, at least one boundary-value input where a boundary exists, and at least one invalid-input path if the Pure_Utility documents an error case.
5. WHERE a Pure_Utility parses or serializes a data format (JSON, CSV, PDF metadata, URL query strings, public token strings), THE Test_Suite SHALL include a Round_Trip_Test that asserts `parse(format(value))` equals `value` for at least three representative values covering empty, typical, and edge cases.
6. IF a Unit_Test imports a module that reaches the database, file system, network, system clock, or random source at import time, THEN THE Test_Suite SHALL exit non-zero and SHALL emit an error message naming the importing Test_File and the offending module specifier.
7. THE Test_Suite SHALL NOT include a Unit_Test that asserts on rendered HTML, React output, or DOM structure.
8. THE Test_Suite SHALL NOT include a Unit_Test whose module under test is a pure re-export (a file whose source consists only of `export` statements forwarding another module) or whose assertions only exercise third-party library behavior.

### Requirement 4: Component test scope and quality

**User Story:** As a Requo engineer, I want component tests that only cover meaningful user interaction or auth/payment state, so that the component suite stays fast and non-brittle.

#### Acceptance Criteria

1. THE Test_Suite SHALL include a Component_Test for a component only WHEN that component has at least one of: user interaction that changes local React state, a server action invocation, a client-side navigation, or a rendered output that varies with authentication or subscription plan.
2. WHEN a Component_Test asserts on rendered output, THE Component_Test SHALL use Testing Library queries by accessible role, accessible name, label text, placeholder, or visible text as the primary selector, and SHALL NOT use a CSS class selector or a `data-testid` selector as the primary selector.
3. THE Test_Suite SHALL NOT include a Component_Test that is a shallow render test, a snapshot-only test, or a test whose only assertion is the presence of non-interactive layout elements (wrappers, icons, purely decorative headings).
4. WHEN a Component_Test depends on a server action module, the Next.js client router, the Better Auth client, or a toast library, THE Component_Test SHALL mock that module through `vi.mock` at the module specifier exactly matching the component's import path.
5. THE Test_Suite SHALL include a Component_Test for at least the login form, the public inquiry form, the quote editor, the send-quote dialog, and the command menu with a paywalled export.
6. WHEN a Component_Test simulates user input, THE Component_Test SHALL use `@testing-library/user-event` and SHALL NOT dispatch synthetic DOM events directly.
7. THE Test_Suite SHALL fail the Vitest run if any single Component_Test takes longer than 10 seconds to execute, unless that Component_Test is annotated with an explicit per-test timeout and a justification comment on the preceding line.

### Requirement 5: Integration test scope and authorization coverage

**User Story:** As a Requo engineer, I want DB-backed integration tests that cover authorization and the workflow state machine, so that business-scoped behavior is protected against regressions.

#### Acceptance Criteria

1. THE Test_Suite SHALL run every Integration_Test against a real Postgres database reached through `DATABASE_URL`, and SHALL apply `npm run db:migrate` to completion before the first Integration_Test in the run executes.
2. WHEN an Integration_Test imports server code, THE Integration_Test SHALL route `@/lib/db/client` through a test client bound to the Test_Database so that the production connection pool is not initialized during the test run.
3. THE Test_Suite SHALL include an Authorization_Test for every server action and every query that is business-scoped, and each Authorization_Test SHALL cover the owner role, the manager role, the staff role, an outsider user who is not a member, and the archived-business state.
4. WHEN an Authorization_Test exercises an actor with permission for the operation, THE Authorization_Test SHALL assert the operation succeeds with the documented return value and SHALL assert the expected mutation landed in the Test_Database.
5. WHEN an Authorization_Test exercises an actor without permission for the operation (outsider, archived-business, or a role that does not grant the operation), THE Authorization_Test SHALL assert the operation returns or throws an authorization error, SHALL assert no insert, update, or delete occurred in any business-scoped table for the target business, and SHALL assert no `audit_logs` row was written.
6. THE Test_Suite SHALL include Integration_Tests that cover the full quote lifecycle: draft creation, sending through manual delivery, sending through Requo email delivery, public viewing, public acceptance, public rejection, expiration, voiding, and post-acceptance status updates.
7. WHEN an Integration_Test transitions an inquiry or a quote through a status, THE Integration_Test SHALL assert the resulting status value, the corresponding `audit_logs` entry's action and actor, and the linked inquiry's status value match the expected values for that transition.
8. THE Test_Suite SHALL include Integration_Tests for the PayMongo and Paddle billing webhook route handlers that cover a successful event, a replayed event, an event referencing an account identifier that does not exist in the Test_Database, and an event with an invalid signature.
9. WHEN a billing webhook Integration_Test replays the same provider event twice, THE Integration_Test SHALL assert the `account_subscriptions` row is unchanged after the second call, SHALL assert the denormalized `businesses.plan` values are unchanged after the second call, and SHALL assert no duplicate row exists in `billing_events` for the replayed event id.
10. THE Test_Suite SHALL include Integration_Tests for public analytics route handlers that cover an authorized view event, a repeated request that exceeds the per-token rate limit within its configured window, and a request for a token that does not exist in the Test_Database.
11. WHEN an Integration_Test creates fixture rows, THE Integration_Test SHALL call a Fixture_Factory that deletes every row it created in an `afterAll` or `afterEach` hook, and the teardown SHALL run on both the passing and failing paths.
12. WHEN two Integration_Tests run in the same test run, THE Fixture_Factory SHALL generate identifiers namespaced by the test file's Per_File_Prefix so that concurrent fixture rows do not collide on unique constraints.
13. IF an Integration_Test leaves any row in a business-scoped table after its teardown completes, THEN THE Test_Suite SHALL exit non-zero and SHALL emit an error message naming the offending Test_File and each affected table.

### Requirement 6: End-to-end smoke test coverage

**User Story:** As a Requo engineer, I want a focused Playwright smoke suite, so that every merge has deterministic coverage of the highest-risk user flows.

#### Acceptance Criteria

1. THE Test_Suite SHALL include a Smoke_Test for owner sign-in that signs in as the demo owner and asserts the resulting page is the businesses hub for that owner.
2. THE Test_Suite SHALL include a Smoke_Test for non-member denial that signs in as a seeded outsider, navigates to another business's dashboard URL, and asserts the branded not-found state is shown.
3. THE Test_Suite SHALL include a Smoke_Test for public inquiry submission that submits a valid inquiry on the demo business's public page and asserts the submitted confirmation state is shown.
4. THE Test_Suite SHALL include a Smoke_Test for quote creation and sending that creates a draft quote for a seeded inquiry, marks it sent, and asserts the linked inquiry's status is `quoted`.
5. THE Test_Suite SHALL include a Smoke_Test for public quote response that opens a seeded sent quote by its public token, accepts it, and asserts the quote status is `accepted` and the linked inquiry's status is `won`.
6. WHEN a Smoke_Test runs against the local Next.js server, THE Playwright configuration SHALL start the server through `npm run dev:app`, SHALL apply `npm run db:migrate` and `npm run db:seed-demo` before any Smoke_Test executes, and SHALL wait at most 120 seconds for the server to become reachable before failing the run.
7. WHEN a Smoke_Test runs against a Vercel_Preview URL, THE Playwright configuration SHALL use the preview URL as the Playwright `baseURL`, SHALL NOT start a local server, and SHALL NOT apply database migrations or seeds.
8. IF any E2E_Test fails, THEN THE Test_Suite SHALL retain for that failing run a Playwright trace file, the Playwright HTML report, and a screenshot taken at failure, and SHALL retain those artifacts for at least 7 days in CI uploads.
9. IF a Test_File under `tests/e2e/` tags a test with `@smoke` and that test does not cover one of the five workflows described in criteria 1 through 5, THEN THE Test_Suite SHALL fail that Test_File with an error message naming the tag misuse.
10. WHEN `npm run test:e2e:smoke` exits with status zero, THE Test_Suite SHALL have run and passed one Smoke_Test for each of the five workflows described in criteria 1 through 5.
11. THE Test_Suite SHALL fail the Playwright run if any single E2E_Test takes longer than 90 seconds, unless that E2E_Test is annotated with an explicit `test.setTimeout` call and a justification comment on the preceding line.

### Requirement 7: Test determinism and timing

**User Story:** As a Requo engineer, I want deterministic test runs, so that CI failures reflect real regressions rather than flaky infrastructure.

#### Acceptance Criteria

1. WHEN a test asserts on a value derived from the current time (timestamps in rendered output, scheduled follow-up timestamps, expiry calculations, token issued-at fields), THE Test_Suite SHALL freeze the clock through `vi.setSystemTime` for Vitest tests or a Playwright clock override for E2E_Tests, and wall-clock usage SHALL remain permitted for unrelated concerns such as test timeouts and trace timestamps.
2. WHEN a test asserts on a generated identifier (UUID, public token, cuid), THE Test_Suite SHALL either inject a deterministic identifier generator or SHALL assert on the identifier's shape through a regular expression matching the generator's documented format.
3. WHEN a test exercises code that would otherwise issue an outbound network call to Resend, Groq, Gemini, OpenRouter, PayMongo, Paddle, or Supabase, THE Test_Suite SHALL mock that client at its module boundary so that no real HTTP request leaves the test process.
4. IF a test issues a real outbound HTTP request to any host other than `127.0.0.1` or `localhost` during a Vitest run, THEN THE Test_Suite SHALL fail that test and SHALL emit an error message naming the Test_File and the target host.
5. THE CI_Workflow SHALL configure Playwright with at most one retry per test.
6. WHEN the same Playwright test fails and then passes within retries in a single CI run, THE CI_Workflow SHALL record that test as a flake in the job summary and SHALL include a flake annotation in the pull request summary.
7. IF the CI_Workflow records one or more flakes in a run, THEN THE CI_Workflow SHALL NOT display the job status as green without the flake annotation being visible in the pull request summary.
8. THE Test_Suite SHALL fail the Vitest run if any single Vitest test takes longer than 30 seconds, unless that test is annotated with an explicit per-test timeout and a justification comment on the preceding line stating the reason for the longer timeout.

### Requirement 8: CI workflow structure and merge gates

**User Story:** As a Requo maintainer, I want a CI workflow that enforces clear merge gates, so that no commit merges without passing lint, typecheck, unit, component, build, integration, and smoke checks.

#### Acceptance Criteria

1. WHEN a pull request is opened, synchronized, or reopened against `main` or `master`, THE CI_Workflow SHALL run, and WHEN a commit is pushed directly to `main` or `master`, THE CI_Workflow SHALL run.
2. THE CI_Workflow SHALL define a Verify_Job that installs dependencies, then runs `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` in that order, and SHALL stop the job at the first non-zero exit code.
3. THE CI_Workflow SHALL define a Server_Tests_Job that starts only after the Verify_Job succeeds, provisions a Postgres 16 service container with deterministic credentials, runs `npm run test:integration`, installs the Chromium Playwright browser, and runs `npm run test:e2e:smoke` against a locally started Next.js server.
4. THE CI_Workflow SHALL mark the Verify_Job and the Server_Tests_Job as required status checks blocking merge into `main` and `master`.
5. IF the Verify_Job fails or is cancelled, THEN THE CI_Workflow SHALL NOT start the Server_Tests_Job.
6. WHEN a new commit is pushed to the same pull request branch, THE CI_Workflow SHALL cancel any in-progress run for the prior commit on that branch.
7. THE CI_Workflow SHALL grant each job only `contents: read` permission by default, and SHALL escalate permissions beyond `contents: read` only for the specific steps that require it.
8. WHEN the Server_Tests_Job runs, THE CI_Workflow SHALL wait for the Postgres service container's health check to report healthy before executing any database command.
9. IF the Postgres health check has not reported healthy within 120 seconds, THEN THE CI_Workflow SHALL fail the Server_Tests_Job with an error message identifying the Postgres service.
10. THE CI_Workflow SHALL cancel and fail the Verify_Job if it exceeds 20 minutes, and SHALL cancel and fail the Server_Tests_Job if it exceeds 25 minutes, on the default GitHub-hosted Ubuntu runner.
11. IF any Merge_Gate job fails, THEN THE CI_Workflow SHALL upload the Playwright HTML report, Playwright trace archive, and Vitest reporter output that exist on disk as Test_Artifacts named after the failing job, and SHALL NOT fail the upload step when a specific artifact file is not present.

### Requirement 9: Vercel preview smoke integration

**User Story:** As a Requo maintainer, I want CI to smoke-test the Vercel preview deployment for each pull request, so that I have confidence the deployed preview actually works before reviewing.

#### Acceptance Criteria

1. WHEN a pull request is opened, synchronized, or reopened against `main` or `master` AND a Vercel_Preview deployment for that pull request reports a successful state, THE CI_Workflow SHALL run the Preview_Smoke_Job.
2. WHEN the Preview_Smoke_Job starts, THE Preview_Smoke_Job SHALL wait at most 900 seconds for a Vercel_Preview deployment with a successful state before failing.
3. WHEN a Vercel_Preview deployment reports a successful state, THE Preview_Smoke_Job SHALL resolve the preview URL from the GitHub `deployment_status` event payload first, and SHALL fall back to the Vercel API if the payload does not contain a usable URL, with a combined resolution timeout of 60 seconds.
4. WHEN the Preview_Smoke_Job has resolved the preview URL, THE Preview_Smoke_Job SHALL run `npm run test:e2e:smoke` with `PLAYWRIGHT_BASE_URL` set to the preview URL and SHALL fail if the suite exceeds 600 seconds.
5. WHEN the Preview_Smoke_Job runs against a Vercel_Preview, THE Playwright configuration SHALL NOT start a local Next.js server and SHALL NOT apply database migrations or seeds.
6. IF Vercel reports a failed preview deployment for the pull request, THEN THE Preview_Smoke_Job SHALL report a failure with a link to the Vercel deployment logs and SHALL NOT run the Playwright suite.
7. THE Preview_Smoke_Job SHALL NOT be configured as a Merge_Gate during the initial rollout period.
8. WHEN the Preview_Smoke_Job has reported success on ten consecutive pull requests, THE CI_Workflow SHALL be updated to mark the Preview_Smoke_Job as a Merge_Gate.
9. THE Preview_Smoke_Job SHALL treat the Vercel_Preview as read-only and SHALL NOT run any test that creates, mutates, or deletes data that persists across runs.

### Requirement 10: Test data and seed management

**User Story:** As a Requo engineer, I want reproducible test data for integration and smoke tests, so that suite results do not depend on local database state.

#### Acceptance Criteria

1. WHEN `npm run test:integration` is invoked, THE Test_Suite SHALL execute `npm run db:migrate` to completion with exit code 0 before starting any Integration_Test, and IF `npm run db:migrate` exits non-zero, THEN THE Test_Suite SHALL exit non-zero and SHALL NOT start any Integration_Test.
2. WHEN `npm run test:e2e:smoke` is invoked against the local server, THE Test_Suite SHALL execute `npm run db:migrate` to completion with exit code 0 and then `npm run db:seed-demo` to completion with exit code 0 before starting any Smoke_Test, and IF either command exits non-zero, THEN THE Test_Suite SHALL exit non-zero and SHALL NOT start any Smoke_Test.
3. THE Test_Suite SHALL expose a Workflow_Fixture that, on each invocation, creates exactly one owner user, one manager user, one staff user, one outsider user, one primary business, one other business, and one archived business using deterministic identifiers derived from the caller's Per_File_Prefix, and SHALL return the created identifiers to the caller.
4. WHEN a Workflow_Fixture is invoked inside an Integration_Test, THE Workflow_Fixture SHALL, before inserting any new rows, delete every row whose identifier matches the fixture's Per_File_Prefix from `businesses`, `business_members`, `business_inquiry_forms`, `inquiries`, `quotes`, `quote_items`, `follow_ups`, `activity_logs`, `audit_logs`, `analytics_events`, `business_notifications`, and `account_subscriptions`.
5. WHEN a billing Integration_Test requests the billing fixture, THE Test_Suite SHALL create exactly one `account_subscriptions` row per requested state covering `active`, `past_due`, `canceled`, and `grace_period`, and SHALL return the created subscription identifiers to the caller.
6. WHEN a quote Integration_Test requests the quote fixture, THE Test_Suite SHALL create exactly one quote per requested state covering `draft`, `sent`, `viewed`, `accepted`, `rejected`, `expired`, and `voided`, and SHALL return the created quote identifiers and public tokens to the caller.
7. WHEN a Smoke_Test asserts on a seeded quote, THE Smoke_Test SHALL reference that quote only through a token or identifier exposed by the demo seed as a named export (for example `DEMO_QUOTE_PUBLIC_TOKEN`), and IF a Smoke_Test references a raw database identifier not exposed by the demo seed, THEN THE Test_Suite SHALL fail that Smoke_Test with an error indicating an unexposed identifier was used.
8. IF any seed script invoked by the Test_Suite exits non-zero or throws an uncaught error, THEN THE Test_Suite SHALL exit non-zero, SHALL NOT start any dependent Integration_Test or Smoke_Test, and SHALL emit an error message naming the failing seed script.
9. WHEN an Integration_Test using a Workflow_Fixture completes, THE Test_Suite SHALL run the fixture's teardown on both passing and failing paths and SHALL delete every row the fixture created in the tables listed in criterion 4 before the next Integration_Test begins.

### Requirement 11: Secrets, environment, and credential handling

**User Story:** As a Requo maintainer, I want test secrets handled in one consistent, least-privilege way, so that test runs do not leak or require production credentials.

#### Acceptance Criteria

1. THE CI_Workflow SHALL source every value for `BETTER_AUTH_SECRET`, `APP_ENCRYPTION_KEYS`, and `APP_TOKEN_HASH_SECRET` from Test_Secret_Placeholder strings declared in the Merge_Gate job environments.
2. THE CI_Workflow SHALL NOT reference any production secret for Resend, Groq, Gemini, OpenRouter, PayMongo, Paddle, or Supabase in the Verify_Job or the Server_Tests_Job.
3. WHEN a Test_File imports a third-party client that reads an API key from the environment, THE Test_Suite SHALL set the corresponding environment variable to an empty string or a Test_Secret_Placeholder before that import resolves.
4. WHEN a Test_File depends on a third-party client that reads an API key from the environment, THE Test_File SHALL mock that client at the application's import path so that no real HTTP request is issued during the test.
5. THE CI_Workflow SHALL reference every Secret_Variable through the `secrets:` context only, and SHALL NOT echo a Secret_Variable value to step output, job summary, or any uploaded Test_Artifact.
6. IF a Test_File or a generated Test_Artifact contains the verbatim value of any Secret_Variable, THEN THE Test_Suite SHALL exit non-zero and SHALL emit an error message containing the absolute path of the leaking Test_File or Test_Artifact.
7. THE CI_Workflow SHALL use deterministic database credentials (`postgres:postgres` on `127.0.0.1:5432/requo`) for the Postgres service container in Merge_Gate jobs and SHALL NOT load database credentials from the `secrets:` context for Merge_Gate jobs.

### Requirement 12: Coverage reporting and artifacts

**User Story:** As a Requo maintainer, I want coverage and failure artifacts for every CI run, so that I can diagnose regressions and track suite health over time.

#### Acceptance Criteria

1. WHEN the Verify_Job runs, THE CI_Workflow SHALL produce a Vitest JSON reporter file for unit and component tests and SHALL upload it as a Test_Artifact named `verify-reports-<commit-sha-short>` regardless of whether the Verify_Job passes or fails.
2. WHEN the Server_Tests_Job runs, THE CI_Workflow SHALL produce a Vitest JSON reporter file for integration tests and a Playwright HTML report and SHALL upload them as Test_Artifacts named `integration-reports-<commit-sha-short>` and `playwright-report-smoke-<commit-sha-short>` regardless of whether the Server_Tests_Job passes or fails.
3. WHEN `npm run test:coverage` is invoked, THE Test_Suite SHALL produce a v8 coverage report in both text and HTML formats that excludes files under `tests/`, `**/*.config.*`, Next.js `layout.tsx`, and Next.js `page.tsx`.
4. IF `npm run test:coverage` fails to produce either the text coverage report or the HTML coverage report, THEN THE Test_Suite SHALL exit non-zero and SHALL emit an error message identifying the missing report format.
5. WHEN the Verify_Job runs `npm run test:coverage`, THE CI_Workflow SHALL evaluate the coverage thresholds defined in the Vitest configuration and SHALL record the resulting line coverage percentage to one decimal place in the Verify_Job summary.
6. THE CI_Workflow SHALL NOT fail the Verify_Job on a coverage threshold violation during the initial rollout period.
7. WHEN any CI job uploads a Test_Artifact, THE CI_Workflow SHALL set the artifact retention to 14 days and SHALL append the short commit SHA (first 7 characters) to the artifact name.
8. IF a test step or a build step fails before the artifact upload step runs, THEN THE CI_Workflow SHALL still execute the artifact upload step for that job.

### Requirement 13: Documentation for contributors

**User Story:** As a new Requo contributor, I want clear documentation on how tests are organized and run, so that I can add tests that fit the existing strategy.

#### Acceptance Criteria

1. THE Test_Suite SHALL include a `tests/README.md` that enumerates each of the four test folders (`tests/unit/`, `tests/components/`, `tests/integration/`, `tests/e2e/`), describes each folder's purpose, names the runner each folder uses, and provides exactly one example command to run that folder's tests.
2. THE `tests/README.md` SHALL list, for each of Unit_Tests, Component_Tests, Integration_Tests, and E2E_Tests, the behaviors that belong in that tier with at least one concrete example behavior per tier, using the testing priorities from `AGENTS.md` as the source of truth.
3. THE `tests/README.md` SHALL describe the Workflow_Fixture, the billing fixture, and the quote fixture, including the Per_File_Prefix rule and an example of how a Test_File derives its prefix.
4. THE `tests/README.md` SHALL list every required environment variable for each of the test commands in Requirement 2, grouped under the headings "required for the test run" and "required only for demo seeding".
5. THE Test_Suite SHALL include a `docs/ci-cd.md` that lists every CI_Workflow job (Verify_Job, Server_Tests_Job, Preview_Smoke_Job) and identifies each job's Merge_Gate status.
6. THE `docs/ci-cd.md` SHALL describe the Vercel preview smoke flow, including how the preview URL is resolved and when the Preview_Smoke_Job becomes a Merge_Gate.
7. THE `docs/ci-cd.md` SHALL describe how to rerun a failed CI_Workflow job, including the GitHub Actions UI steps and the `gh` CLI equivalent.
