import "server-only";

import { and, count, eq, gte, isNotNull, isNull, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  analyticsBenchmarks,
  businesses,
  inquiries,
  quotes,
} from "@/lib/db/schema";

export type AnalyticsBenchmarksSummary = {
  totalBusinesses?: number;
  groupsProcessed?: number;
  groupsSkipped?: number;
  benchmarksUpserted?: number;
  message?: string;
  upserted?: number;
};

type SizeTier = "small" | "medium" | "large";

type MetricKey = "formConversionRate" | "quoteAcceptanceRate" | "avgResponseHours";

type BusinessMetrics = {
  businessId: string;
  industryCategory: string;
  sizeTier: SizeTier;
  formConversionRate: number | null;
  quoteAcceptanceRate: number | null;
  avgResponseHours: number | null;
};

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function getSizeTier(avgMonthlyInquiries: number): SizeTier {
  if (avgMonthlyInquiries < 50) return "small";
  if (avgMonthlyInquiries <= 200) return "medium";
  return "large";
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

export async function computeAnalyticsBenchmarks(): Promise<AnalyticsBenchmarksSummary> {
  const now = new Date();
  const since = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, now.getUTCDate()),
  );

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
        `[analytics-benchmarks] Failed to compute metrics for business ${biz.id}:`,
        error,
      );
    }
  }

  const groups = new Map<string, BusinessMetrics[]>();
  for (const metric of businessMetrics) {
    const key = `${metric.industryCategory}::${metric.sizeTier}`;
    const group = groups.get(key) ?? [];
    group.push(metric);
    groups.set(key, group);
  }

  let upserted = 0;
  let skipped = 0;

  for (const [, members] of groups) {
    if (members.length < 10) {
      skipped++;
      continue;
    }

    const industryCategory = members[0]!.industryCategory;
    const sizeTier = members[0]!.sizeTier;

    const metricKeys: MetricKey[] = [
      "formConversionRate",
      "quoteAcceptanceRate",
      "avgResponseHours",
    ];

    for (const metricKey of metricKeys) {
      const values = members
        .map((member) => member[metricKey])
        .filter((value): value is number => value !== null);

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

async function computeBusinessMetrics(
  businessId: string,
  since: Date,
  until: Date,
) {
  const [inquiryRows, quoteRows, timingRows] = await Promise.all([
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
  const avgHours =
    timingRows[0]?.avgHours != null ? Number(timingRows[0].avgHours) : null;

  const sizeTier = getSizeTier(totalInquiries);

  const formConversionRate =
    totalInquiries > 0 && quotesSent > 0 ? quotesSent / totalInquiries : null;

  const quoteAcceptanceRate =
    quotesSent > 0 ? quotesAccepted / quotesSent : null;

  return {
    sizeTier,
    formConversionRate,
    quoteAcceptanceRate,
    avgResponseHours: avgHours,
  };
}
