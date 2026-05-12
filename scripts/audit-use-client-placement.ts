#!/usr/bin/env tsx
/**
 * Audit: `"use client"` placement on App Router roots
 *
 * Flags any `app/**\/page.tsx` or `app/**\/layout.tsx` that starts with a
 * top-of-file `"use client"` directive. Server components should remain at
 * every route root; client-only code belongs in leaf components that are
 * imported from the server component.
 *
 * `route.ts` files are never flagged (they are never client components).
 * `error.tsx` / `loading.tsx` / `not-found.tsx` are also allowed to declare
 * `"use client"` when necessary — they are not part of this audit.
 *
 * Exits 0 on no violations, 1 on violations.
 *
 * Usage: npx tsx scripts/audit-use-client-placement.ts
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, "app");
const TARGET_NAMES = new Set(["page.tsx", "layout.tsx"]);

type Offender = {
  file: string;
  line: number;
};

function walk(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, acc);
    } else if (entry.isFile() && TARGET_NAMES.has(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

/**
 * Returns the 1-based line number of the top-of-file `"use client"` directive
 * if present (allowing only comments / blank lines before it), else null.
 */
function findTopUseClient(source: string): number | null {
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (trimmed === "") continue;
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;
    if (/^["']use client["'];?$/.test(trimmed)) return i + 1;
    return null;
  }
  return null;
}

function main(): number {
  const files = walk(APP_DIR);
  const offenders: Offender[] = [];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const line = findTopUseClient(source);
    if (line !== null) {
      offenders.push({
        file: path.relative(ROOT, file),
        line,
      });
    }
  }

  if (offenders.length === 0) {
    console.log("audit-use-client-placement: OK (no page/layout uses 'use client')");
    return 0;
  }

  console.error(
    `audit-use-client-placement: ${offenders.length} page/layout with 'use client'`,
  );
  for (const o of offenders) {
    console.error(
      `  ${o.file}:${o.line}  move client-only code into a leaf component`,
    );
  }
  return 1;
}

process.exit(main());
