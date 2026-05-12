# CI/CD Pipeline

GitHub Actions owns merge gates. Vercel owns preview and production deployments. This page covers the jobs in the CI workflow, how the preview-smoke job resolves a preview URL, the path to promote preview-smoke into a merge gate, and how to rerun a failed job.

Related files:

- Workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
- Design: [`.kiro/specs/test-infrastructure-cicd/design.md`](../.kiro/specs/test-infrastructure-cicd/design.md)
- Tests guide: [`tests/README.md`](../tests/README.md)

## Jobs

### `verify` (merge gate)

- Trigger: `pull_request` against `main`/`master`, push to `main`/`master`, `workflow_dispatch`.
- Timeout: 20 minutes.
- Runs: `npm ci` → `npm run lint` → `npm run typecheck` → `npm run test:coverage` → `npm run build`.
- Artifacts: `verify-reports-<sha>` retains `reports/vitest-verify.json` and `coverage/` for 14 days.
- Status: required status check. A failure blocks merge.

### `server-tests` (merge gate)

- Trigger: runs after `verify` succeeds on the same `pull_request`, push, or `workflow_dispatch` event.
- Timeout: 25 minutes.
- Service: Postgres 16 container with deterministic `postgres:postgres` credentials on port 5432, database `requo`.
- Gating step: `bash ./scripts/ci/wait-for-postgres.sh` with a 2-minute timeout waits for the Postgres health check before any DB-backed test runs.
- Runs: `npm run test:integration` → `npx playwright install --with-deps chromium` → `npm run test:e2e:smoke` → flake annotation step.
- Artifacts: `integration-reports-<sha>` (Vitest integration JSON) and `playwright-report-smoke-<sha>` (Playwright HTML/JSON report plus `test-results/`). 14-day retention.
- Status: required status check. A failure blocks merge.

### `preview-smoke` (non-gating during rollout)

- Trigger: `deployment_status` event with `state == 'success'` and `environment == 'preview'`.
- Timeout: 20 minutes overall. The preview URL resolution step is capped at 1 minute and the smoke suite is capped at 10 minutes.
- Runs: resolve the preview URL → `npx playwright install --with-deps chromium` → `npm run test:e2e:smoke` with `PLAYWRIGHT_BASE_URL` set → flake annotation.
- Artifacts: `playwright-report-preview-<sha>` (Playwright HTML/JSON plus `test-results/`). 14-day retention.
- Status: `continue-on-error: true` during rollout. A failure does NOT block merges.

## Preview URL resolution

The `preview-smoke` job resolves the Vercel preview URL via [`scripts/ci/resolve-preview-url.mjs`](../scripts/ci/resolve-preview-url.mjs):

1. Read the `deployment_status` payload from the GitHub event. The workflow supplies it via `toJSON(github.event.deployment_status)` in the `DEPLOYMENT_PAYLOAD` env var.
2. Prefer the payload's `target_url` field when it is a non-empty `https://` URL.
3. Fall back to the Vercel REST API at `https://api.vercel.com/v6/deployments?projectId=<id>&meta-githubCommitSha=<sha>&limit=1` using `VERCEL_TOKEN` and `VERCEL_PROJECT_ID`. The commit sha comes from `payload.deployment.sha` or `GITHUB_SHA`.
4. Enforce a 60-second wall budget across both steps combined.
5. On success, append `url=<resolved>\n` to `$GITHUB_OUTPUT` so downstream steps can reference `steps.<id>.outputs.url`.
6. On failure, exit non-zero with a descriptive stderr message.

## Promoting preview-smoke to a merge gate

Per Requirement 9.8, once `preview-smoke` reports success on ten consecutive pull requests it graduates to a required status check.

Promotion checklist:

1. Audit the last 10 pull requests closed into `main` or `master`. Confirm every one shows a green `preview-smoke` check.
2. Edit `.github/workflows/ci.yml` and remove `continue-on-error: true` from the `preview-smoke` job.
3. Update GitHub branch protection: add `preview-smoke` to the required status checks for `main` and `master`.
4. Update this document to note the promotion date and remove the "non-gating during rollout" caveat.
5. Announce the change in the usual engineering channel.

Rollback path: if `preview-smoke` starts producing flakes after promotion, restore `continue-on-error: true` and remove it from required status checks. Investigate the root cause before re-promoting.

## Rerunning a failed job

### Through the GitHub Actions UI

1. Open the failed pull request or the push's commit page.
2. Click the Checks tab.
3. Find the failed job in the left sidebar.
4. Click "Re-run failed jobs" in the top right to retry only the failed job, or "Re-run all jobs" to restart the whole workflow.
5. Watch the logs for the reproduction. Artifacts from the previous failing run are retained for 14 days.

### Through the `gh` CLI

```bash
# Find the run id from the PR page, commit status, or:
gh run list --workflow ci.yml --branch <branch-name> --limit 5

# Re-run only failed jobs on that run:
gh run rerun <run-id> --failed

# Or re-run the whole workflow:
gh run rerun <run-id>
```

`gh run view <run-id> --log-failed` is useful for inspecting the failing step's log without downloading the full artifact archive.

## Related

- Workflow file: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
- Local dev scripts: [`scripts/test/check-db.mjs`](../scripts/test/check-db.mjs), [`scripts/test/check-db-if-local.mjs`](../scripts/test/check-db-if-local.mjs), [`scripts/test/run-sequential.mjs`](../scripts/test/run-sequential.mjs), [`scripts/ci/wait-for-postgres.sh`](../scripts/ci/wait-for-postgres.sh), [`scripts/ci/resolve-preview-url.mjs`](../scripts/ci/resolve-preview-url.mjs)
- Design document: [`.kiro/specs/test-infrastructure-cicd/design.md`](../.kiro/specs/test-infrastructure-cicd/design.md)
- Tests README: [`tests/README.md`](../tests/README.md)
- Agent guide: [`AGENTS.md`](../AGENTS.md)
