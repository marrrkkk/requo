#!/usr/bin/env node
// Runs two npm scripts sequentially, always executing both even when the first
// exits non-zero, and exits with the first non-zero code (or 0 when both pass).
//
// Usage: node scripts/test/run-sequential.mjs <script-a> <script-b>
// Example: node scripts/test/run-sequential.mjs test:unit test:components
//
// Satisfies Requirements 2.3 and 2.7 of the test-infrastructure-cicd spec.

import { spawnSync } from "node:child_process";
import process from "node:process";

const args = process.argv.slice(2);

if (args.length !== 2) {
  process.stderr.write(
    `run-sequential: expected exactly 2 npm script names, got ${args.length}.\n` +
      `Usage: node scripts/test/run-sequential.mjs <script-a> <script-b>\n`,
  );
  process.exit(2);
}

const [scriptA, scriptB] = args;

// Restrict script names to a safe character set so we can use `shell: true`
// (required on Windows, where npm is a `.cmd` shim that Node refuses to spawn
// directly) without opening a command-injection hole.
const NPM_SCRIPT_NAME_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9:_\-.]*$/;

function runNpmScript(scriptName) {
  if (!NPM_SCRIPT_NAME_PATTERN.test(scriptName)) {
    process.stderr.write(
      `run-sequential: refusing to run script with unsafe name "${scriptName}".\n` +
        `Allowed characters: letters, digits, and ":_-." (must start with a letter, digit, or underscore).\n`,
    );
    return 1;
  }

  const result = spawnSync(`npm run ${scriptName}`, {
    stdio: "inherit",
    env: process.env,
    shell: true,
  });

  if (result.error) {
    process.stderr.write(
      `run-sequential: failed to spawn "npm run ${scriptName}": ${result.error.message}\n`,
    );
    return 1;
  }

  if (typeof result.status === "number") {
    return result.status;
  }

  // Process was terminated by a signal; surface it as a non-zero exit code.
  process.stderr.write(
    `run-sequential: "npm run ${scriptName}" terminated by signal ${result.signal ?? "unknown"}\n`,
  );
  return 1;
}

const codeA = runNpmScript(scriptA);
const codeB = runNpmScript(scriptB);

// First non-zero wins; 0 only when both passed.
const exitCode = codeA !== 0 ? codeA : codeB;
process.exit(exitCode);
