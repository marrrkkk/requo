#!/usr/bin/env node
// Resolve the Vercel preview URL for a GitHub `deployment_status` event.
//
// Resolution order (combined 60s budget):
//   1. Read `process.env.DEPLOYMENT_PAYLOAD` (JSON produced via
//      `toJSON(github.event.deployment_status)`) and prefer `target_url`
//      when it is a non-empty https URL.
//   2. Otherwise, query the Vercel REST API filtered by `gitCommitSha`
//      using `VERCEL_TOKEN` and `VERCEL_PROJECT_ID`, falling back on the
//      commit sha from the payload's `deployment.sha` or `GITHUB_SHA`.
//
// On success, appends `url=<resolved>\n` to `$GITHUB_OUTPUT` so the calling
// workflow step can reference `steps.<id>.outputs.url`. Exits non-zero with
// a descriptive stderr message when neither source yields a URL.
//
// See .kiro/specs/test-infrastructure-cicd requirements 9.2, 9.3.

import { appendFileSync } from "node:fs";

const TOTAL_BUDGET_MS = 60_000;
const VERCEL_API_BASE = "https://api.vercel.com";

/**
 * @param {string} message
 * @returns {never}
 */
function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

/**
 * @param {unknown} value
 * @returns {value is string}
 */
function isNonEmptyHttpsUrl(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

/**
 * @param {string} url
 */
function emitUrl(url) {
  const output = process.env.GITHUB_OUTPUT;
  if (output === undefined || output === "") {
    fail(
      "resolve-preview-url: GITHUB_OUTPUT is unset. This script must run inside GitHub Actions.",
    );
  }
  appendFileSync(output, `url=${url}\n`);
  process.stdout.write(`Resolved preview URL: ${url}\n`);
}

/**
 * @param {unknown} payload
 * @returns {string | undefined}
 */
function extractSha(payload) {
  if (payload && typeof payload === "object") {
    const deployment = /** @type {{ deployment?: unknown }} */ (payload).deployment;
    if (deployment && typeof deployment === "object") {
      const sha = /** @type {{ sha?: unknown }} */ (deployment).sha;
      if (typeof sha === "string" && sha.length > 0) return sha;
    }
  }
  const envSha = process.env.GITHUB_SHA;
  return typeof envSha === "string" && envSha.length > 0 ? envSha : undefined;
}

/**
 * @param {AbortSignal} signal
 * @param {string} sha
 * @returns {Promise<string | undefined>}
 */
async function resolveFromVercelApi(signal, sha) {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) {
    process.stderr.write(
      "resolve-preview-url: VERCEL_TOKEN or VERCEL_PROJECT_ID is unset; cannot fall back to Vercel API.\n",
    );
    return undefined;
  }

  const url = new URL(`${VERCEL_API_BASE}/v6/deployments`);
  url.searchParams.set("projectId", projectId);
  url.searchParams.set("meta-githubCommitSha", sha);
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    process.stderr.write(
      `resolve-preview-url: Vercel API returned HTTP ${response.status} ${response.statusText}.\n`,
    );
    return undefined;
  }

  /** @type {unknown} */
  const body = await response.json();
  if (!body || typeof body !== "object") return undefined;

  const deployments = /** @type {{ deployments?: unknown }} */ (body).deployments;
  if (!Array.isArray(deployments) || deployments.length === 0) return undefined;

  const first = deployments[0];
  if (!first || typeof first !== "object") return undefined;

  const rawUrl = /** @type {{ url?: unknown }} */ (first).url;
  if (typeof rawUrl !== "string" || rawUrl.length === 0) return undefined;

  const resolved = rawUrl.startsWith("https://") ? rawUrl : `https://${rawUrl}`;
  return isNonEmptyHttpsUrl(resolved) ? resolved : undefined;
}

async function main() {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, TOTAL_BUDGET_MS);
  timer.unref?.();

  try {
    const rawPayload = process.env.DEPLOYMENT_PAYLOAD;
    if (!rawPayload) {
      fail(
        "resolve-preview-url: DEPLOYMENT_PAYLOAD is unset. Pass `toJSON(github.event.deployment_status)` via env.",
      );
    }

    /** @type {unknown} */
    let payload;
    try {
      payload = JSON.parse(rawPayload);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      fail(`resolve-preview-url: DEPLOYMENT_PAYLOAD is not valid JSON (${message}).`);
    }

    // 1. Prefer the payload's target_url.
    const targetUrl =
      payload && typeof payload === "object"
        ? /** @type {{ target_url?: unknown }} */ (payload).target_url
        : undefined;
    if (isNonEmptyHttpsUrl(targetUrl)) {
      emitUrl(targetUrl);
      return;
    }

    // 2. Fall back to the Vercel REST API filtered by commit sha.
    const sha = extractSha(payload);
    if (!sha) {
      fail(
        "resolve-preview-url: payload has no usable target_url and no commit sha is available (checked deployment.sha and GITHUB_SHA).",
      );
    }

    const resolved = await resolveFromVercelApi(controller.signal, sha);
    if (resolved) {
      emitUrl(resolved);
      return;
    }

    fail(
      `resolve-preview-url: could not resolve a preview URL for commit ${sha} from the deployment_status payload or the Vercel API.`,
    );
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      fail(
        `resolve-preview-url: exceeded the ${TOTAL_BUDGET_MS}ms resolution budget before a URL could be resolved.`,
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    fail(`resolve-preview-url: unexpected error while resolving preview URL (${message}).`);
  } finally {
    clearTimeout(timer);
  }
}

main();
