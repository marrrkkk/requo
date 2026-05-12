/**
 * Timing guard.
 *
 * Mechanism: post-run scan of Vitest's JSON reporter output at
 * `reports/vitest-verify.json`. The reporter emits per-test `duration`
 * values after each Vitest run, so on run N+1 we can flag any test from
 * run N that exceeded the soft-cap for its tier. The guard is
 * self-activating: when the report does not exist yet (a cold repository
 * or a fresh CI runner), the check is a no-op. Once Vitest has written
 * the report once, every subsequent run enforces the caps.
 *
 * This post-run approach sidesteps the fact that a single running test
 * file cannot observe other tests' durations reliably via the in-process
 * `onTestFinished`/`afterAll` hooks — by the time this file's `afterAll`
 * runs, most other files' hooks have already disposed of their state.
 * The reporter-based approach is the only place where durations for
 * every test in a run are observed consistently and centrally.
 *
 * Caps:
 *  - Any Vitest test: 30s.
 *  - Any Component_Test (under `tests/components/`): 10s.
 *
 * Exemption: a test may opt out by declaring an explicit per-test
 * timeout via the options object (`{ timeout: <ms> }`) AND placing a
 * single-line or block-end comment on the immediately preceding line to
 * justify the longer cap.
 *
 * Validates: Requirements 4.7, 6.11, 7.8.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = process.cwd();
const REPORT_PATH = path.join(REPO_ROOT, 'reports', 'vitest-verify.json');

const VITEST_TIMEOUT_MS = 30_000;
const COMPONENT_TIMEOUT_MS = 10_000;

type AssertionResult = {
  ancestorTitles?: string[];
  fullName?: string;
  status?: string;
  title?: string;
  duration?: number | null;
};

type TestFileResult = {
  assertionResults?: AssertionResult[];
  name?: string;
  status?: string;
};

type VitestReport = {
  testResults?: TestFileResult[];
};

type Offender = {
  file: string;
  title: string;
  durationMs: number;
  capMs: number;
};

function loadReport(): VitestReport | null {
  if (!existsSync(REPORT_PATH)) return null;
  try {
    const size = statSync(REPORT_PATH).size;
    if (size === 0) return null;
    const raw = readFileSync(REPORT_PATH, 'utf8');
    return JSON.parse(raw) as VitestReport;
  } catch {
    return null;
  }
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

function isComponentTest(fileName: string): boolean {
  return normalizePath(fileName).includes('/tests/components/');
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const SOURCE_CACHE = new Map<string, string | null>();

function readSource(absolutePath: string): string | null {
  if (SOURCE_CACHE.has(absolutePath)) {
    return SOURCE_CACHE.get(absolutePath) ?? null;
  }
  let contents: string | null = null;
  try {
    contents = readFileSync(absolutePath, 'utf8');
  } catch {
    contents = null;
  }
  SOURCE_CACHE.set(absolutePath, contents);
  return contents;
}

/**
 * Returns true when the test with the given title, declared in `source`,
 * has both an explicit per-test timeout option AND a comment on the
 * immediately preceding line.
 *
 * Recognised declaration shapes (Vitest):
 *   it("title", { timeout: 60_000 }, async () => { ... });
 *   test("title", { timeout: 60_000 }, async () => { ... });
 *   it.skip("title", { timeout: 60_000 }, ...);
 *   it.only("title", { timeout: 60_000 }, ...);
 *
 * A preceding `//` or block-comment-ending line counts as justification.
 */
function isExplicitlyExempt(source: string, title: string): boolean {
  const escapedTitle = escapeForRegex(title);
  const declarationPatterns = [
    new RegExp(`\\b(?:it|test)(?:\\.[A-Za-z_]+)*\\s*\\(\\s*"${escapedTitle}"`, ''),
    new RegExp(`\\b(?:it|test)(?:\\.[A-Za-z_]+)*\\s*\\(\\s*'${escapedTitle}'`, ''),
    new RegExp(`\\b(?:it|test)(?:\\.[A-Za-z_]+)*\\s*\\(\\s*\`${escapedTitle}\``, ''),
  ];

  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const matches = declarationPatterns.some((pattern) => pattern.test(line));
    if (!matches) continue;

    // Look forward up to 20 lines to find the options object. That covers
    // wrapped call sites like:
    //   it(
    //     "title",
    //     { timeout: 60_000 },
    //     async () => { ... },
    //   );
    const forwardWindow = lines
      .slice(i, Math.min(i + 20, lines.length))
      .join('\n');
    const hasTimeoutOption = /\{\s*timeout\s*:\s*\d[_\d]*\s*[,}]/.test(forwardWindow);
    if (!hasTimeoutOption) continue;

    // Preceding line must end with a comment. Trim trailing whitespace and
    // accept either a `//...` line or a `*/` (block comment close).
    const previousLine = i > 0 ? (lines[i - 1] ?? '').trim() : '';
    const isLineComment = previousLine.startsWith('//');
    const isBlockCommentEnd = previousLine.endsWith('*/');
    if (isLineComment || isBlockCommentEnd) return true;
  }
  return false;
}

function collectOffenders(
  report: VitestReport,
  predicate: (fileName: string) => boolean,
  capMs: number,
): Offender[] {
  const offenders: Offender[] = [];
  const files = report.testResults ?? [];

  for (const file of files) {
    const fileName = file.name ?? '';
    if (!fileName) continue;
    if (!predicate(fileName)) continue;

    const assertions = file.assertionResults ?? [];
    for (const assertion of assertions) {
      const status = assertion.status ?? '';
      if (status !== 'passed' && status !== 'failed') continue;
      const duration = typeof assertion.duration === 'number' ? assertion.duration : 0;
      if (duration <= capMs) continue;

      const title = assertion.title ?? assertion.fullName ?? '';
      const source = readSource(fileName);
      const exempt = source ? isExplicitlyExempt(source, title) : false;
      if (exempt) continue;

      offenders.push({ file: fileName, title, durationMs: duration, capMs });
    }
  }

  return offenders;
}

function formatOffenders(offenders: readonly Offender[]): string {
  return offenders
    .map(
      (o) =>
        `  - ${normalizePath(o.file)} :: "${o.title}" ran ${Math.round(
          o.durationMs,
        )}ms (cap ${o.capMs}ms)`,
    )
    .join('\n');
}

describe('timing guard', () => {
  const report = loadReport();

  it('no Vitest test exceeds 30s without explicit opt-out', () => {
    if (report === null) {
      // First-run no-op: the JSON reporter has not written the file yet.
      // The guard activates from the next Vitest run onward.
      expect(true).toBe(true);
      return;
    }

    const offenders = collectOffenders(
      report,
      () => true,
      VITEST_TIMEOUT_MS,
    );

    if (offenders.length > 0) {
      throw new Error(
        `Timing guard: ${offenders.length} Vitest test(s) exceeded ${VITEST_TIMEOUT_MS}ms without an explicit per-test timeout option AND a justification comment on the preceding line:\n${formatOffenders(
          offenders,
        )}\nEither speed the test up, or declare \`{ timeout: N }\` on the call and add a comment explaining why on the line above.`,
      );
    }

    expect(offenders).toEqual([]);
  });

  it('no Component_Test exceeds 10s without explicit opt-out', () => {
    if (report === null) {
      expect(true).toBe(true);
      return;
    }

    const offenders = collectOffenders(
      report,
      isComponentTest,
      COMPONENT_TIMEOUT_MS,
    );

    if (offenders.length > 0) {
      throw new Error(
        `Timing guard: ${offenders.length} Component_Test(s) exceeded ${COMPONENT_TIMEOUT_MS}ms without an explicit per-test timeout option AND a justification comment on the preceding line:\n${formatOffenders(
          offenders,
        )}\nComponent tests should be fast. If a longer cap is genuinely necessary, declare \`{ timeout: N }\` on the call and add a comment explaining why on the line above.`,
      );
    }

    expect(offenders).toEqual([]);
  });
});
