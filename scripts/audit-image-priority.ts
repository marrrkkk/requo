#!/usr/bin/env tsx
/**
 * Audit: one `<Image priority>` per route segment
 *
 * Walks `app/**` (skipping `app/api/**`) and counts `<Image ... priority>`
 * occurrences per file. Flags when:
 *   - any single file has more than one `<Image priority>`
 *   - a route segment's `page.tsx` + `layout.tsx` combined carry more than
 *     one `<Image priority>`
 *
 * Exits 0 on no violations, 1 on violations.
 *
 * Usage: npx tsx scripts/audit-image-priority.ts
 *
 * Validates: Requirements 11.3
 */

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

type Hit = {
  readonly absFile: string;
  readonly line: number;
};

/**
 * Scan a single file for `<Image ... priority>` occurrences. Uses a simple
 * JSX opener walker: find every `<Image`, then scan forward for the
 * matching `>` and look for `priority` (as attribute shorthand, `priority=`,
 * `priority/`, or `priority>`).
 */
function findPriorityHits(absFile: string, source: string): Hit[] {
  const hits: Hit[] = [];
  const re = /<Image\b/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    const start = match.index;
    let end = start;
    let braceDepth = 0;
    for (let i = start; i < source.length; i += 1) {
      const ch = source[i];
      if (ch === "{") braceDepth += 1;
      else if (ch === "}") braceDepth -= 1;
      else if (ch === ">" && braceDepth === 0) {
        end = i;
        break;
      }
    }
    if (end === start) continue;
    const opener = source.slice(start, end + 1);
    if (!/\bpriority(\s|=|\/|>)/.test(opener)) continue;
    if (/\bpriority\s*=\s*\{\s*false\s*\}/.test(opener)) continue;
    hits.push({ absFile, line: lineOf(source, start) });
  }
  return hits;
}

async function main(): Promise<void> {
  const files = await walk(APP_DIR, (_abs, rel) => {
    if (rel.includes("/api/") || rel.includes("\\api\\")) return false;
    return /\.(tsx|jsx)$/.test(rel);
  });

  const hitsByFile = new Map<string, Hit[]>();
  for (const file of files) {
    const source = await readText(file);
    const hits = findPriorityHits(file, source);
    if (hits.length > 0) hitsByFile.set(file, hits);
  }

  const offenders: Offender[] = [];

  // Per-file: > 1 priority Image.
  for (const [file, hits] of hitsByFile) {
    if (hits.length <= 1) continue;
    for (const h of hits) {
      offenders.push({
        file: relPath(file),
        line: h.line,
        message: `${hits.length} <Image priority> in a single file; keep priority on exactly one LCP image`,
      });
    }
  }

  // Per segment: page.tsx + layout.tsx combined > 1 priority Image.
  const segments = new Map<string, Hit[]>();
  for (const [file, hits] of hitsByFile) {
    const base = path.basename(file);
    if (base !== "page.tsx" && base !== "layout.tsx") continue;
    const dir = path.dirname(file);
    const existing = segments.get(dir) ?? [];
    existing.push(...hits);
    segments.set(dir, existing);
  }
  for (const [dir, hits] of segments) {
    if (hits.length <= 1) continue;
    // Skip if they all live in the same file (already reported above).
    const uniqueFiles = new Set(hits.map((h) => h.absFile));
    if (uniqueFiles.size < 2) continue;
    for (const h of hits) {
      offenders.push({
        file: relPath(h.absFile),
        line: h.line,
        message: `multiple <Image priority> in route segment ${relPath(dir) || "/"}; only one per segment`,
      });
    }
  }

  exitIfOffenders("audit-image-priority", offenders);
}

await main().catch((err) => {
  console.error(err);
  process.exit(2);
});
