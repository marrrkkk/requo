import "server-only";

import { and, count, eq, gte, isNotNull, isNull, lt, lte, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import type {
  BusinessAnalyticsData,
  BusinessAnalyticsStatusCount,
  BusinessAnalyticsTrendPoint,
  BusinessAnalyticsActivityPoint,
  ConversionAnalyticsData,
  ConversionTrendPoint,
  WorkflowAnalyticsData,
} from "@/features/analytics/types";
import { inquiryStatuses } from "@/features/inquiries/types";
import {
  getBusinessAnalyticsCacheTags,
  hotBusinessCacheLife,
} from "@/lib/cache/business-tags";
import { db } from "@/lib/db/client";
import { inquiries, quotes } from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const trendLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function startOfUtcWeek(date: Date) {
  const weekStart = new Date(date);
  const day = weekStart.getUTCDay();
  const offset = (day + 6) % 7;

  weekStart.setUTCHours(0, 0, 0, 0);
  weekStart.setUTCDate(weekStart.getUTCDate() - offset);

  return weekStart;
}

function addUtcWeeks(date: Date, weeks: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + weeks * 7);
  return next;
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function toCountMap(
  rows: Array<{ status: (typeof inquiryStatuses)[number]; count: number | string }>,
) {
  const map = new Map<(typeof inquiryStatuses)[number], number>();

  for (const status of inquiryStatuses) {
    map.set(status, 0);
  }

  for (const row of rows) {
    map.set(row.status, Number(row.count));
  }

  return map;
}

// ---------------------------------------------------------------------------
// Overview analytics (existing, extended)
// ---------------------------------------------------------------------------

export async function getBusinessAnalyticsData(
  businessId: string,
): Promise<BusinessAnalyticsData> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessAnalyticsCacheTags(businessId));

  const now = new Date();
  const trendStart = addUtcWeeks(startOfUtcWeek(now), -5);
  const trendStartIso = trendStart.toISOString();
  const thisWeekStart = new Date(now);
  thisWeekStart.setUTCDate(thisWeekStart.getUTCDate() - 6);
  thisWeekStart.setUTCHours(0, 0, 0, 0);
  const quoteActivityTimestamp = sql`coalesce(${quotes.acceptedAt}, ${quotes.sentAt}, ${quotes.createdAt})`;
  const quoteActivityWeek = sql`date_trunc('week', ${quoteActivityTimestamp})`;

  const [
    statusRows,
    thisWeekRows,
    quoteSummaryRows,
    inquiryTrendRows,
    quoteTrendRows,
    inquiryActivityRows,
    quoteActivityRows,
  ] = await Promise.all([
      db
        .select({
          status: inquiries.status,
          count: count(),
        })
        .from(inquiries)
        .where(eq(inquiries.businessId, businessId))
        .groupBy(inquiries.status),
      db
        .select({
          count: count(),
        })
        .from(inquiries)
        .where(
          and(
            eq(inquiries.businessId, businessId),
            gte(inquiries.submittedAt, thisWeekStart),
          ),
        ),
      db
        .select({
          totalQuotes: sql<number>`count(*)`,
          sentQuotes: sql<number>`count(*) filter (where ${quotes.status} in ('sent', 'accepted', 'rejected', 'expired'))`,
          acceptedQuotes: sql<number>`count(*) filter (where ${quotes.status} = 'accepted')`,
          rejectedQuotes: sql<number>`count(*) filter (where ${quotes.status} = 'rejected')`,
          expiredQuotes: sql<number>`count(*) filter (where ${quotes.status} = 'expired')`,
          linkedInquiryCount: sql<number>`count(distinct ${quotes.inquiryId}) filter (where ${quotes.inquiryId} is not null)`,
          avgQuoteValueInCents: sql<number>`coalesce(avg(${quotes.totalInCents}) filter (where ${quotes.status} != 'draft'), 0)`,
        })
        .from(quotes)
        .where(eq(quotes.businessId, businessId)),
      db
        .select({
          weekStart: sql<string>`to_char(date_trunc('week', ${inquiries.submittedAt}), 'YYYY-MM-DD')`,
          inquiries: sql<number>`count(*)`,
          won: sql<number>`count(*) filter (where ${inquiries.status} = 'won')`,
          lost: sql<number>`count(*) filter (where ${inquiries.status} = 'lost')`,
        })
        .from(inquiries)
        .where(
          and(
            eq(inquiries.businessId, businessId),
            gte(inquiries.submittedAt, trendStart),
          ),
        )
        .groupBy(sql`date_trunc('week', ${inquiries.submittedAt})`)
        .orderBy(sql`date_trunc('week', ${inquiries.submittedAt})`),
      db
        .select({
          weekStart: sql<string>`to_char(${quoteActivityWeek}, 'YYYY-MM-DD')`,
          acceptedQuotes: sql<number>`count(*) filter (where ${quotes.status} = 'accepted')`,
        })
        .from(quotes)
        .where(
          and(
            eq(quotes.businessId, businessId),
            sql`${quoteActivityTimestamp} >= ${trendStartIso}::timestamptz`,
          ),
        )
        .groupBy(quoteActivityWeek)
        .orderBy(quoteActivityWeek),
      db
        .select({
          date: sql<string>`to_char(date_trunc('day', ${inquiries.submittedAt}), 'YYYY-MM-DD')`,
          count: sql<number>`count(*)`,
        })
        .from(inquiries)
        .where(eq(inquiries.businessId, businessId))
        .groupBy(sql`date_trunc('day', ${inquiries.submittedAt})`),
      db
        .select({
          date: sql<string>`to_char(date_trunc('day', ${quoteActivityTimestamp}), 'YYYY-MM-DD')`,
          count: sql<number>`count(*)`,
        })
        .from(quotes)
        .where(eq(quotes.businessId, businessId))
        .groupBy(sql`date_trunc('day', ${quoteActivityTimestamp})`),
    ]);

  const inquiryStatusCountsMap = toCountMap(
    statusRows as Array<{
      status: (typeof inquiryStatuses)[number];
      count: number | string;
    }>,
  );
  const inquiryStatusCounts: BusinessAnalyticsStatusCount[] = inquiryStatuses.map(
    (status) => ({
      status,
      count: inquiryStatusCountsMap.get(status) ?? 0,
    }),
  );

  const totalInquiries = inquiryStatusCounts.reduce(
    (sum, row) => sum + row.count,
    0,
  );
  const wonCount = inquiryStatusCountsMap.get("won") ?? 0;
  const lostCount = inquiryStatusCountsMap.get("lost") ?? 0;

  const quoteSummary = {
    totalQuotes: Number(quoteSummaryRows[0]?.totalQuotes ?? 0),
    sentQuotes: Number(quoteSummaryRows[0]?.sentQuotes ?? 0),
    acceptedQuotes: Number(quoteSummaryRows[0]?.acceptedQuotes ?? 0),
    rejectedQuotes: Number(quoteSummaryRows[0]?.rejectedQuotes ?? 0),
    expiredQuotes: Number(quoteSummaryRows[0]?.expiredQuotes ?? 0),
    linkedInquiryCount: Number(quoteSummaryRows[0]?.linkedInquiryCount ?? 0),
    acceptanceRate: 0,
    inquiryCoverageRate: 0,
    averageQuoteValueInCents: Math.round(
      Number(quoteSummaryRows[0]?.avgQuoteValueInCents ?? 0),
    ),
  };

  quoteSummary.acceptanceRate = quoteSummary.sentQuotes
    ? quoteSummary.acceptedQuotes / quoteSummary.sentQuotes
    : 0;
  quoteSummary.inquiryCoverageRate = totalInquiries
    ? quoteSummary.linkedInquiryCount / totalInquiries
    : 0;

  const inquiryTrendMap = new Map(
    inquiryTrendRows.map((row) => [
      row.weekStart,
      {
        inquiries: Number(row.inquiries),
        won: Number(row.won),
        lost: Number(row.lost),
      },
    ]),
  );
  const quoteTrendMap = new Map(
    quoteTrendRows.map((row) => [row.weekStart, Number(row.acceptedQuotes)]),
  );

  const recentTrend: BusinessAnalyticsTrendPoint[] = Array.from({ length: 6 }).map(
    (_, index) => {
      const weekStart = addUtcWeeks(startOfUtcWeek(trendStart), index);
      const isoDate = toIsoDate(weekStart);
      const inquiryTrend = inquiryTrendMap.get(isoDate);

      return {
        label: trendLabelFormatter.format(weekStart),
        weekStart: isoDate,
        inquiries: inquiryTrend?.inquiries ?? 0,
        won: inquiryTrend?.won ?? 0,
        lost: inquiryTrend?.lost ?? 0,
        acceptedQuotes: quoteTrendMap.get(isoDate) ?? 0,
      };
    },
  );

  let activityStartYear: number | null = null;
  const activityMap: Record<string, { inquiries: number; quotes: number }> = {};
  
  for (const row of inquiryActivityRows) {
    if (!activityMap[row.date]) {
      activityMap[row.date] = { inquiries: 0, quotes: 0 };
    }
    activityMap[row.date].inquiries += Number(row.count);

    const match = row.date.match(/^(\d{4})/);
    if (match) {
      const parsedYear = parseInt(match[1] ?? "", 10);
      if (!Number.isNaN(parsedYear)) {
          if (activityStartYear === null || parsedYear < activityStartYear) {
             activityStartYear = parsedYear;
          }
      }
    }
  }

  for (const row of quoteActivityRows) {
    if (!activityMap[row.date]) {
      activityMap[row.date] = { inquiries: 0, quotes: 0 };
    }
    activityMap[row.date].quotes += Number(row.count);

    const match = row.date.match(/^(\d{4})/);
    if (match) {
      const parsedYear = parseInt(match[1] ?? "", 10);
      if (!Number.isNaN(parsedYear)) {
          if (activityStartYear === null || parsedYear < activityStartYear) {
             activityStartYear = parsedYear;
          }
      }
    }
  }

  const currentYear = now.getUTCFullYear();
  const startYear = activityStartYear ?? currentYear;

  const activityGraph = {
    startYear: startYear > currentYear ? currentYear : startYear,
    currentYear,
    activityMap,
  };

  return {
    totalInquiries,
    inquiriesThisWeek: Number(thisWeekRows[0]?.count ?? 0),
    wonCount,
    lostCount,
    inquiryStatusCounts,
    quoteSummary,
    recentTrend,
    activityGraph,
  };
}

// ---------------------------------------------------------------------------
// Conversion analytics
// ---------------------------------------------------------------------------

export async function getConversionAnalyticsData(
  businessId: string,
): Promise<ConversionAnalyticsData> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessAnalyticsCacheTags(businessId));

  const now = new Date();
  const trendStart = addUtcWeeks(startOfUtcWeek(now), -5);
  const trendStartIso = trendStart.toISOString();
  const quoteActivityTimestamp = sql`coalesce(${quotes.acceptedAt}, ${quotes.sentAt}, ${quotes.createdAt})`;
  const quoteActivityWeek = sql`date_trunc('week', ${quoteActivityTimestamp})`;

  const [funnelRows, valueSummaryRows, statusTrendRows] = await Promise.all([
    // Funnel rates
    db
      .select({
        totalInquiries: sql<number>`count(*)`,
        linkedInquiryCount: sql<number>`(
          select count(distinct ${quotes.inquiryId})
          from ${quotes}
          where ${quotes.businessId} = ${businessId}
            and ${quotes.inquiryId} is not null
        )`,
      })
      .from(inquiries)
      .where(eq(inquiries.businessId, businessId)),

    // Value summary by status
    db
      .select({
        sentQuotes: sql<number>`count(*) filter (where ${quotes.status} in ('sent', 'accepted', 'rejected', 'expired'))`,
        acceptedQuotes: sql<number>`count(*) filter (where ${quotes.status} = 'accepted')`,
        acceptedValueInCents: sql<number>`coalesce(sum(${quotes.totalInCents}) filter (where ${quotes.status} = 'accepted'), 0)`,
        pendingValueInCents: sql<number>`coalesce(sum(${quotes.totalInCents}) filter (where ${quotes.status} = 'sent'), 0)`,
        rejectedValueInCents: sql<number>`coalesce(sum(${quotes.totalInCents}) filter (where ${quotes.status} = 'rejected'), 0)`,
        avgAcceptedValueInCents: sql<number>`coalesce(avg(${quotes.totalInCents}) filter (where ${quotes.status} = 'accepted'), 0)`,
      })
      .from(quotes)
      .where(eq(quotes.businessId, businessId)),

    // Quotes-by-status weekly trend
    db
      .select({
        weekStart: sql<string>`to_char(${quoteActivityWeek}, 'YYYY-MM-DD')`,
        sent: sql<number>`count(*) filter (where ${quotes.status} = 'sent')`,
        accepted: sql<number>`count(*) filter (where ${quotes.status} = 'accepted')`,
        rejected: sql<number>`count(*) filter (where ${quotes.status} = 'rejected')`,
        expired: sql<number>`count(*) filter (where ${quotes.status} = 'expired')`,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          sql`${quoteActivityTimestamp} >= ${trendStartIso}::timestamptz`,
        ),
      )
      .groupBy(quoteActivityWeek)
      .orderBy(quoteActivityWeek),
  ]);

  const totalInquiries = Number(funnelRows[0]?.totalInquiries ?? 0);
  const linkedInquiryCount = Number(funnelRows[0]?.linkedInquiryCount ?? 0);
  const sentQuotes = Number(valueSummaryRows[0]?.sentQuotes ?? 0);
  const acceptedQuotes = Number(valueSummaryRows[0]?.acceptedQuotes ?? 0);

  const statusTrendMap = new Map(
    statusTrendRows.map((row) => [
      row.weekStart,
      {
        sent: Number(row.sent),
        accepted: Number(row.accepted),
        rejected: Number(row.rejected),
        expired: Number(row.expired),
      },
    ]),
  );

  const quotesStatusTrend: ConversionTrendPoint[] = Array.from({ length: 6 }).map(
    (_, index) => {
      const weekStart = addUtcWeeks(startOfUtcWeek(trendStart), index);
      const isoDate = toIsoDate(weekStart);
      const bucket = statusTrendMap.get(isoDate);

      return {
        label: trendLabelFormatter.format(weekStart),
        weekStart: isoDate,
        sent: bucket?.sent ?? 0,
        accepted: bucket?.accepted ?? 0,
        rejected: bucket?.rejected ?? 0,
        expired: bucket?.expired ?? 0,
      };
    },
  );

  return {
    inquiryToQuoteRate: totalInquiries ? linkedInquiryCount / totalInquiries : 0,
    quoteToAcceptanceRate: sentQuotes ? acceptedQuotes / sentQuotes : 0,
    acceptedValueInCents: Number(valueSummaryRows[0]?.acceptedValueInCents ?? 0),
    pendingValueInCents: Number(valueSummaryRows[0]?.pendingValueInCents ?? 0),
    rejectedValueInCents: Number(valueSummaryRows[0]?.rejectedValueInCents ?? 0),
    averageAcceptedValueInCents: Math.round(
      Number(valueSummaryRows[0]?.avgAcceptedValueInCents ?? 0),
    ),
    quotesStatusTrend,
  };
}

// ---------------------------------------------------------------------------
// Workflow analytics
// ---------------------------------------------------------------------------

export async function getWorkflowAnalyticsData(
  businessId: string,
): Promise<WorkflowAnalyticsData> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessAnalyticsCacheTags(businessId));

  const staleCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const pendingCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [timingRows, staleRows, pendingRows] = await Promise.all([
    // Average durations
    db
      .select({
        avgTimeToQuoteHours: sql<number | null>`(
          select avg(extract(epoch from (q."created_at" - i."submitted_at")) / 3600)
          from ${quotes} q
          inner join ${inquiries} i on i."id" = q."inquiry_id"
          where q."business_id" = ${businessId}
            and q."inquiry_id" is not null
        )`,
        avgSentToDecisionHours: sql<number | null>`(
          select avg(extract(epoch from (q."customer_responded_at" - q."sent_at")) / 3600)
          from ${quotes} q
          where q."business_id" = ${businessId}
            and q."customer_responded_at" is not null
            and q."sent_at" is not null
        )`,
      })
      .from(inquiries)
      .where(eq(inquiries.businessId, businessId)),

    // Stale inquiries (no response > 48h)
    db
      .select({ count: count() })
      .from(inquiries)
      .where(
        and(
          eq(inquiries.businessId, businessId),
          sql`${inquiries.status} in ('new', 'waiting')`,
          lt(inquiries.submittedAt, staleCutoff),
          isNull(inquiries.lastRespondedAt),
        ),
      ),

    // Pending quotes > 7 days
    db
      .select({ count: count() })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          eq(quotes.status, "sent"),
          isNotNull(quotes.sentAt),
          lte(quotes.sentAt, pendingCutoff),
          isNull(quotes.customerRespondedAt),
        ),
      ),
  ]);

  const rawToQuote = timingRows[0]?.avgTimeToQuoteHours;
  const rawToDecision = timingRows[0]?.avgSentToDecisionHours;

  return {
    avgTimeToQuoteHours:
      rawToQuote !== null && rawToQuote !== undefined
        ? Math.round(Number(rawToQuote) * 10) / 10
        : null,
    avgTimeSentToDecisionHours:
      rawToDecision !== null && rawToDecision !== undefined
        ? Math.round(Number(rawToDecision) * 10) / 10
        : null,
    staleInquiryCount: Number(staleRows[0]?.count ?? 0),
    pendingQuotesOverSevenDays: Number(pendingRows[0]?.count ?? 0),
  };
}

