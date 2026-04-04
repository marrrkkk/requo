import "server-only";

import { and, count, eq, gte, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import type {
  WorkspaceAnalyticsData,
  WorkspaceAnalyticsStatusCount,
  WorkspaceAnalyticsTrendPoint,
} from "@/features/analytics/types";
import { inquiryStatuses } from "@/features/inquiries/types";
import {
  getWorkspaceAnalyticsCacheTags,
  hotWorkspaceCacheLife,
} from "@/lib/cache/workspace-tags";
import { db } from "@/lib/db/client";
import { inquiries, quotes } from "@/lib/db/schema";

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

export async function getWorkspaceAnalyticsData(
  workspaceId: string,
): Promise<WorkspaceAnalyticsData> {
  "use cache";

  cacheLife(hotWorkspaceCacheLife);
  cacheTag(...getWorkspaceAnalyticsCacheTags(workspaceId));

  const now = new Date();
  const trendStart = addUtcWeeks(startOfUtcWeek(now), -5);
  const trendStartIso = trendStart.toISOString();
  const thisWeekStart = new Date(now);
  thisWeekStart.setUTCDate(thisWeekStart.getUTCDate() - 6);
  thisWeekStart.setUTCHours(0, 0, 0, 0);
  const quoteActivityTimestamp = sql`coalesce(${quotes.acceptedAt}, ${quotes.sentAt}, ${quotes.createdAt})`;
  const quoteActivityWeek = sql`date_trunc('week', ${quoteActivityTimestamp})`;

  const [statusRows, thisWeekRows, quoteSummaryRows, inquiryTrendRows, quoteTrendRows] =
    await Promise.all([
      db
        .select({
          status: inquiries.status,
          count: count(),
        })
        .from(inquiries)
        .where(eq(inquiries.workspaceId, workspaceId))
        .groupBy(inquiries.status),
      db
        .select({
          count: count(),
        })
        .from(inquiries)
        .where(
          and(
            eq(inquiries.workspaceId, workspaceId),
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
        })
        .from(quotes)
        .where(eq(quotes.workspaceId, workspaceId)),
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
            eq(inquiries.workspaceId, workspaceId),
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
            eq(quotes.workspaceId, workspaceId),
            sql`${quoteActivityTimestamp} >= ${trendStartIso}::timestamptz`,
          ),
        )
        .groupBy(quoteActivityWeek)
        .orderBy(quoteActivityWeek),
    ]);

  const inquiryStatusCountsMap = toCountMap(
    statusRows as Array<{
      status: (typeof inquiryStatuses)[number];
      count: number | string;
    }>,
  );
  const inquiryStatusCounts: WorkspaceAnalyticsStatusCount[] = inquiryStatuses.map(
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

  const recentTrend: WorkspaceAnalyticsTrendPoint[] = Array.from({ length: 6 }).map(
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

  return {
    totalInquiries,
    inquiriesThisWeek: Number(thisWeekRows[0]?.count ?? 0),
    wonCount,
    lostCount,
    inquiryStatusCounts,
    quoteSummary,
    recentTrend,
  };
}
