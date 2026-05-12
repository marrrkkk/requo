#!/usr/bin/env tsx
/**
 * Audit: loading.tsx coverage
 *
 * For every `app/**\/page.tsx` whose body contains a server-side `await`
 * (anything that is not `await params` / `await searchParams` /
 * `await connection(...)`), assert a sibling `loading.tsx` exists in the
 * same directory.
 *
 * Exits 0 on no violations, 1 on violations.
 *
 * Usage: npx tsx scripts/audit-loading-coverage.ts
 *
 * Validates: Requirements 8.3
 */

import { access } from "node:fs/promises";
import path from "node:path";

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

const IGNORABLE_AWAIT = [
  /\bawait\s+params\b/,
  /\bawait\s+searchParams\b/,
  /\bawait\s+connection\s*\(/,
];

/**
 * Return the byte offset of the first "real" server fetch await in `source`,
 * or -1 when the file only awaits params/searchParams/connection.
 */
function findServerFetchAwait(source: string): number {
  const re = /\bawait\b/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    const idx = match.index;
    const lineStart = source.lastIndexOf("\n", idx - 1) + 1;
    const lineEnd = source.indexOf("\n", idx);
    const line = source.slice(lineStart, lineEnd === -1 ? source.length : lineEnd);
    if (IGNORABLE_AWAIT.some((re) => re.test(line))) continue;
    return idx;
  }
  return -1;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const pages = await walk(APP_DIR, (_abs, rel) => rel.endsWith("page.tsx"));
  const offenders: Offender[] = [];

  for (const page of pages) {
    const source = await readText(page);
    const idx = findServerFetchAwait(source);
    if (idx === -1) continue;

    const sibling = path.join(path.dirname(page), "loading.tsx");
    if (await fileExists(sibling)) continue;

    offenders.push({
      file: relPath(page),
      line: lineOf(source, idx),
      message: "page uses server-side await but has no sibling loading.tsx",
    });
  }

  exitIfOffenders("audit-loading-coverage", offenders);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
