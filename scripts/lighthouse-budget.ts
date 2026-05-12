#!/usr/bin/env tsx
/**
 * Lighthouse CWV budget runner for the `seo-budget` GitHub Actions job.
 *
 * Audits a fixed set of public URLs against the Core Web Vitals targets
 * declared in the seo-performance-improvements spec (Requirements 13.2 –
 * 13.5) and reports pass/fail so the CI job can gate non-critical
 * violations behind waivers while still failing hard on critical
 * regressions.
 *
 * Inputs (env):
 * - DEPLOYMENT_URL                (required) Base URL of the preview/prod.
 * - REPRESENTATIVE_BUSINESS_SLUG  (optional) Adds `/businesses/<slug>` to
 *                                 the audit set when provided.
 * - PR_DESCRIPTION                (optional) Scanned for waiver annotations
 *                                 of the form `seo-budget-waiver: <reason>`.
 *                                 Each waiver excuses one non-critical
 *                                 violation.
 *
 * Exit codes:
 * - 0  all metrics pass, or every non-critical violation is waived.
 * - 1  at least one critical violation, OR any non-critical violation that
 *      is not covered by a waiver.
 * - 2  misconfiguration (missing DEPLOYMENT_URL, lighthouse invocation
 *      failure, JSON parse failure, etc.).
 *
 * Implementation notes:
 * - Lighthouse lab runs do not measure field INP. We use Total Blocking
 *   Time (TBT) as the lab proxy for INP, matching the Lighthouse team's
 *   own guidance. The classification thresholds (200ms budget, 500ms
 *   critical) are applied to TBT for lab comparisons.
 * - `npx --yes lighthouse@latest` installs lighthouse on demand; no new
 *   package dependency is introduced.
 * - Only Node built-ins are imported.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

type MetricStatus = "ok" | "violation" | "critical";

type MetricName = "lcp" | "inp" | "cls";

type MetricThresholds = {
  /** Budget threshold — exceeding it flags a non-critical violation. */
  budget: number;
  /** Critical threshold — exceeding it fails unconditionally. */
  critical: number;
};

type MetricReading = {
  name: MetricName;
  /** Raw value in the metric's native unit (ms for LCP / TBT, ratio for CLS). */
  value: number;
  displayValue: string;
  status: MetricStatus;
};

type UrlAuditResult = {
  url: string;
  metrics: MetricReading[];
};

const METRIC_THRESHOLDS: Record<MetricName, MetricThresholds> = {
  // Largest Contentful Paint (ms): 2.5s budget, 4.0s critical ceiling.
  lcp: { budget: 2500, critical: 4000 },
  // Total Blocking Time (ms) as the lab proxy for Interaction to Next Paint.
  inp: { budget: 200, critical: 500 },
  // Cumulative Layout Shift (unitless ratio).
  cls: { budget: 0.1, critical: 0.25 },
};

function formatMilliseconds(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatCls(value: number): string {
  return value.toFixed(3);
}

export function classifyMetric(
  value: number,
  thresholds: MetricThresholds,
): MetricStatus {
  if (value > thresholds.critical) return "critical";
  if (value > thresholds.budget) return "violation";
  return "ok";
}

export function parseWaivers(prBody: string | undefined): string[] {
  if (!prBody) return [];
  const waivers: string[] = [];
  const pattern = /seo-budget-waiver:\s*(.+)/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(prBody)) !== null) {
    const reason = match[1]?.trim();
    if (reason) waivers.push(reason);
  }
  return waivers;
}

function joinUrl(base: string, pathname: string): string {
  return new URL(pathname, base).toString();
}

function buildUrlList(
  deploymentUrl: string,
  businessSlug: string | undefined,
): string[] {
  const urls = [
    joinUrl(deploymentUrl, "/"),
    joinUrl(deploymentUrl, "/pricing"),
    joinUrl(deploymentUrl, "/inquire"),
  ];
  const trimmedSlug = businessSlug?.trim();
  if (trimmedSlug) {
    urls.push(joinUrl(deploymentUrl, `/businesses/${trimmedSlug}`));
  }
  return urls;
}

export function runLighthouseOnUrl(url: string): UrlAuditResult {
  const tmpDir = mkdtempSync(join(tmpdir(), "lighthouse-budget-"));
  const reportPath = join(tmpDir, "report.json");
  try {
    const result = spawnSync(
      "npx",
      [
        "--yes",
        "lighthouse@latest",
        url,
        "--output=json",
        `--output-path=${reportPath}`,
        "--quiet",
        "--chrome-flags=--headless=new",
        "--preset=desktop",
      ],
      { stdio: ["ignore", "inherit", "inherit"], shell: true },
    );

    if (result.error) {
      throw new Error(
        `Failed to spawn lighthouse for ${url}: ${result.error.message}`,
      );
    }
    if (typeof result.status !== "number" || result.status !== 0) {
      throw new Error(
        `lighthouse exited with status ${result.status ?? "unknown"} for ${url}`,
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(reportPath, "utf8"));
    } catch (error) {
      throw new Error(
        `Failed to parse lighthouse JSON for ${url}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const audits =
      (parsed as { audits?: Record<string, { numericValue?: number }> })
        .audits ?? {};
    const lcp = Number(audits["largest-contentful-paint"]?.numericValue ?? 0);
    const tbt = Number(audits["total-blocking-time"]?.numericValue ?? 0);
    const cls = Number(audits["cumulative-layout-shift"]?.numericValue ?? 0);

    const metrics: MetricReading[] = [
      {
        name: "lcp",
        value: lcp,
        displayValue: formatMilliseconds(lcp),
        status: classifyMetric(lcp, METRIC_THRESHOLDS.lcp),
      },
      {
        name: "inp",
        value: tbt,
        displayValue: formatMilliseconds(tbt),
        status: classifyMetric(tbt, METRIC_THRESHOLDS.inp),
      },
      {
        name: "cls",
        value: cls,
        displayValue: formatCls(cls),
        status: classifyMetric(cls, METRIC_THRESHOLDS.cls),
      },
    ];

    return { url, metrics };
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

export function summarize(
  results: UrlAuditResult[],
  waivers: string[],
): { exitCode: number; report: string } {
  const lines: string[] = [];
  lines.push("SEO budget — Lighthouse run");
  lines.push("");
  lines.push("URL · LCP · INP (TBT proxy) · CLS");
  lines.push("─".repeat(48));

  const criticalIssues: string[] = [];
  const nonCriticalIssues: string[] = [];

  for (const { url, metrics } of results) {
    const row = metrics
      .map((metric) => `${metric.name.toUpperCase()}=${metric.displayValue} [${metric.status}]`)
      .join(" · ");
    lines.push(`${url}`);
    lines.push(`  ${row}`);

    for (const metric of metrics) {
      if (metric.status === "critical") {
        criticalIssues.push(
          `${url} — ${metric.name.toUpperCase()} = ${metric.displayValue} exceeds critical threshold`,
        );
      } else if (metric.status === "violation") {
        nonCriticalIssues.push(
          `${url} — ${metric.name.toUpperCase()} = ${metric.displayValue} exceeds budget`,
        );
      }
    }
  }

  lines.push("");

  if (criticalIssues.length > 0) {
    lines.push("Critical violations (not waivable):");
    for (const issue of criticalIssues) lines.push(`  - ${issue}`);
    lines.push("");
  }

  if (nonCriticalIssues.length > 0) {
    lines.push("Non-critical violations:");
    for (const issue of nonCriticalIssues) lines.push(`  - ${issue}`);
    lines.push("");
  }

  if (waivers.length > 0) {
    lines.push("Waivers found in PR description:");
    for (const waiver of waivers) lines.push(`  - ${waiver}`);
    lines.push("");
  }

  // Each waiver excuses exactly one non-critical violation, in the order
  // they were discovered. Critical violations are never waivable.
  const unwaivedNonCritical = Math.max(
    0,
    nonCriticalIssues.length - waivers.length,
  );

  const hasCritical = criticalIssues.length > 0;
  const exitCode = hasCritical || unwaivedNonCritical > 0 ? 1 : 0;

  if (exitCode === 0) {
    lines.push("Status: PASS");
    if (nonCriticalIssues.length > 0) {
      lines.push(
        `(${nonCriticalIssues.length} non-critical violation(s) excused by ${waivers.length} waiver(s))`,
      );
    }
  } else if (hasCritical) {
    lines.push(
      `Status: FAIL — ${criticalIssues.length} critical violation(s) block release`,
    );
  } else {
    lines.push(
      `Status: FAIL — ${unwaivedNonCritical} non-critical violation(s) without waiver`,
    );
  }

  return { exitCode, report: lines.join("\n") };
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    process.stderr.write(
      `lighthouse-budget: missing required env var ${name}.\n`,
    );
    process.exit(2);
  }
  return value;
}

async function main(): Promise<void> {
  const deploymentUrl = requireEnv("DEPLOYMENT_URL");
  const businessSlug = process.env.REPRESENTATIVE_BUSINESS_SLUG;
  const prBody = process.env.PR_DESCRIPTION;

  const urls = buildUrlList(deploymentUrl, businessSlug);
  const results: UrlAuditResult[] = [];
  for (const url of urls) {
    // Run serially to avoid thrashing headless Chrome in CI.
    results.push(runLighthouseOnUrl(url));
  }

  const waivers = parseWaivers(prBody);
  const { exitCode, report } = summarize(results, waivers);
  process.stdout.write(`${report}\n`);
  process.exit(exitCode);
}

main().catch((error) => {
  process.stderr.write(
    `lighthouse-budget: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(2);
});
