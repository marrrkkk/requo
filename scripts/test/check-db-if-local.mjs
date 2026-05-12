#!/usr/bin/env node
// Conditional wrapper around check-db.mjs for the Playwright smoke suite.
//
// When PLAYWRIGHT_BASE_URL is set and non-empty, the smoke run is targeting
// a deployed environment (for example a Vercel preview) and the local
// Postgres guard does not apply. Exit 0 immediately.
//
// When PLAYWRIGHT_BASE_URL is unset or empty, delegate to check-db.mjs so
// the local smoke run fails fast if DATABASE_URL is unreachable.
//
// See .kiro/specs/test-infrastructure-cicd requirements 2.8, 9.5, and 10.2.

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const previewBaseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim();

if (previewBaseUrl) {
  process.exit(0);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const result = spawnSync(
  process.execPath,
  [path.join(here, "check-db.mjs")],
  { stdio: "inherit" },
);

if (result.error) {
  process.stderr.write(
    `check-db-if-local: failed to spawn check-db.mjs (${result.error.message}).\n`,
  );
  process.exit(1);
}

process.exit(result.status ?? 1);
