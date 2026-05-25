import { NextResponse } from "next/server";

import { and, count, eq, gte, isNotNull, isNull, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  analyticsBenchmarks,
  businesses,
  inquiries,
  quotes,
} from "@/lib/db/schema";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron job: monthly aggregation of anonymized metrics grouped by industry
 * category and size tier. Computes median values for key metrics and upserts
 * into `analytics_benchmarks`. Only stores benchmarks for groups with ≥ 10
 * businesses to preserve anonymity.
 *
 * Size tiers are determined by monthly inquiry volume:
 * - small: < 50 inquiries/month
 * - medium: 50–200 inquiries/month
 * - large: > 200 inquiries/month
 *
 * Runs monthly via Vercel Cron (1st of each month at 03:00 UTC).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await computeBenchmarks();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/analytics-benchmarks] Failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

type SizeTier = "small" | "medium" | "large";

/**
 * Determines size tier based on average monthly inquiry count.
 */
function getSizeTier(avgMonthlyInquiries: number): SizeTier {
  if (avgMonthlyInquiries < 50) return "small";
  if (avgMonthlyInquiries <= 200) return "medium";
  return "large";
}

/**
 * Computes the statistical median from a sorted array of numbers.
 */
function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

type MetricKey = "formConversionRate" | "quoteAcceptanceRate" | "avgResponseHours";

type BusinessMetrics = {
  businessId: string;
  industryCategory: string;
  sizeTier: SizeTier;
  formConversionRate: number | null;
  quoteAcceptanceRate: number | null;
  avgResponseHours: number | null;
};

async function computeBenchmarks() {
  // Look at the prior 30 days for metrics
  const now = new Date();
  const since = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, now.getUTCDate()),
  );

  // Get all active businesses with an industry category
  const activeBusinesses = await db
    .select({
      id: businesses.id,
      industryCategory: businesses.industryCategory,
    })
    .from(businesses)
    .where(
      and(
        isNull(businesses.deletedAt),
        isNotNull(businesses.industryCategory),
      ),
    );

  if (activeBusinesses.length === 0) {
    return { message: "No businesses with industry category", upserted: 0 };
  }

  // For each business, compute size tier and key metrics
  const businessMetrics: BusinessMetrics[] = [];

  for (const biz of activeBusinesses) {
    try {
      const metrics = await computeBusinessMetrics(biz.id, since, now);
      businessMetrics.push({
        businessId: biz.id,
        industryCategory: biz.industryCategory!,
        sizeTier: metrics.sizeTier,
        formConversionRate: metrics.formConversionRate,
        quoteAcceptanceRate: metrics.quoteAcceptanceRate,
        avgResponseHours: metrics.avgResponseHours,
      });
    } catch (error) {
      console.error(
        `[cron/analytics-benchmarks] Failed to compute metrics for business ${biz.id}:`,
        error,
      );
    }
  }

  // Group by (industry_category, size_tier)
  const groups = new Map<string, BusinessMetrics[]>();
  for (const m of businessMetrics) {
    const key = `${m.industryCategory}::${m.sizeTier}`;
    const group = groups.get(key) ?? [];
    group.push(m);
    groups.set(key, group);
  }

  // For each group with ≥ 10 businesses, compute medians and upsert
  let upserted = 0;
  let skipped = 0;

  for (const [, members] of groups) {
    if (members.length < 10) {
      skipped++;
      continue;
    }

    const industryCategory = members[0].industryCategory;
    const sizeTier = members[0].sizeTier;

    const metricKeys: MetricKey[] = [
      "formConversionRate",
      "quoteAcceptanceRate",
      "avgResponseHours",
    ];

    for (const metricKey of metricKeys) {
      const values = members
        .map((m) => m[metricKey])
        .filter((v): v is number => v !== null);

      if (values.length === 0) continue;

      const medianValue = computeMedian(values);

      await db
        .insert(analyticsBenchmarks)
        .values({
          id: createId("abm"),
          industryCategory,
          sizeTier,
          metricKey,
          medianValue,
          businessCount: members.length,
          computedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            analyticsBenchmarks.industryCategory,
            analyticsBenchmarks.sizeTier,
            analyticsBenchmarks.metricKey,
          ],
          set: {
            medianValue,
            businessCount: members.length,
            computedAt: now,
          },
        });

      upserted++;
    }
  }

  return {
    totalBusinesses: activeBusinesses.length,
    groupsProcessed: groups.size,
    groupsSkipped: skipped,
    benchmarksUpserted: upserted,
  };
}

/**
 * Computes key metrics for a single business over the period.
 */
async function computeBusinessMetrics(
  businessId: string,
  since: Date,
  until: Date,
) {
  const [inquiryRows, quoteRows, timingRows] = await Promise.all([
    // Inquiry count for size tier + form conversion
    db
      .select({
        total: count(),
      })
      .from(inquiries)
      .where(
        and(
          eq(inquiries.businessId, businessId),
          gte(inquiries.submittedAt, since),
          lt(inquiries.submittedAt, until),
        ),
      ),
    // Quotes sent and accepted for acceptance rate
    db
      .select({
        sent: sql<number>`count(*) filter (where ${quotes.sentAt} is not null)`,
        accepted: sql<number>`count(*) filter (where ${quotes.status} = 'accepted')`,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          isNotNull(quotes.sentAt),
          gte(quotes.sentAt, since),
          lt(quotes.sentAt, until),
        ),
      ),
    // Average response time in hours
    db
      .select({
        avgHours: sql<number | null>`avg(extract(epoch from (${quotes.createdAt} - ${inquiries.submittedAt})) / 3600)`,
      })
      .from(inquiries)
      .innerJoin(quotes, eq(quotes.inquiryId, inquiries.id))
      .where(
        and(
          eq(inquiries.businessId, businessId),
          gte(inquiries.submittedAt, since),
          lt(inquiries.submittedAt, until),
          isNotNull(quotes.sentAt),
        ),
      ),
  ]);

  const totalInquiries = Number(inquiryRows[0]?.total ?? 0);
  const quotesSent = Number(quoteRows[0]?.sent ?? 0);
  const quotesAccepted = Number(quoteRows[0]?.accepted ?? 0);
  const avgHours = timingRows[0]?.avgHours != null ? Number(timingRows[0].avgHours) : null;

  // Size tier based on monthly inquiry volume
  const sizeTier = getSizeTier(totalInquiries);

  // Form conversion rate: inquiries / unique form views is complex here,
  // so we use inquiry-to-quote rate as a proxy for benchmarking
  const formConversionRate = totalInquiries > 0 && quotesSent > 0
    ? quotesSent / totalInquiries
    : null;

  const quoteAcceptanceRate = quotesSent > 0
    ? quotesAccepted / quotesSent
    : null;

  return {
    sizeTier,
    formConversionRate,
    quoteAcceptanceRate,
    avgResponseHours: avgHours,
  };
}
