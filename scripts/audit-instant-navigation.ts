#!/usr/bin/env tsx
/**
 * Audit: instant-navigation progressive data loading.
 *
 * For every in-scope dashboard route (see `IN_SCOPE_ROUTES` in
 * `lib/instant-navigation/escape-hatches.ts`) plus every page under `app/`:
 *
 * 1. No legacy `unstable_instant` exports — Next.js 16.3 does not read them.
 *    They must be migrated to the supported `instant` export.
 * 2. Every in-scope route exports the supported `instant` config, unless it
 *    carries a valid tracked escape-hatch registry entry.
 * 3. No blocking page-level awaits — the default export of an in-scope
 *    `page.tsx` must be synchronous. Dynamic reads (`params`,
 *    `searchParams`, session, business context, queries) belong in
 *    `<Suspense>`-wrapped async child server components.
 * 4. Loading coverage — an in-scope dynamic route must have either a sibling
 *    `loading.tsx` (initial page load) or an in-file `<Suspense>` fallback
 *    (client navigation).
 *
 * Redirect-only legacy routes, print routes, and public preview document
 * routes are intentionally out of scope and are not scanned by rules 2–4.
 *
 * Exits 0 on no violations, 1 on violations.
 *
 * Usage: npx tsx scripts/audit-instant-navigation.ts
 */

import { access } from "node:fs/promises";
import path from "node:path";

import { escapeHatchRegistry } from "../lib/instant-navigation/escape-hatch-registry";
import {
  IN_SCOPE_ROUTES,
  validateEscapeHatch,
} from "../lib/instant-navigation/escape-hatches";
import {
  exitIfOffenders,
  lineOf,
  readText,
  relPath,
  ROOT,
  walk,
  type Offender,
} from "./audit-lib";

const APP_DIR = path.join(ROOT, "app");

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function hasInstantExport(source: string): boolean {
  if (!/export\s+(const|let|var)\s+instant\b/.test(source)) {
    return false;
  }
  // `instant = false` opts the segment out — not validation coverage.
  if (/(?<![A-Za-z0-9_])instant\s*=\s*false\b/.test(source)) {
    return false;
  }
  return true;
}

function hasBlockingPageExport(source: string): number {
  const idx = source.search(/export\s+default\s+async\s+(function|const|class)/);
  return idx;
}

function hasSuspenseFallback(source: string): boolean {
  return /<Suspense\b[^>]*fallback=/.test(source);
}

function hasValidEscapeHatch(route: string): boolean {
  const entry = escapeHatchRegistry.find(
    (candidate) => candidate.route === route && candidate.active,
  );
  if (!entry) return false;
  return validateEscapeHatch(entry).ok;
}

async function main(): Promise<void> {
  const offenders: Offender[] = [];

  // Rule 1: no legacy exports anywhere under app/.
  const appFiles = await walk(
    APP_DIR,
    (_abs, rel) => rel.endsWith(".tsx") || rel.endsWith(".ts"),
  );
  for (const file of appFiles) {
    const source = await readText(file);
    const idx = source.search(
      /export\s+(const|let|var)\s+unstable_instant\b/,
    );
    if (idx !== -1) {
      offenders.push({
        file: relPath(file),
        line: lineOf(source, idx),
        message:
          "legacy `unstable_instant` export is not read by Next.js 16.3 — migrate to `export const instant = true`",
      });
    }
  }

  // Rules 2–4: per in-scope route.
  for (const route of IN_SCOPE_ROUTES) {
    const abs = path.join(ROOT, route);
    const source = await readText(abs);
    if (!source) {
      offenders.push({
        file: route,
        line: 1,
        message: "in-scope page file not found on disk",
      });
      continue;
    }

    if (hasValidEscapeHatch(route)) {
      continue;
    }

    if (!hasInstantExport(source)) {
      const idx = source.search(/export\s+default\b/);
      offenders.push({
        file: route,
        line: idx === -1 ? 1 : lineOf(source, idx),
        message:
          "in-scope route is missing the supported `instant` export and has no valid escape-hatch entry",
      });
    }

    const blockingIdx = hasBlockingPageExport(source);
    if (blockingIdx !== -1) {
      offenders.push({
        file: route,
        line: lineOf(source, blockingIdx),
        message:
          "blocking page-level async default export — return the shell synchronously and move dynamic reads into <Suspense>-wrapped children",
      });
    }

    const siblingLoading = path.join(path.dirname(abs), "loading.tsx");
    const hasLoadingFile = await fileExists(siblingLoading);
    if (!hasLoadingFile && !hasSuspenseFallback(source)) {
      offenders.push({
        file: route,
        line: 1,
        message:
          "dynamic route has neither a sibling loading.tsx nor an in-file <Suspense> fallback",
      });
    }
  }

  exitIfOffenders("audit-instant-navigation", offenders);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
