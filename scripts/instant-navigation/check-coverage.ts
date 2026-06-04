#!/usr/bin/env tsx
/**
 * Migration-coverage check for the instant-navigation rollout.
 *
 * For every in-scope route, asserts that the page either:
 * 1. Has instant validation enabled (exports `unstable_instant` WITHOUT
 *    `unstable_disableValidation: true`), OR
 * 2. Has a matching, valid single-route escape-hatch registry entry
 *    (validated via `validateEscapeHatch`).
 *
 * Fails (exit code 1) on any page that is exempted from validation without a
 * valid tracked registry entry. Exits 0 when all routes pass.
 *
 * Usage: npx tsx scripts/instant-navigation/check-coverage.ts
 *
 * Requirements: 2.5, 3.1, 3.3, 7.4
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { escapeHatchRegistry } from "../../lib/instant-navigation/escape-hatch-registry";
import {
  IN_SCOPE_ROUTES,
  validateEscapeHatch,
} from "../../lib/instant-navigation/escape-hatches";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RouteResult = {
  route: string;
  status: "pass-validation-enabled" | "pass-escape-hatch" | "fail";
  reason?: string;
};

// ---------------------------------------------------------------------------
// File analysis helpers (regex-based, no AST parsing)
// ---------------------------------------------------------------------------

/**
 * Returns true if the file content exports `unstable_instant` WITHOUT the
 * `unstable_disableValidation: true` flag — meaning validation is enabled.
 *
 * Detection logic:
 * - Looks for an `unstable_instant` export (const or variable).
 * - If found, checks whether `unstable_disableValidation` is set to `true`
 *   or the export is set to `false` (segment exempted entirely).
 * - Returns true only when the export is present and validation is active.
 */
function hasValidationEnabled(source: string): boolean {
  // Check if unstable_instant is exported at all
  const hasExport =
    /export\s+(const|let|var)\s+unstable_instant\b/.test(source);

  if (!hasExport) {
    return false;
  }

  // Check for `unstable_instant = false` (segment entirely exempt)
  if (/unstable_instant\s*=\s*false\b/.test(source)) {
    return false;
  }

  // Check for `unstable_disableValidation: true` (validation suppressed)
  if (/unstable_disableValidation\s*:\s*true\b/.test(source)) {
    return false;
  }

  // Export is present and validation is not disabled
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const root = process.cwd();
  const results: RouteResult[] = [];

  for (const route of IN_SCOPE_ROUTES) {
    const filePath = path.join(root, route);
    let source: string;

    try {
      source = await readFile(filePath, "utf8");
    } catch {
      // File doesn't exist on disk — still report it
      results.push({
        route,
        status: "fail",
        reason: "Page file not found on disk",
      });
      continue;
    }

    // Check 1: Is instant validation enabled on this page?
    if (hasValidationEnabled(source)) {
      results.push({ route, status: "pass-validation-enabled" });
      continue;
    }

    // Check 2: Is there a matching, valid escape-hatch registry entry?
    const registryEntry = escapeHatchRegistry.find(
      (entry) => entry.route === route && entry.active
    );

    if (!registryEntry) {
      results.push({
        route,
        status: "fail",
        reason:
          "Validation is not enabled and no active escape-hatch registry entry exists for this route",
      });
      continue;
    }

    // Validate the registry entry
    const validation = validateEscapeHatch(registryEntry);
    if (!validation.ok) {
      results.push({
        route,
        status: "fail",
        reason: `Escape-hatch entry is invalid: ${validation.errors.join("; ")}`,
      });
      continue;
    }

    // Valid escape hatch exists
    results.push({ route, status: "pass-escape-hatch" });
  }

  // ---------------------------------------------------------------------------
  // Output
  // ---------------------------------------------------------------------------

  const passed = results.filter((r) => r.status !== "fail");
  const failed = results.filter((r) => r.status === "fail");

  console.log(
    `\n🔍 Instant Navigation Coverage Check\n${"─".repeat(50)}`
  );
  console.log(`Total in-scope routes: ${results.length}`);
  console.log(
    `  ✅ Validation enabled: ${results.filter((r) => r.status === "pass-validation-enabled").length}`
  );
  console.log(
    `  ✅ Valid escape hatch:  ${results.filter((r) => r.status === "pass-escape-hatch").length}`
  );
  console.log(`  ❌ Failed:             ${failed.length}`);
  console.log("");

  if (failed.length > 0) {
    console.error("Failed routes:\n");
    for (const f of failed) {
      console.error(`  ❌ ${f.route}`);
      console.error(`     ${f.reason}\n`);
    }
    process.exit(1);
  }

  console.log("All in-scope routes have coverage. ✅\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Unexpected error running coverage check:", err);
  process.exit(2);
});
