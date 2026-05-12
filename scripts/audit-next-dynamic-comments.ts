#!/usr/bin/env tsx
/**
 * Audit: `next/dynamic` with `ssr: false` requires a comment
 *
 * Every `dynamic(...)` call that passes `ssr: false` must carry an adjacent
 * inline comment explaining the browser-API reason. `ssr: false` disables
 * server rendering and should only be used when the component depends on a
 * `window` / `document` / other browser API.
 *
 * Flags any `dynamic(...)` call with `ssr: false` that does not have a
 * comment on the same line or the line immediately preceding the
 * `dynamic(` keyword.
 *
 * Exits 0 on no violations, 1 on violations.
 *
 * Usage: npx tsx scripts/audit-next-dynamic-comments.ts
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "components", "features", "lib"];
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build"]);

type Offender = {
  file: string;
  line: number;
  reason: string;
};

function walk(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), acc);
    } else if (entry.isFile() && /\.(tsx?|mts|cts)$/.test(entry.name)) {
      acc.push(path.join(dir, entry.name));
    }
  }
  return acc;
}

/**
 * Find the closing paren that matches the opening paren at index `openIdx`.
 */
function findMatchingParen(source: string, openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === "/" && next === "/") {
      const nl = source.indexOf("\n", i);
      if (nl === -1) return source.length - 1;
      i = nl;
      continue;
    }
    if (ch === "/" && next === "*") {
      const close = source.indexOf("*/", i + 2);
      if (close === -1) return source.length - 1;
      i = close + 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      i += 1;
      while (i < source.length) {
        if (source[i] === "\\") {
          i += 2;
          continue;
        }
        if (source[i] === quote) break;
        i += 1;
      }
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return source.length - 1;
}

/**
 * Return true when the line containing `dynamic(` or the line immediately
 * preceding it contains a comment (line or block).
 */
function hasExplanatoryComment(source: string, dynamicIdx: number): boolean {
  const lines = source.split(/\r?\n/);
  const preText = source.slice(0, dynamicIdx);
  const dynLine = preText.split(/\r?\n/).length - 1; // 0-based

  // Same-line inline comment, anywhere before `dynamic(`.
  const current = lines[dynLine] ?? "";
  const beforeDynamic = current.slice(0, current.indexOf("dynamic("));
  if (/\/\//.test(beforeDynamic) || /\/\*/.test(beforeDynamic)) return true;

  // Check up to 3 lines above (to allow block-comment JSDoc).
  for (let i = dynLine - 1; i >= Math.max(0, dynLine - 3); i -= 1) {
    const line = lines[i].trim();
    if (line === "") continue;
    if (line.startsWith("//")) return true;
    if (line.endsWith("*/") || line.startsWith("/*") || line.startsWith("*")) return true;
    return false;
  }
  return false;
}

function main(): number {
  const files: string[] = [];
  for (const dir of SCAN_DIRS) walk(path.join(ROOT, dir), files);

  const offenders: Offender[] = [];

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    if (!/from\s+["']next\/dynamic["']/.test(source)) continue;
    if (!/\bdynamic\s*\(/.test(source)) continue;

    const re = /\bdynamic\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source))) {
      const openIdx = source.indexOf("(", m.index);
      if (openIdx === -1) continue;
      const closeIdx = findMatchingParen(source, openIdx);
      const call = source.slice(m.index, closeIdx + 1);
      if (!/\bssr\s*:\s*false\b/.test(call)) continue;

      if (!hasExplanatoryComment(source, m.index)) {
        const line = source.slice(0, m.index).split(/\r?\n/).length;
        offenders.push({
          file: path.relative(ROOT, file),
          line,
          reason:
            "dynamic(..., { ssr: false }) requires an adjacent comment explaining browser-API usage",
        });
      }
    }
  }

  if (offenders.length === 0) {
    console.log("audit-next-dynamic-comments: OK (no violations)");
    return 0;
  }

  console.error(
    `audit-next-dynamic-comments: ${offenders.length} dynamic() call(s) missing comment`,
  );
  for (const o of offenders) {
    console.error(`  ${o.file}:${o.line}  ${o.reason}`);
  }
  return 1;
}

process.exit(main());
