# Test Infrastructure and CI/CD Design

## Overview

This design rebuilds Requo's automated test suite and CI/CD pipeline so that merge gates, preview deployments, and production deployments are backed by a predictable, behavior-focused, Vercel-aware test strategy.

The rebuild keeps the existing runner choices (Vitest for unit/component/integration, Playwright for end-to-end) and the existing two-job merge-gate shape in `.github/workflows/ci.yml` (`verify`, `server-tests`). What changes:

1. `tests/` is reorganized around a single shared `tests/support/` folder for fixture factories, client mocks, environment stubs, and verifier scripts. Cross-test helpers no longer live alongside `Test_Files`.
2. A test-layout verifier, a no-real-HTTP guard, and a secret-leakage guard run inside the Vitest pipeline so structural invariants fail the run with a non-zero exit code instead of silently drifting.
3. Fixture factories (`Workflow_Fixture`, billing fixture, quote fixture) are consolidated in `tests/support/fixtures/`, all namespace their rows by a `Per_File_Prefix` derived from the calling `Test_File`, and own their own idempotent teardown.
4. Playwright gains a runtime mode switch: against the local `npm run dev:app` it migrates and seeds the database; against a Vercel preview URL it skips the web server, skips migrations, and runs read-only smoke tests only.
5. The CI workflow keeps the current two merge gates and adds a non-gating `preview-smoke` job triggered on `deployment_status`, plus JSON reporter artifacts, coverage reporting, and a documented path from non-gating to gating once the preview job has been stable across ten consecutive pull requests.
6. `tests/README.md` and `docs/ci-cd.md` are added so contributors can find the right tier for a new test and maintainers can operate the pipeline without reading YAML.

This is a non-destructive evolution of the existing infrastructure: `vitest.config.ts`, `vitest.integration.config.ts`, `playwright.config.ts`, and the current GitHub Actions workflow are the starting point, and we extend rather than replace them.

### Design Decisions And Rationale

- **Keep Vitest and Playwright; do not introduce a new runner.** Requo already runs Vitest 4 and Playwright 1.59, and `AGENTS.md` names them as the testing stack. Swapping frameworks is out of scope per the requirements `Out of scope` section and would ripple across ~70 existing `Test_Files` in `tests/unit/`, `tests/components/`, and `tests/integration/`.
- **Single `tests/support/` folder for shared helpers.** Requirement 1 bans shared helpers from living next to `Test_Files`. We move the two current cross-file helpers (`tests/integration/db.ts` and `tests/integration/workflow-fixtures.ts`) into `tests/support/` and let any test under the four top-level folders import them with the `@/tests/support/...` alias. This keeps imports stable across unit, component, and integration layers.
- **Per-file prefix derived from the test file's basename.** Requirement 10 mandates deterministic identifier namespacing. Using `path.basename(filename, extname(filename))` with non-identifier characters collapsed to `_` produces a short, identifier-safe, filesystem-backed prefix that collides only if two tests share a filename (already a project-level concern).
- **Verifiers run inside Vitest as `*.test.ts` files, not as separate CLI commands.** The layout verifier, the secret-leakage guard, and the no-outbound-HTTP guard are written as ordinary Vitest tests under `tests/unit/_guards/`. That way `npm run test:unit` exits non-zero the instant an invariant is violated without adding a new runner or an extra CI step.
- **Playwright mode switch via `PLAYWRIGHT_BASE_URL`.** When `PLAYWRIGHT_BASE_URL` is set, we use it as the Playwright `baseURL`, skip `webServer`, and skip the migration/seed block. When unset, we preserve the current local-dev behavior. One config, two runtime shapes, explicit via a single env var.
- **Preview smoke triggered by `deployment_status` events, not a synthetic poll from `pull_request`.** GitHub delivers a `deployment_status` event with the deployment URL and state when Vercel reports a preview deployment as successful. Listening to this event is cheaper and more correct than polling the Vercel API from a `pull_request`-triggered job, and it gives us the preview URL directly via `github.event.deployment_status.target_url`. We keep a Vercel API fallback for the rare case where the payload does not contain a usable URL.
- **Preview smoke starts non-gating.** Requirement 9.7 requires this during the initial rollout. We mark it `continue-on-error: true` and document in `docs/ci-cd.md` the ten-consecutive-green path to making it a required status check, aligned with Requirement 9.8.
- **Coverage is measured but does not gate during rollout.** Requirement 12.6 is explicit. We emit v8 text + HTML coverage on the `verify` job and record line coverage in the job summary. Adding coverage as a merge gate is a future change.
- **Test secrets are literal strings in the workflow YAML, not repo secrets.** Requirement 11 says `BETTER_AUTH_SECRET`, `APP_ENCRYPTION_KEYS`, and `APP_TOKEN_HASH_SECRET` are sourced from `Test_Secret_Placeholder` strings in job env. The current `ci.yml` already does this. We keep that shape and scan for verbatim leakage of these placeholders into artifacts.
- **Database credentials for CI are deterministic (`postgres:postgres`).** Requirement 11.7 forbids loading DB credentials from `secrets:` for merge-gate jobs. The current workflow already hardcodes `postgres:postgres` on `127.0.0.1:5432/requo`. We keep this.
- **Third-party API clients are always mocked at the application's import path.** Requirement 7.3 and 7.4. We add `tests/support/third-party-mocks.ts` that exports pre-built `vi.mock` factories for Resend, Groq, Gemini, OpenRouter, Paddle, and Supabase. Tests that need one call the helper; the helper guarantees no real HTTP request is issued.
- **No-outbound-HTTP guard is a Node-level fetch interceptor, not per-file.** We monkey-patch `globalThis.fetch` in `tests/setup.ts` to throw whenever a host other than `127.0.0.1` or `localhost` is contacted. That gives Requirement 7.4 a single point of enforcement instead of per-client assertions.

### Sources Consulted

- `.github/workflows/ci.yml` for the current two-job merge-gate layout, env shape, and artifact upload pattern.
- `vitest.config.ts` and `vitest.integration.config.ts` for the existing env, alias (`@`, `server-only` stub), and coverage configuration we extend.
- `playwright.config.ts` for the existing `webServer` command, retry count, and trace setting.
- `tests/integration/workflow-fixtures.ts` and `tests/integration/db.ts` for the current fixture shape and the set of business-scoped tables cleanup must touch.
- `tests/setup.ts` for the Radix-driven DOM stubs we preserve in the unit/component environment.
- `lib/billing/subscription-service.ts` and `lib/billing/webhook-processor.ts` for the billing webhook idempotency contract the integration tests assert on.
- `scripts/seed-demo.ts` for the demo constants (`DEMO_QUOTE_PUBLIC_TOKEN`, `DEMO_EXPIRED_QUOTE_PUBLIC_TOKEN`, `DEMO_OWNER_EMAIL`) the smoke tests reference.
- `AGENTS.md` → Testing Priorities and Verification sections for the product-risk-first testing philosophy this design enforces.
- GitHub Actions `deployment_status` event payload shape: [GitHub Actions events — deployment_status](https://docs.github.com/en/actions/reference/events-that-trigger-workflows#deployment_status). Content rephrased for compliance with licensing restrictions.
- Playwright test retries and trace retention options: [Playwright configuration](https://playwright.dev/docs/test-configuration). Content rephrased for compliance with licensing restrictions.

## Architecture

### High-Level Pipeline

```mermaid
flowchart LR
    PR[Pull request / push to main] --> Verify[verify job]
    Verify -->|pass| Server[server-tests job]
    Verify -.->|fail| Gate[(Merge blocked)]
    Server --> Gate2[(Merge allowed)]
    Server -.->|fail| Gate

    Vercel[Vercel preview deploy] -->|deployment_status: success| Preview[preview-smoke job]
    Preview -.->|non-gating during rollout| Gate2
```

### Test Tier Responsibilities

```mermaid
flowchart TB
    subgraph Unit[tests/unit — Vitest jsdom]
        U1[Zod schemas at input boundaries]
        U2[Pure utilities: pricing, slugs, tokens, plan access]
        U3[Round-trip tests for parsers/serializers]
        U4[_guards: layout, secrets, outbound-http]
    end
    subgraph Component[tests/components — Vitest jsdom]
        C1[Login form]
        C2[Public inquiry form]
        C3[Quote editor]
        C4[Send-quote dialog]
        C5[Paywalled command menu]
    end
    subgraph Integration[tests/integration — Vitest node + Postgres]
        I1[Authorization: owner/manager/staff/outsider/archived]
        I2[Quote lifecycle transitions]
        I3[Billing webhook idempotency]
        I4[Public analytics rate limiting]
    end
    subgraph E2E[tests/e2e — Playwright chromium]
        E1[@smoke: sign-in]
        E2[@smoke: non-member denial]
        E3[@smoke: public inquiry]
        E4[@smoke: quote creation/sending]
        E5[@smoke: public quote response]
    end
    Unit --> Fixture[tests/support]
    Component --> Fixture
    Integration --> Fixture
    E2E --> Fixture
```

### Test Folder Layout

```
tests/
  README.md                      // required by Req 1.8 and 13.1
  setup.ts                       // DOM stubs + outbound-http guard (all Vitest runs)
  unit/
    _guards/
      layout.test.ts             // Req 1.7 layout verifier
      secrets.test.ts            // Req 11.6 secret-leakage guard
      outbound-http.test.ts      // Req 7.4 enforcement self-check
    <existing unit files...>
  components/
    <existing component files...>
  integration/
    <existing integration files...>   // db.ts and workflow-fixtures.ts move to support/
  e2e/
    fixtures.ts                  // retained: Playwright-scoped fixtures
    <existing e2e specs...>
  support/
    env.ts                       // applies Test_Secret_Placeholder env, called by setup.ts
    db.ts                        // moved from tests/integration/db.ts
    prefix.ts                    // derivePerFilePrefix()
    third-party-mocks.ts         // Resend/Groq/Gemini/OpenRouter/Paddle/Supabase mock factories
    fetch-guard.ts               // monkey-patches global fetch, used by setup.ts
    fixtures/
      workflow.ts                // moved from tests/integration/workflow-fixtures.ts
      billing.ts                 // new: createBillingFixture({ states: [...] })
      quotes.ts                  // new: createQuoteFixture({ states: [...] })
```

### CI Job Topology

```mermaid
flowchart LR
    Checkout1[checkout] --> Setup1[setup-node 22 + npm ci]
    Setup1 --> Lint[npm run lint]
    Lint --> Type[npm run typecheck]
    Type --> TestVC[npm run test:coverage]
    TestVC --> Build[npm run build]
    Build --> ArtifactsV[upload verify-reports]

    Checkout2[checkout] --> Setup2[setup-node 22 + npm ci]
    Setup2 --> Postgres[Postgres 16 service: healthcheck gate]
    Postgres --> Int[npm run test:integration]
    Int --> PW[playwright install --with-deps chromium]
    PW --> Smoke[npm run test:e2e:smoke]
    Smoke --> ArtifactsS[upload integration-reports + playwright-report-smoke]

    Event[deployment_status=success] --> ResolveURL[Resolve preview URL from payload]
    ResolveURL --> WaitVercel[Wait up to 900s for success state]
    WaitVercel --> PWInstall[playwright install --with-deps chromium]
    PWInstall --> SmokePrev[npm run test:e2e:smoke<br/>PLAYWRIGHT_BASE_URL=&lt;preview&gt;]
    SmokePrev --> ArtifactsP[upload playwright-report-preview]
```

Three jobs:

1. `verify` (merge gate): lint → typecheck → unit+component tests (with coverage) → build → upload reports.
2. `server-tests` (merge gate, depends on `verify`): Postgres 16 service → migrate → integration tests → install Chromium → local smoke → upload reports + HTML.
3. `preview-smoke` (non-gating during rollout): triggered by `deployment_status`, resolves preview URL, runs read-only smoke against the preview, uploads artifacts, reports flakes in the PR summary.

## Components and Interfaces

### 1. Vitest configuration (`vitest.config.ts`, `vitest.integration.config.ts`)

Two configs, unchanged in philosophy. Changes:

- **Coverage excludes** are made a shared constant so `tests/`, `**/*.config.*`, `**/layout.tsx`, and `**/page.tsx` are identical across configs (Requirement 12.3).
- `vitest.config.ts` adds `reporters: [['default'], ['json', { outputFile: 'reports/vitest-verify.json' }]]` so the Verify job has a JSON artifact (Requirement 12.1).
- `vitest.integration.config.ts` adds `reporters: [['default'], ['json', { outputFile: 'reports/vitest-integration.json' }]]` (Requirement 12.2).
- Both configs continue to stub `server-only` via the `alias` entry so Requirement 1.5 holds.
- Both configs continue to expose the `@` alias to the repo root (Requirement 1.6).
- `vitest.config.ts` sets per-test timeout to 30s and per-component-test soft timeout to 10s enforced by `tests/unit/_guards/timing.test.ts` (Requirements 4.7 and 7.8).

### 2. Playwright configuration (`playwright.config.ts`)

Single config, runtime-mode aware:

```ts
const explicitBaseURL = process.env.PLAYWRIGHT_BASE_URL?.trim();
const runningAgainstPreview = Boolean(explicitBaseURL);

export default defineConfig({
  testDir: "./tests/e2e",
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: explicitBaseURL ?? `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: runningAgainstPreview ? undefined : {
    command: `npm run db:migrate && npm run db:seed-demo && npm run dev:app -- --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    timeout: 120_000,
    reuseExistingServer: false,
    env: { /* existing env */ },
  },
});
```

- When `PLAYWRIGHT_BASE_URL` is set (preview smoke), no web server is started and no migrations/seeds run (Requirements 6.7 and 9.5).
- When unset (local and CI server-tests), the existing `webServer` command runs, including migrations and seeds (Requirement 6.6).
- `retries: 1` in CI is kept (Requirement 7.5).
- Playwright traces, HTML report, and screenshot are retained on failure (Requirement 6.8).

### 3. `tests/setup.ts`

Extended from today's DOM stubs:

```ts
import "@testing-library/jest-dom";
import { installDomStubs } from "./support/dom-stubs";
import { installFetchGuard } from "./support/fetch-guard";
import { applyTestEnv } from "./support/env";

applyTestEnv();         // Test_Secret_Placeholder values; applied before any import-time reads
installDomStubs();      // ResizeObserver, PointerEvent, scrollIntoView, matchMedia
installFetchGuard();    // throws if a test hits a non-local host
```

Three responsibilities with clear boundaries: env, DOM stubs, fetch guard. Each exported helper is individually unit-testable.

### 4. `tests/support/env.ts`

```ts
export function applyTestEnv() {
  const defaults: Record<string, string> = {
    BETTER_AUTH_SECRET: "test-secret-at-least-32-characters-long-so-zod-passes",
    APP_ENCRYPTION_KEYS: "v1:AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=",
    APP_TOKEN_HASH_SECRET: "test-token-hash-secret-at-least-32-characters",
    BETTER_AUTH_URL: "http://127.0.0.1:3000",
    NEXT_PUBLIC_BETTER_AUTH_URL: "http://127.0.0.1:3000/api/auth",
    DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/requo",
    NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
    RESEND_API_KEY: "",
    GROQ_API_KEY: "",
    GEMINI_API_KEY: "",
    OPENROUTER_API_KEY: "",
    PADDLE_API_KEY: "",
    PADDLE_WEBHOOK_SECRET: "",
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
}
```

All values are `Test_Secret_Placeholder` strings or empty strings, satisfying Requirement 2.9 and Requirement 11.

### 5. `tests/support/prefix.ts`

```ts
import path from "node:path";

export function derivePerFilePrefix(filename: string): string {
  const base = path.basename(filename, path.extname(filename));
  const normalized = base.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return normalized.length > 0 ? normalized : "test";
}
```

Callers use `derivePerFilePrefix(__filename)` (or the Vitest equivalent) in each integration test. The result is passed to every fixture factory so rows are namespaced (Requirement 10.4 and 10.12).

### 6. `tests/support/db.ts`

Unchanged in behavior from `tests/integration/db.ts` — exports `testDb` drizzle client and `closeTestDb()`. Path moves so unit and component tests that need schema types can import it without crossing the unit→integration boundary.

### 7. `tests/support/fixtures/workflow.ts`

Moved verbatim from `tests/integration/workflow-fixtures.ts`. Public API:

```ts
export type WorkflowFixtureIds = { /* owner/manager/staff/outsider + 3 businesses + 3 forms + 3 inquiries, all prefixed */ };
export function getWorkflowFixtureIds(prefix: string): WorkflowFixtureIds;
export async function cleanupWorkflowFixture(prefix: string): Promise<void>;
export async function createWorkflowFixture(prefix: string): Promise<WorkflowFixtureIds>;
```

`createWorkflowFixture` calls `cleanupWorkflowFixture` first, guaranteeing the "before inserting any new rows, delete every row whose identifier matches the fixture's Per_File_Prefix" rule (Requirement 10.4).

### 8. `tests/support/fixtures/billing.ts` (new)

```ts
export type BillingFixtureState = "active" | "past_due" | "canceled" | "grace_period";

export type BillingFixtureIds = {
  accountId: string;
  subscriptionIdsByState: Record<BillingFixtureState, string>;
};

export async function createBillingFixture(
  prefix: string,
  states: BillingFixtureState[],
): Promise<BillingFixtureIds>;

export async function cleanupBillingFixture(prefix: string): Promise<void>;
```

Creates one `account_subscriptions` row per requested state using deterministic ids shaped `${prefix}_sub_${state}` (Requirement 10.5). Writes go through `lib/billing/subscription-service.ts` rather than raw SQL so the denormalized `businesses.plan` invariant stays intact in tests.

### 9. `tests/support/fixtures/quotes.ts` (new)

```ts
export type QuoteFixtureState = "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired" | "voided";

export type QuoteFixtureIds = {
  quoteIdsByState: Record<QuoteFixtureState, string>;
  publicTokensByState: Record<QuoteFixtureState, string>;
};

export async function createQuoteFixture(
  prefix: string,
  states: QuoteFixtureState[],
  workflow: WorkflowFixtureIds,
): Promise<QuoteFixtureIds>;
```

Creates one quote per requested state (Requirement 10.6), attached to the primary business from `WorkflowFixtureIds`, with deterministic public tokens shaped `${prefix}_token_${state}`.

### 10. `tests/support/third-party-mocks.ts`

Named factories per client:

```ts
export function mockResend(): void;       // vi.mock('@/lib/email/resend-client', ...)
export function mockGroq(): void;         // vi.mock('@/lib/ai/groq-client', ...)
export function mockGemini(): void;
export function mockOpenRouter(): void;
export function mockPaddle(): void;
export function mockSupabaseStorage(): void;

export function mockAllThirdParties(): void;  // convenience
```

Each factory is a thin wrapper over `vi.mock` targeting the Requo-side module path (never the SDK's npm name), so the mock applies wherever the app imports the client.

### 11. `tests/support/fetch-guard.ts`

```ts
export function installFetchGuard() {
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url ?? String(input);
    const { hostname } = new URL(url, "http://127.0.0.1");
    if (hostname !== "127.0.0.1" && hostname !== "localhost") {
      throw new Error(
        `[outbound-http-guard] Blocked request to ${hostname} from a test. ` +
        `Mock the client via tests/support/third-party-mocks.ts.`,
      );
    }
    return original(input, init);
  };
}
```

Used by `tests/setup.ts` for unit and component runs. Integration tests that need a real local Postgres connection are unaffected because Postgres does not go through `fetch`. Any accidental outbound HTTP call fails the originating test with a clear path to the fix (Requirement 7.4).

### 12. Verifier tests under `tests/unit/_guards/`

**`layout.test.ts`** — scans the repo with a recursive `readdir` rooted at `tests/`, asserts every file whose basename matches `*.test.ts`, `*.test.tsx`, or `*.spec.ts` lives under exactly one of `tests/unit/`, `tests/components/`, `tests/integration/`, `tests/e2e/`, and fails with the absolute path of any offender. Covers Requirement 1.7.

**`secrets.test.ts`** — walks every file under `tests/` and every file produced into `reports/`, `playwright-report/`, and `test-results/` if present, and asserts none of them contain the verbatim value of any `Test_Secret_Placeholder` from `tests/support/env.ts`. Covers Requirement 11.6 and Requirement 12.1–12.2 artifact hygiene.

**`outbound-http.test.ts`** — a self-test of the fetch guard: installs the guard on a disposable `globalThis.fetch`, calls `fetch("https://example.com")` inside a `try/catch`, and asserts the error message contains "Blocked request to example.com".

**`timing.test.ts`** — reads `Reflect.getMetadata`-free: in the Vitest `onTestFinished` hook (via a setup file), records every test's duration and, in a final `afterAll`, asserts that no Vitest test (outside those marked with an explicit per-test timeout and a justification comment on the preceding line) ran longer than 30s, and that no Component_Test ran longer than 10s under the same rule. Covers Requirements 4.7, 6.11, and 7.8. The "justification comment on the preceding line" check is a regex over the source file.

### 13. `tests/README.md`

Four folders, one paragraph each, one example command each. A Fixture section describes `Workflow_Fixture`, `createBillingFixture`, and `createQuoteFixture`, spells out the `Per_File_Prefix` rule with a concrete example (`derivePerFilePrefix("quote-mutations.test.ts") === "quote_mutations"`), and links back to this design document. Grouped environment-variable tables cover every test command from Requirement 2.

### 14. `docs/ci-cd.md`

One page. Contents:

- The three jobs (`verify`, `server-tests`, `preview-smoke`) with their triggers, timeouts, and merge-gate status.
- The preview URL resolution order (`deployment_status` payload → Vercel API fallback, combined 60s budget).
- The ten-consecutive-green promotion path for `preview-smoke` to become a merge gate.
- How to rerun a failed job: GitHub Actions UI steps plus the `gh run rerun <run-id>` CLI equivalent.

### 15. GitHub Actions workflow (`.github/workflows/ci.yml`)

Extends the current workflow. New fields marked with ← new:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main, master]
  deployment_status:            # ← new, drives preview-smoke
  workflow_dispatch:

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read                # Req 8.7

env:
  NODE_ENV: test
  # Test_Secret_Placeholder values kept inline, per Req 11.1 and 11.7
  DATABASE_URL: postgres://postgres:postgres@127.0.0.1:5432/requo
  BETTER_AUTH_SECRET: 0123456789abcdef0123456789abcdef
  APP_ENCRYPTION_KEYS: v1:AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=
  APP_TOKEN_HASH_SECRET: 0123456789abcdef0123456789abcdef
  # ... existing env entries preserved

jobs:
  verify:
    if: github.event_name != 'deployment_status'
    name: Verify
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:coverage     # ← replaces npm run test; still runs unit+component
      - run: npm run build
      - name: Upload verify reports    # ← new
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: verify-reports-${{ github.sha }}
          path: |
            reports/vitest-verify.json
            coverage/
          retention-days: 14
          if-no-files-found: ignore

  server-tests:
    if: github.event_name != 'deployment_status'
    name: Server Tests
    needs: verify
    runs-on: ubuntu-latest
    timeout-minutes: 25
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_DB: requo, POSTGRES_USER: postgres, POSTGRES_PASSWORD: postgres }
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U postgres -d requo"
          --health-interval 10s --health-timeout 5s --health-retries 12
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - name: Wait for Postgres        # ← new, Req 8.8/8.9
        run: ./scripts/ci/wait-for-postgres.sh
        timeout-minutes: 2
      - run: npm run test:integration
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e:smoke
      - name: Upload server-tests reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: integration-reports-${{ github.sha }}
          path: |
            reports/vitest-integration.json
            playwright-report/
            test-results/
          retention-days: 14
          if-no-files-found: ignore

  preview-smoke:
    if: github.event_name == 'deployment_status' && github.event.deployment_status.state == 'success' && github.event.deployment.environment == 'preview'
    name: Preview Smoke
    runs-on: ubuntu-latest
    timeout-minutes: 20
    continue-on-error: true            # Req 9.7 non-gating during rollout
    steps:
      - uses: actions/checkout@v4
        with: { ref: ${{ github.event.deployment.sha }} }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - name: Resolve preview URL
        id: url
        run: node scripts/ci/resolve-preview-url.mjs
        env:
          DEPLOYMENT_PAYLOAD: ${{ toJSON(github.event.deployment_status) }}
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        timeout-minutes: 1             # Req 9.3 combined 60s URL resolution
      - run: npx playwright install --with-deps chromium
      - name: Run smoke against preview
        run: npm run test:e2e:smoke
        env:
          PLAYWRIGHT_BASE_URL: ${{ steps.url.outputs.url }}
        timeout-minutes: 10            # Req 9.4 600s suite cap
      - name: Upload preview artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-preview-${{ github.sha }}
          path: |
            playwright-report/
            test-results/
          retention-days: 14
          if-no-files-found: ignore
```

Two supporting scripts:

- `scripts/ci/wait-for-postgres.sh` polls `pg_isready -h 127.0.0.1 -p 5432 -U postgres -d requo` every 2s, up to 120s, then exits non-zero with a message naming the Postgres service (Requirement 8.9).
- `scripts/ci/resolve-preview-url.mjs` reads `DEPLOYMENT_PAYLOAD`, extracts `target_url`; on miss, hits the Vercel REST API with `VERCEL_TOKEN`; writes `url=<resolved>` to `$GITHUB_OUTPUT`; fails if neither source yields a URL in 60s.

### 16. `npm` scripts (`package.json`)

Keep existing scripts. Two adjustments:

- Split `npm run test` so both `test:unit` and `test:components` run even when the first exits non-zero (Requirement 2.3). Use `npm run test:unit; code=$?; npm run test:components; [ $code -eq 0 ] && exit $? || exit $code` via a tiny Node launcher at `scripts/test/run-sequential.mjs`.
- Same pattern for `npm run check` (Requirement 2.7).
- `npm run test:e2e:smoke` already filters on `@smoke`. Add a runtime pre-check: when `PLAYWRIGHT_BASE_URL` is unset and `DATABASE_URL` is unreachable within 10s, exit non-zero with a message containing the string `DATABASE_URL` (Requirement 2.8). Implemented in `scripts/test/check-db.mjs`, prepended to the smoke and integration commands via `&&`.

## Data Models

### PerFilePrefix

- Type: opaque string.
- Shape: `[a-z0-9][a-z0-9_]*`.
- Source: `path.basename(testFile, extname(testFile))` with non-alphanumerics collapsed to `_`.
- Uniqueness: enforced per-file by convention; the layout verifier emits a warning if two files under `tests/` share a basename.

### WorkflowFixtureIds

```ts
type WorkflowFixtureIds = {
  ownerUserId:         `${PerFilePrefix}_owner`;
  managerUserId:       `${PerFilePrefix}_manager`;
  staffUserId:         `${PerFilePrefix}_staff`;
  outsiderUserId:      `${PerFilePrefix}_outsider`;
  businessId:          `${PerFilePrefix}_business`;
  otherBusinessId:     `${PerFilePrefix}_business_other`;
  archivedBusinessId:  `${PerFilePrefix}_business_archived`;
  formId:              `${PerFilePrefix}_form`;
  otherFormId:         `${PerFilePrefix}_form_other`;
  archivedFormId:      `${PerFilePrefix}_form_archived`;
  inquiryId:           `${PerFilePrefix}_inquiry`;
  waitingInquiryId:    `${PerFilePrefix}_inquiry_waiting`;
  otherInquiryId:      `${PerFilePrefix}_inquiry_other`;
  businessSlug:        `${kebab(PerFilePrefix)}-business`;
  otherBusinessSlug:   `${kebab(PerFilePrefix)}-other-business`;
  archivedBusinessSlug:`${kebab(PerFilePrefix)}-archived-business`;
};
```

### BillingFixtureIds

```ts
type BillingFixtureIds = {
  accountId: `${PerFilePrefix}_account`;
  subscriptionIdsByState: {
    active?:        `${PerFilePrefix}_sub_active`;
    past_due?:      `${PerFilePrefix}_sub_past_due`;
    canceled?:      `${PerFilePrefix}_sub_canceled`;
    grace_period?:  `${PerFilePrefix}_sub_grace_period`;
  };
};
```

### QuoteFixtureIds

```ts
type QuoteFixtureIds = {
  quoteIdsByState: Partial<Record<QuoteFixtureState, `${PerFilePrefix}_quote_${QuoteFixtureState}`>>;
  publicTokensByState: Partial<Record<QuoteFixtureState, `${PerFilePrefix}_token_${QuoteFixtureState}`>>;
};
```

### CI artifact names

| Job | Artifact name | Contents | Retention |
|---|---|---|---|
| verify | `verify-reports-<sha7>` | `reports/vitest-verify.json`, `coverage/` | 14 days |
| server-tests | `integration-reports-<sha7>` | `reports/vitest-integration.json`, `playwright-report/`, `test-results/` | 14 days |
| preview-smoke | `playwright-report-preview-<sha7>` | `playwright-report/`, `test-results/` | 14 days |

All names use the short SHA (`${github.sha}` is 40 chars; a setup step derives `sha7=${GITHUB_SHA:0:7}` and writes it to `$GITHUB_OUTPUT`). Satisfies Requirement 12.7.

### `deployment_status` event contract

The preview-smoke job reads:

- `github.event.deployment_status.state` — must be `success` to proceed.
- `github.event.deployment.environment` — must be `preview`.
- `github.event.deployment_status.target_url` — primary preview URL.
- `github.event.deployment.sha` — the commit to check out so tests match the deploy.

Fallback via Vercel REST `GET /v13/deployments` filtered by `gitCommitSha` if `target_url` is empty or missing.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Most of this feature is declarative configuration (YAML, Vitest config, package scripts, documentation). Those pieces are covered by snapshot-style integration checks and the guard tests listed in the Testing Strategy section rather than property-based tests.

The portions with genuine universally quantified invariants are:

- **Per-file prefix derivation** — a pure string function from any filename to an identifier-safe prefix.
- **Fixture namespacing** — every row produced by `createWorkflowFixture(prefix)`, `createBillingFixture(prefix, ...)`, and `createQuoteFixture(prefix, ..., ...)` has an identifier whose string form includes the prefix.
- **Fixture cleanup round-trip** — for any prefix, `createWorkflowFixture` followed by `cleanupWorkflowFixture` leaves the database with no rows whose identifiers match that prefix in the cleanup table set.
- **Fetch guard coverage** — for any non-local URL, the guarded `fetch` implementation throws; for any local URL, it delegates to the original.
- **Layout verifier** — for any synthetic tree containing a `.test.ts` file outside the four allowed folders, the verifier returns a failure with the offending path.
- **Secret-leakage scanner** — for any file content containing the verbatim value of a known `Test_Secret_Placeholder`, the scanner flags that file; for any file content that does not contain a placeholder, it passes.

### Property 1: Per-file prefix is identifier-safe

*For any* file path string, `derivePerFilePrefix(path)` returns a non-empty string whose characters are all in `[a-zA-Z0-9_]`, whose first character is in `[a-zA-Z0-9]`, and which does not start or end with `_`.

**Validates: Requirements 10.3, 10.4, 10.12**

### Property 2: Per-file prefix is stable across directory changes

*For any* two file paths whose basenames (without extension) are equal, `derivePerFilePrefix` returns the same prefix. The prefix depends only on the basename, not on the containing directory.

**Validates: Requirements 10.3, 10.12**

### Property 3: Workflow fixture rows are namespaced by prefix

*For any* `Per_File_Prefix` value `p`, every identifier string returned by `getWorkflowFixtureIds(p)` and every row identifier inserted by `createWorkflowFixture(p)` into the tables `user`, `businesses`, `business_members`, `business_inquiry_forms`, and `inquiries` contains `p` as a substring.

**Validates: Requirements 10.3, 10.12**

### Property 4: Workflow fixture create-then-cleanup is a round trip

*For any* `Per_File_Prefix` value `p`, after running `createWorkflowFixture(p)` followed by `cleanupWorkflowFixture(p)`, none of the tables listed in Requirement 10.4 contain any row whose identifier matches `p`.

**Validates: Requirements 10.4, 10.9, 5.13**

### Property 5: Workflow fixture create is idempotent

*For any* `Per_File_Prefix` value `p`, running `createWorkflowFixture(p)` twice in sequence produces the same database state as running it once, because the second call deletes the prior run's rows before inserting.

**Validates: Requirements 10.4, 10.9**

### Property 6: Fetch guard blocks non-local hosts

*For any* URL whose hostname is not `127.0.0.1` or `localhost`, calling the guarded `fetch` rejects with an error whose message names the blocked hostname.

**Validates: Requirements 7.3, 7.4**

### Property 7: Fetch guard passes through local hosts

*For any* URL whose hostname is `127.0.0.1` or `localhost`, the guarded `fetch` delegates to the underlying `fetch` with the same arguments and returns its result unchanged.

**Validates: Requirement 7.4**

### Property 8: Layout verifier flags every misplaced test file

*For any* synthetic file tree rooted at `tests/` containing at least one file whose basename matches `*.test.ts`, `*.test.tsx`, or `*.spec.ts` under a path that is not under `tests/unit/`, `tests/components/`, `tests/integration/`, or `tests/e2e/`, the layout verifier exits non-zero and its error output contains the absolute path of every such misplaced file.

**Validates: Requirement 1.7**

### Property 9: Secret-leakage scanner flags every file containing a placeholder

*For any* file whose textual content contains the verbatim value of any known `Test_Secret_Placeholder` and whose path lives under `tests/`, `reports/`, `playwright-report/`, or `test-results/`, the scanner exits non-zero and names that file. For files not containing any placeholder, the scanner passes.

**Validates: Requirement 11.6**

### Property 10: Quote fixture round trip for supported states

*For any* non-empty subset `S` of `QuoteFixtureState` values, after running `createQuoteFixture(p, S, workflow)` followed by `cleanupQuoteFixture(p)`, the `quotes` and `quote_items` tables contain no row whose identifier matches `p`.

**Validates: Requirements 10.6, 10.9**

### Property 11: Billing fixture round trip for supported states

*For any* non-empty subset `S` of `BillingFixtureState` values, after running `createBillingFixture(p, S)` followed by `cleanupBillingFixture(p)`, the `account_subscriptions` table contains no row whose identifier matches `p`, and `businesses.plan` for every business owned by `${p}_account` is reset to its pre-fixture state.

**Validates: Requirements 10.5, 10.9**

## Error Handling

### Test-runner-side errors

| Condition | Detection | Response |
|---|---|---|
| `Test_File` outside the four folders | Layout verifier scans `tests/` at run start | Vitest exits non-zero; message names every offending absolute path (Req 1.7) |
| Vitest unit/component test imports a module that touches DB/FS/network/clock/random at import time | `vi.mock`-based sentinel in `tests/support/fetch-guard.ts` + a module-load trace | Vitest fails the run; error names the importing test file and the offending module specifier (Req 3.6) |
| Component test exceeds 10s without annotation | `timing.test.ts` post-run check | Vitest run fails with the test's name (Req 4.7) |
| Vitest test exceeds 30s without annotation | Same post-run check | Vitest run fails with the test's name (Req 7.8) |
| E2E test exceeds 90s without annotation | Playwright `test.slow` threshold + a regex grep over the source file for `test.setTimeout` + justification comment | Playwright run fails (Req 6.11) |
| `@smoke` test does not match one of the five required workflows | Tag-to-spec map enforced in `tests/e2e/smoke-registry.ts`; Playwright `test.beforeAll` asserts the tag appears in the registry | Playwright fails that spec file (Req 6.9) |
| Test issues outbound HTTP to a non-local host | `tests/support/fetch-guard.ts` | Test fails with an error message naming the target host and the `Test_File` (Req 7.4) |

### Database and migration errors

| Condition | Detection | Response |
|---|---|---|
| `DATABASE_URL` unset/empty when needed | `scripts/test/check-db.mjs` prepended to `test:integration` and local `test:e2e:smoke` | Exit non-zero; error message contains the string `DATABASE_URL` (Req 2.8) |
| Postgres not reachable within 10s | Same check script with a 10s timeout | Exit non-zero; error message contains the string `DATABASE_URL` (Req 2.8) |
| `npm run db:migrate` fails | `test:integration` and local `test:e2e:smoke` run it first and check the exit code | Exit non-zero before starting any integration or smoke test (Reqs 2.4, 10.1, 10.2) |
| `npm run db:seed-demo` fails | `test:e2e:smoke` local path runs it before starting smoke; Playwright `webServer.command` embeds it | Exit non-zero; name the failing seed script (Reqs 10.2, 10.8) |
| Integration test leaves rows after teardown | `tests/integration/_afterAll/residue.test.ts` runs last, selects identifiers prefixed by any known test file prefix across the cleanup table set | Vitest fails the run; names the offending `Test_File` and each affected table (Req 5.13) |

### CI-side errors

| Condition | Detection | Response |
|---|---|---|
| Postgres service container not healthy within 120s | `scripts/ci/wait-for-postgres.sh` | Fail `server-tests` job with an error message naming the Postgres service (Req 8.9) |
| `Verify_Job` exceeds 20 minutes | `timeout-minutes: 20` on the job | Job cancelled and failed (Req 8.10) |
| `Server_Tests_Job` exceeds 25 minutes | `timeout-minutes: 25` on the job | Job cancelled and failed (Req 8.10) |
| `Verify_Job` fails or is cancelled | `needs: verify` on `server-tests` | `server-tests` is not started (Req 8.5) |
| Artifact upload runs after a failed step | `if: always()` on every upload step | Artifacts are still uploaded; missing files do not fail (Reqs 8.11, 12.8) |
| Vercel preview reports a failed state | `preview-smoke` job `if:` condition checks `state == 'success'` before running; a paired job with `state == 'failure'` posts a comment linking deployment logs | No Playwright suite is run; failure is reported to the PR (Req 9.6) |
| Preview URL cannot be resolved within 60s | `scripts/ci/resolve-preview-url.mjs` has a 60s combined budget | Exit non-zero; job fails (Req 9.3) |
| Preview smoke suite exceeds 600s | `timeout-minutes: 10` on the run step | Step fails (Req 9.4) |
| Vercel preview deploy not ready within 900s of PR open/sync | Job-level `timeout-minutes: 15` on `preview-smoke` plus the `deployment_status` trigger (GitHub delivers the event when Vercel posts a status; we fail the job cleanly if no event is delivered in 900s) | `preview-smoke` fails; pull request summary reports no preview deploy seen (Req 9.2) |

### Flake handling

Playwright is configured with `retries: 1` in CI (Req 7.5). When a test fails then passes within retries, Playwright's JSON reporter records the retry status. A post-run step in the relevant job reads that JSON, emits a markdown "Flakes" section into `$GITHUB_STEP_SUMMARY`, and posts a PR comment annotation listing each flaky test (Reqs 7.6, 7.7).

## Testing Strategy

### Why property-based testing applies only to a subset of this feature

Most deliverables are configuration (YAML, Vitest/Playwright config, `package.json` scripts) or documentation (`tests/README.md`, `docs/ci-cd.md`). For these, input does not vary meaningfully across executions and running 100 iterations yields no additional signal. The right tests are example-based and schema-based:

- **CI workflow**: snapshot-style lint via `actionlint`, a unit test that parses `ci.yml` with `js-yaml` and asserts on the set of job names, trigger names, timeouts, permissions, and Postgres service config.
- **Vitest configs**: unit tests that import each config, assert environment, aliases, coverage exclusions, and reporters.
- **Playwright config**: unit tests that import the config with `PLAYWRIGHT_BASE_URL` set and unset, assert on the resolved `baseURL`, and that `webServer` is undefined in preview mode.
- **`tests/README.md` and `docs/ci-cd.md`**: a unit test grep-asserts each required section heading and each required link exists.

The PBT-applicable subset is the pure-logic and cleanup-invariant surface captured in the Correctness Properties section above.

### Test layering

- **Unit tests (Vitest, jsdom)** — all existing unit tests, plus:
  - `tests/unit/_guards/layout.test.ts`, `secrets.test.ts`, `outbound-http.test.ts`, `timing.test.ts`
  - `tests/unit/test-infra/prefix.test.ts` — property tests for Properties 1 and 2 using `fast-check`.
  - `tests/unit/test-infra/fetch-guard.test.ts` — property tests for Properties 6 and 7 using `fast-check`.
  - `tests/unit/test-infra/layout-verifier.test.ts` — property test for Property 8 over synthetic file trees.
  - `tests/unit/test-infra/secret-scanner.test.ts` — property test for Property 9.
  - `tests/unit/test-infra/vitest-config.test.ts` — example tests asserting Vitest config fields (Req 1.4, 1.6, 12.3).
  - `tests/unit/test-infra/playwright-config.test.ts` — example tests covering local and preview modes (Reqs 6.6, 6.7, 9.5).
  - `tests/unit/test-infra/ci-workflow.test.ts` — example tests parsing `.github/workflows/ci.yml` and asserting jobs, triggers, timeouts, permissions, concurrency, Postgres service, and artifact retention (Reqs 8, 11, 12).

- **Component tests (Vitest, jsdom)** — no new component tests are required by this feature, but Req 4.5 mandates Component_Tests for the login form, public inquiry form, quote editor, send-quote dialog, and paywalled command menu. Any currently missing from `tests/components/` are added during implementation, with user-event and role-based queries (Reqs 4.2, 4.6).

- **Integration tests (Vitest, node + Postgres)** — all existing integration tests, plus:
  - `tests/integration/test-infra/workflow-fixture.test.ts` — property tests for Properties 3, 4, 5 against the real Test_Database, seeded and cleaned by the fixtures themselves.
  - `tests/integration/test-infra/billing-fixture.test.ts` — property tests for Property 11.
  - `tests/integration/test-infra/quote-fixture.test.ts` — property tests for Property 10.
  - `tests/integration/_afterAll/residue.test.ts` — the final-run residue check described under Error Handling, implementing the assertion behind Req 5.13.

- **End-to-end smoke tests (Playwright, chromium)** — the five smoke workflows in `tests/e2e/`:
  - `tests/e2e/auth-and-dashboard.spec.ts` covers owner sign-in and non-member denial (Reqs 6.1, 6.2).
  - `tests/e2e/public-inquiry.spec.ts` covers public inquiry submission (Req 6.3).
  - `tests/e2e/dashboard-workflows.spec.ts` covers quote creation and sending (Req 6.4).
  - `tests/e2e/public-quote.spec.ts` covers public quote response (Req 6.5).
  - Each spec tags its smoke test `@smoke` and registers it in `tests/e2e/smoke-registry.ts` (Req 6.9).

### Property-based testing setup

- Library: `fast-check` (already a devDependency).
- Iterations: minimum 100 per property (the fast-check default). Configured via `fc.configureGlobal({ numRuns: 100 })` in a Vitest setup file under `tests/unit/test-infra/` and `tests/integration/test-infra/`.
- Each property test is tagged with a comment of the form:
  ```ts
  // Feature: test-infrastructure-cicd, Property 3: Workflow fixture rows are namespaced by prefix
  ```
  on the line immediately above the `test(...)` call.
- Property generators:
  - Prefixes: `fc.stringMatching(/^[a-z][a-z0-9_]{2,15}$/)`.
  - File paths: `fc.webPath()` composed with `fc.constantFrom('.test.ts', '.test.tsx', '.spec.ts')` for the extension.
  - Fixture state subsets: `fc.subarray(ALL_STATES)` filtered to non-empty.
  - URLs: `fc.webUrl()` for the fetch-guard property, with local-host variants built from `fc.constantFrom('127.0.0.1', 'localhost')`.

### Local developer workflow

- `npm run check` — lint + typecheck, sequential, both run even when the first fails (Req 2.7).
- `npm run test` — unit + component, sequential, both run even when the first fails (Req 2.3).
- `npm run test:integration` — migrate then run integration suite against `DATABASE_URL` (Reqs 2.4, 10.1).
- `npm run test:e2e:smoke` — the five required smoke tests; requires a reachable database and passing migrate+seed locally (Reqs 2.5, 10.2).
- `npm run test:e2e` — full Playwright suite (Req 2.6).
- `npm run test:coverage` — v8 coverage with the documented excludes (Reqs 12.3, 12.4).

Each script exits with the underlying tool's exit code. All of them succeed with all third-party API credentials set to empty strings or `Test_Secret_Placeholder` values (Req 2.9).

### CI verification

`scripts/ci/*` helpers (wait-for-postgres, resolve-preview-url, run-sequential) are themselves covered by unit tests under `tests/unit/test-infra/ci-scripts.test.ts` so the CI scaffolding is verified without running against GitHub Actions.

### Done criteria

This feature is complete when:

1. `tests/` uses only the four documented top-level folders plus `tests/support/` and `tests/README.md`, and the layout verifier enforces it.
2. Every fixture factory lives under `tests/support/fixtures/`, uses `Per_File_Prefix` namespacing, and owns its own teardown on passing and failing paths.
3. `vitest.config.ts`, `vitest.integration.config.ts`, and `playwright.config.ts` satisfy every runner-related acceptance criterion and emit JSON artifacts.
4. `.github/workflows/ci.yml` defines `verify`, `server-tests`, and non-gating `preview-smoke` jobs with the required triggers, timeouts, permissions, Postgres service, artifact uploads, and flake annotations.
5. `tests/README.md` and `docs/ci-cd.md` exist and satisfy Requirement 13.
6. `npm run check`, `npm run test`, `npm run test:integration`, `npm run test:coverage`, and `npm run test:e2e:smoke` all complete successfully in CI.
7. All Correctness Properties are implemented as property-based tests with at least 100 iterations each, tagged with the feature/property reference comment.
