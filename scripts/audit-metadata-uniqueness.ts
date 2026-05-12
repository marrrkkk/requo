#!/usr/bin/env tsx
/**
 * Audit: metadata title/description uniqueness on static public pages
 *
 * Walks `app/(marketing)/**\/page.tsx` and `app/(public)/inquire/**\/page.tsx`,
 * extracting `title` and `description` literal values from each
 * `metadata = { ... }` block. Dynamic `[param]` routes are skipped — their
 * metadata is content-dependent and cannot be compared statically.
 *
 * Flags any duplicate title or description across the remaining pages.
 *
 * Exits 0 on no violations, 1 on violations.
 *
 * Usage: npx tsx scripts/audit-metadata-uniqueness.ts
 *
 * Validates: Requirements 2.5
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

const TARGET_DIRS = [
  path.join(ROOT, "app", "(marketing)"),
  path.join(ROOT, "app", "(public)", "inquire"),
];

type StaticPage = {
  readonly absFile: string;
  readonly source: string;
  readonly title: string | null;
  readonly titleIndex: number;
  readonly description: string | null;
  readonly descriptionIndex: number;
};

function isDynamicRouteFile(rel: string): boolean {
  // Any segment wrapped in `[...]` marks the route as dynamic.
  return /\[[^\]/\\]+\]/.test(rel);
}

/**
 * Locate the `metadata = { ... }` object literal in `source` and return
 * the slice between its outer braces (or the full source if not found).
 * Not a full parser — good enough for the simple metadata exports in use.
 */
function extractMetadataBlock(source: string): { block: string; offset: number } | null {
  const re = /\bmetadata\s*(?::\s*Metadata\s*)?=\s*\{/;
  const match = source.match(re);
  if (!match || match.index === undefined) return null;
  const braceStart = source.indexOf("{", match.index);
  if (braceStart === -1) return null;
  let depth = 0;
  for (let i = braceStart; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return { block: source.slice(braceStart, i + 1), offset: braceStart };
      }
    }
  }
  return null;
}

function matchLiteralField(
  block: string,
  key: "title" | "description",
): { value: string; index: number } | null {
  const re = new RegExp(
    `\\b${key}\\s*:\\s*(?:"((?:[^"\\\\]|\\\\.)*)"|'((?:[^'\\\\]|\\\\.)*)'|\`((?:[^\`\\\\]|\\\\.)*)\`)`,
  );
  const match = block.match(re);
  if (!match || match.index === undefined) return null;
  return {
    value: match[1] ?? match[2] ?? match[3] ?? "",
    index: match.index,
  };
}

async function readStaticPage(abs: string): Promise<StaticPage | null> {
  const source = await readText(abs);
  if (/\bexport\s+async\s+function\s+generateMetadata\b/.test(source)) return null;
  if (!/\bexport\s+const\s+metadata\b/.test(source)) return null;

  const block = extractMetadataBlock(source);
  if (!block) return null;

  const title = matchLiteralField(block.block, "title");
  const description = matchLiteralField(block.block, "description");

  return {
    absFile: abs,
    source,
    title: title?.value ?? null,
    titleIndex: title ? block.offset + title.index : -1,
    description: description?.value ?? null,
    descriptionIndex: description ? block.offset + description.index : -1,
  };
}

async function main(): Promise<void> {
  const pages: StaticPage[] = [];
  for (const dir of TARGET_DIRS) {
    const files = await walk(dir, (_abs, rel) => {
      if (!rel.endsWith("page.tsx")) return false;
      return !isDynamicRouteFile(rel);
    });
    for (const file of files) {
      const page = await readStaticPage(file);
      if (page) pages.push(page);
    }
  }

  const titleBuckets = new Map<string, StaticPage[]>();
  const descBuckets = new Map<string, StaticPage[]>();
  for (const page of pages) {
    if (page.title) {
      const list = titleBuckets.get(page.title) ?? [];
      list.push(page);
      titleBuckets.set(page.title, list);
    }
    if (page.description) {
      const list = descBuckets.get(page.description) ?? [];
      list.push(page);
      descBuckets.set(page.description, list);
    }
  }

  const offenders: Offender[] = [];
  for (const [value, group] of titleBuckets) {
    if (group.length < 2) continue;
    for (const page of group) {
      offenders.push({
        file: relPath(page.absFile),
        line: lineOf(page.source, page.titleIndex),
        message: `duplicate metadata.title ${JSON.stringify(value)}`,
      });
    }
  }
  for (const [value, group] of descBuckets) {
    if (group.length < 2) continue;
    for (const page of group) {
      offenders.push({
        file: relPath(page.absFile),
        line: lineOf(page.source, page.descriptionIndex),
        message: `duplicate metadata.description ${JSON.stringify(value)}`,
      });
    }
  }

  exitIfOffenders("audit-metadata-uniqueness", offenders);
}

await main().catch((err) => {
  console.error(err);
  process.exit(2);
});
