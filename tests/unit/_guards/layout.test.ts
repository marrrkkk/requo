/**
 * Test layout verifier.
 *
 * Scans the repo's `tests/` directory and fails the run if any test file
 * (basename matching `*.test.ts`, `*.test.tsx`, or `*.spec.ts`) lives outside
 * one of the four allowed top-level folders: `unit`, `components`,
 * `integration`, `e2e`. The error message lists the absolute path of every
 * offender so the fix is obvious from CI output alone.
 *
 * Covers Requirements 1.1 and 1.7.
 */

import { readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const TESTS_ROOT = path.resolve(__dirname, "../../");
const ALLOWED_TOP_LEVEL_FOLDERS = new Set([
  "unit",
  "components",
  "integration",
  "e2e",
]);
const TEST_FILE_PATTERN = /\.(test\.(ts|tsx)|spec\.ts)$/;
const SKIPPED_DIRECTORY_NAMES = new Set(["node_modules"]);

function collectTestFiles(dir: string, acc: string[]): void {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIPPED_DIRECTORY_NAMES.has(entry.name)) continue;
      collectTestFiles(entryPath, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    if (TEST_FILE_PATTERN.test(entry.name)) {
      acc.push(entryPath);
    }
  }
}

function firstSegmentUnderTests(absolutePath: string): string {
  const relative = path.relative(TESTS_ROOT, absolutePath);
  const [head] = relative.split(path.sep);
  return head ?? "";
}

describe("tests layout verifier", () => {
  it("every test file lives under an allowed top-level folder", () => {
    const testFiles: string[] = [];
    collectTestFiles(TESTS_ROOT, testFiles);

    const offenders = testFiles.filter((file) => {
      const segment = firstSegmentUnderTests(file);
      return !ALLOWED_TOP_LEVEL_FOLDERS.has(segment);
    });

    expect(
      offenders,
      `Found test files outside the allowed top-level folders (unit, components, integration, e2e):\n${offenders.join(
        "\n",
      )}`,
    ).toEqual([]);
  });
});
