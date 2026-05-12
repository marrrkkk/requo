#!/usr/bin/env tsx
/**
 * Audit: `"use cache"` purity
 *
 * Walks the repo and finds every function whose body contains the
 * `"use cache"` directive. Flags any such function whose body also calls
 * `cookies()` or `headers()` (which would read request state and defeat the
 * point of a cross-request cache).
 *
 * This is a best-effort regex audit: it splits the source at each
 * `"use cache"` occurrence and scans forward until an approximate function
 * end (matched by brace depth).
 *
 * Exits 0 on no violations, 1 on violations.
 *
 * Usage: npx tsx scripts/audit-use-cache-purity.ts
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
 * Starting from the `"use cache"` match position, walk forward to find the
 * enclosing function's closing brace using a simple brace counter.
 * We look backward from the directive for the enclosing `{` then forward.
 */
function extractFunctionBody(
  source: string,
  directiveIndex: number,
): { body: string; startLine: number } | null {
  // Find opening `{` before the directive.
  let openIdx = -1;
  for (let i = directiveIndex - 1; i >= 0; i -= 1) {
    if (source[i] === "{") {
      openIdx = i;
      break;
    }
  }
  if (openIdx === -1) return null;

  // Walk forward counting braces.
  let depth = 0;
  let endIdx = source.length;
  // Simple string/comment skipping to avoid miscounting.
  for (let i = openIdx; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    // Skip line comments.
    if (ch === "/" && next === "/") {
      const nl = source.indexOf("\n", i);
      if (nl === -1) break;
      i = nl;
      continue;
    }
    // Skip block comments.
    if (ch === "/" && next === "*") {
      const close = source.indexOf("*/", i + 2);
      if (close === -1) break;
      i = close + 1;
      continue;
    }
    // Skip strings (naive — handles escapes).
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
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }
  }

  const body = source.slice(openIdx, endIdx + 1);
  const startLine = source.slice(0, directiveIndex).split(/\r?\n/).length;
  return { body, startLine };
}

function main(): number {
  const files: string[] = [];
  for (const dir of SCAN_DIRS) {
    walk(path.join(ROOT, dir), files);
  }

  const offenders: Offender[] = [];

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    if (!/"use cache"/.test(source)) continue;

    const re = /"use cache"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source))) {
      const extracted = extractFunctionBody(source, m.index);
      if (!extracted) continue;
      const { body, startLine } = extracted;
      if (/\bcookies\s*\(/.test(body)) {
        offenders.push({
          file: path.relative(ROOT, file),
          line: startLine,
          reason: "cookies() called inside 'use cache' function",
        });
      }
      if (/\bheaders\s*\(/.test(body)) {
        offenders.push({
          file: path.relative(ROOT, file),
          line: startLine,
          reason: "headers() called inside 'use cache' function",
        });
      }
    }
  }

  if (offenders.length === 0) {
    console.log("audit-use-cache-purity: OK (no violations)");
    return 0;
  }

  console.error(`audit-use-cache-purity: ${offenders.length} violation(s)`);
  for (const o of offenders) {
    console.error(`  ${o.file}:${o.line}  ${o.reason}`);
  }
  return 1;
}

process.exit(main());
