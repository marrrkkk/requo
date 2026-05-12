/**
 * Secret-leakage scanner.
 *
 * Walks every file under `tests/`, `reports/`, `playwright-report/`, and
 * `test-results/` (when present) and fails the run with the absolute path of
 * any file that contains the verbatim value of a known `Test_Secret_Placeholder`.
 *
 * Validates: Requirements 11.6, 12.1, 12.2
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ IMPORTANT                                                               │
 * │ If you add a placeholder value to `tests/support/env.ts`, add it to the │
 * │ `PLACEHOLDERS` array below too. The scanner is intentionally NOT        │
 * │ coupled to the internal shape of `env.ts` (which would make the check   │
 * │ break the moment someone refactors the `defaults` record), so the list  │
 * │ is duplicated on purpose.                                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Non-empty Test_Secret_Placeholder values seeded by `tests/support/env.ts`.
 * Keep this list in sync with the `defaults` record in that file.
 */
const PLACEHOLDERS: readonly string[] = [
  'test-secret-at-least-32-characters-long-so-zod-passes', // BETTER_AUTH_SECRET
  'v1:AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=', // APP_ENCRYPTION_KEYS
  'test-token-hash-secret-at-least-32-characters', // APP_TOKEN_HASH_SECRET
  'test-anon-key', // NEXT_PUBLIC_SUPABASE_ANON_KEY
  'test-service-key', // SUPABASE_SERVICE_ROLE_KEY
];

/**
 * Binary and media extensions skipped during the scan. Placeholder values are
 * ASCII text, so scanning these file types wastes I/O and slows the run.
 */
const BINARY_EXTENSIONS: ReadonlySet<string> = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.bmp',
  '.ico',
  '.pdf',
  '.zip',
  '.gz',
  '.tar',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.otf',
  '.mp4',
  '.mov',
  '.avi',
  '.webm',
  '.mp3',
  '.wav',
  '.ogg',
]);

/** Defensive upper bound on file size (5 MiB) to keep the run fast even if
 *  someone accidentally commits a large artifact under one of the scanned
 *  directories. Placeholder values are short ASCII strings, so a legitimate
 *  test file should never approach this limit. */
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const REPO_ROOT = process.cwd();

const SCAN_ROOTS = [
  path.join(REPO_ROOT, 'tests'),
  path.join(REPO_ROOT, 'reports'),
  path.join(REPO_ROOT, 'playwright-report'),
  path.join(REPO_ROOT, 'test-results'),
];

/**
 * Files that would always trip the scanner because they are the source of the
 * placeholder values themselves. Compared by absolute path equality.
 */
const SELF_SKIP_PATHS: ReadonlySet<string> = new Set([
  path.resolve(REPO_ROOT, 'tests/support/env.ts'),
  path.resolve(REPO_ROOT, 'tests/unit/_guards/secrets.test.ts'),
  // Intentionally documents the placeholder values for contributors; treated
  // as source-of-truth docs, same as `tests/support/env.ts`.
  path.resolve(REPO_ROOT, 'tests/README.md'),
]);

function existsSafe(target: string): boolean {
  try {
    statSync(target);
    return true;
  } catch {
    return false;
  }
}

function* walk(root: string): Generator<string> {
  const entries = safeReaddir(root);
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

function safeReaddir(root: string) {
  try {
    return readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }
}

type Offender = { file: string; placeholder: string };

function scanFile(absolutePath: string): Offender[] {
  const ext = path.extname(absolutePath).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) return [];
  if (SELF_SKIP_PATHS.has(absolutePath)) return [];

  let size: number;
  try {
    size = statSync(absolutePath).size;
  } catch (err) {
    console.warn(`secrets-scanner: cannot stat ${absolutePath}: ${(err as Error).message}`);
    return [];
  }
  if (size > MAX_FILE_BYTES) return [];

  let content: string;
  try {
    content = readFileSync(absolutePath, 'utf8');
  } catch (err) {
    console.warn(`secrets-scanner: cannot read ${absolutePath}: ${(err as Error).message}`);
    return [];
  }

  const hits: Offender[] = [];
  for (const placeholder of PLACEHOLDERS) {
    if (content.includes(placeholder)) {
      hits.push({ file: absolutePath, placeholder });
    }
  }
  return hits;
}

describe('tests/unit/_guards/secrets', () => {
  it('no scanned file contains a Test_Secret_Placeholder verbatim', () => {
    const offenders: Offender[] = [];
    for (const root of SCAN_ROOTS) {
      if (!existsSafe(root)) continue;
      for (const file of walk(root)) {
        offenders.push(...scanFile(file));
      }
    }

    if (offenders.length > 0) {
      const lines = offenders
        .map((o) => `  - ${o.file} contains placeholder "${o.placeholder}"`)
        .join('\n');
      throw new Error(
        `Secret-leakage scanner found ${offenders.length} offending file(s):\n${lines}\n` +
          `Rotate or scrub the placeholder out of these files. Source of truth: tests/support/env.ts`,
      );
    }

    expect(offenders).toEqual([]);
  });
});
