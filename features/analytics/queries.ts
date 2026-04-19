import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lt,
  lte,
  sql,
} from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import type {
  BusinessAnalyticsData,
  BusinessAnalyticsStatusCount,
  BusinessAnalyticsTrendPoint,
  ConversionAnalyticsData,
  ConversionTrendPoint,
  FormPerformanceAnalyticsRow,
  WorkflowAnalyticsData,
} from "@/features/analytics/types";
import { formatAnalyticsWeekRangeLabel } from "@/features/analytics/utils";
import { inquiryFilterableStatuses } from "@/features/inquiries/types";
import { quoteStatuses } from "@/features/quotes/types";
import {
  getEffectiveInquiryStatus,
  getNonDeletedInquiryCondition,
  getOperationalInquiryCondition,
} from "@/features/inquiries/queries";
import {
  getNonDeletedQuoteCondition,
  getOperationalQuoteCondition,
  getEffectiveQuoteStatus,
} from "@/features/quotes/queries";
import {
  getBusinessAnalyticsCacheTags,
  hotBusinessCacheLife,
} from "@/lib/cache/business-tags";
import { db } from "@/lib/db/client";
import {
  activityLogs,
  analyticsEvents,
  businessInquiryForms,
  inquiries,
  quotes,
} from "@/lib/db/schema";

const summaryWindowDays = 30;
const trendWeekCount = 12;

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

function subtractDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() - days);
  return next;
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function roundHours(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return Math.round(Number(value) * 10) / 10;
}

function toCountMap(
  rows: Array<{
    status: (typeof inquiryFilterableStatuses)[number];
    count: number | string;
  }>,
) {
  const map = new Map<(typeof inquiryFilterableStatuses)[number], number>();

  for (const status of inquiryFilterableStatuses) {
    map.set(status, 0);
  }

  for (const row of rows) {
    map.set(row.status, Number(row.count));
  }

  return map;
}

function buildFirstResponseSubquery(businessId: string) {
  return db
    .select({
      inquiryId: activityLogs.inquiryId,
      firstResponseAt: sql<Date>`min(${activityLogs.createdAt})`.as(
        "first_response_at",
      ),
    })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.businessId, businessId),
        isNotNull(activityLogs.inquiryId),
        isNotNull(activityLogs.actorUserId),
      ),
    )
    .groupBy(activityLogs.inquiryId)
    .as("first_response_by_inquiry");
}

function buildFirstQuoteSubquery(businessId: string) {
  return db
    .select({
      inquiryId: quotes.inquiryId,
      firstQuoteAt: sql<Date>`min(${quotes.createdAt})`.as("first_quote_at"),
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.businessId, businessId),
        isNotNull(quotes.inquiryId),
        getNonDeletedQuoteCondition(),
      ),
    )
    .groupBy(quotes.inquiryId)
    .as("first_quote_by_inquiry");
}

function buildDedupedInquiryFormViewEventsSubquery(
  businessId: string,
  occurredAtGte?: Date,
) {
  return db
    .select({
      businessInquiryFormId: analyticsEvents.businessInquiryFormId,
      visitorHash: analyticsEvents.visitorHash,
      occurredAt: sql<Date>`min(${analyticsEvents.occurredAt})`.as("occurred_at"),
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.businessId, businessId),
        eq(analyticsEvents.eventType, "inquiry_form_viewed"),
        isNotNull(analyticsEvents.businessInquiryFormId),
        occurredAtGte ? gte(analyticsEvents.occurredAt, occurredAtGte) : undefined,
      ),
    )
    .groupBy(
      analyticsEvents.businessInquiryFormId,
      analyticsEvents.visitorHash,
      sql`date_trunc('second', ${analyticsEvents.occurredAt})`,
    )
    .as("deduped_inquiry_form_views");
}

function buildDedupedQuoteViewEventsSubquery(
  businessId: string,
  occurredAtGte?: Date,
) {
  return db
    .select({
      quoteId: analyticsEvents.quoteId,
      visitorHash: analyticsEvents.visitorHash,
      occurredAt: sql<Date>`min(${analyticsEvents.occurredAt})`.as("occurred_at"),
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.businessId, businessId),
        eq(analyticsEvents.eventType, "quote_public_viewed"),
        isNotNull(analyticsEvents.quoteId),
        occurredAtGte ? gte(analyticsEvents.occurredAt, occurredAtGte) : undefined,
      ),
    )
    .groupBy(
      analyticsEvents.quoteId,
      analyticsEvents.visitorHash,
      sql`date_trunc('second', ${analyticsEvents.occurredAt})`,
    )
    .as("deduped_quote_public_views");
}

function buildOverviewTrendPoints(
  trendStart: Date,
  formViewTrendRows: Array<{ weekStart: string; formViews: number }>,
  inquiryTrendRows: Array<{ weekStart: string; inquirySubmissions: number }>,
  quoteSentTrendRows: Array<{ weekStart: string; quotesSent: number }>,
  acceptedQuoteTrendRows: Array<{ weekStart: string; acceptedQuotes: number }>,
): BusinessAnalyticsTrendPoint[] {
  const formViewMap = new Map(
    formViewTrendRows.map((row) => [row.weekStart, Number(row.formViews)]),
  );
  const inquiryMap = new Map(
    inquiryTrendRows.map((row) => [
      row.weekStart,
      Number(row.inquirySubmissions),
    ]),
  );
  const quoteSentMap = new Map(
    quoteSentTrendRows.map((row) => [row.weekStart, Number(row.quotesSent)]),
  );
  const acceptedMap = new Map(
    acceptedQuoteTrendRows.map((row) => [
      row.weekStart,
      Number(row.acceptedQuotes),
    ]),
  );

  return Array.from({ length: trendWeekCount }).map((_, index) => {
    const weekStart = addUtcWeeks(startOfUtcWeek(trendStart), index);
    const isoDate = toIsoDate(weekStart);

    return {
      label: formatAnalyticsWeekRangeLabel(weekStart),
      weekStart: isoDate,
      formViews: formViewMap.get(isoDate) ?? 0,
      inquirySubmissions: inquiryMap.get(isoDate) ?? 0,
      quotesSent: quoteSentMap.get(isoDate) ?? 0,
      acceptedQuotes: acceptedMap.get(isoDate) ?? 0,
    };
  });
}

function buildConversionTrendPoints(
  trendStart: Date,
  sentRows: Array<{ weekStart: string; quotesSent: number }>,
  viewRows: Array<{ weekStart: string; quoteViews: number }>,
  acceptedRows: Array<{ weekStart: string; acceptedQuotes: number }>,
  rejectedRows: Array<{ weekStart: string; rejectedQuotes: number }>,
): ConversionTrendPoint[] {
  const sentMap = new Map(
    sentRows.map((row) => [row.weekStart, Number(row.quotesSent)]),
  );
  const viewMap = new Map(
    viewRows.map((row) => [row.weekStart, Number(row.quoteViews)]),
  );
  const acceptedMap = new Map(
    acceptedRows.map((row) => [row.weekStart, Number(row.acceptedQuotes)]),
  );
  const rejectedMap = new Map(
    rejectedRows.map((row) => [row.weekStart, Number(row.rejectedQuotes)]),
  );

  return Array.from({ length: trendWeekCount }).map((_, index) => {
    const weekStart = addUtcWeeks(startOfUtcWeek(trendStart), index);
    const isoDate = toIsoDate(weekStart);

    return {
      label: formatAnalyticsWeekRangeLabel(weekStart),
      weekStart: isoDate,
      quotesSent: sentMap.get(isoDate) ?? 0,
      quoteViews: viewMap.get(isoDate) ?? 0,
      acceptedQuotes: acceptedMap.get(isoDate) ?? 0,
      rejectedQuotes: rejectedMap.get(isoDate) ?? 0,
    };
  });
}

export async function getBusinessAnalyticsData(
  businessId: string,
): Promise<BusinessAnalyticsData> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessAnalyticsCacheTags(businessId));

  const now = new Date();
  const summaryStart = subtractDays(now, summaryWindowDays);
  const trendStart = addUtcWeeks(startOfUtcWeek(now), -(trendWeekCount - 1));
  const staleCutoff = subtractDays(now, 2);
  const pendingCutoff = subtractDays(now, 7);
  const firstResponse = buildFirstResponseSubquery(businessId);
  const firstQuote = buildFirstQuoteSubquery(businessId);
  const formViewsInSummary = buildDedupedInquiryFormViewEventsSubquery(
    businessId,
    summaryStart,
  );
  const formViewsInTrend = buildDedupedInquiryFormViewEventsSubquery(
    businessId,
    trendStart,
  );

  const [formViewSummaryRows, inquirySummaryRows, quoteSummaryRows] =
    await Promise.all([
    db
      .select({
        formViews: sql<number>`count(*)`,
        uniqueVisitors: sql<number>`count(distinct ${formViewsInSummary.visitorHash})`,
      })
      .from(formViewsInSummary),
    db
      .select({
        inquirySubmissions: sql<number>`count(distinct ${inquiries.id})`,
        respondedInquiries:
          sql<number>`count(distinct ${inquiries.id}) filter (where ${firstResponse.firstResponseAt} is not null)`,
        inquiriesWithQuote:
          sql<number>`count(distinct ${inquiries.id}) filter (where ${firstQuote.firstQuoteAt} is not null)`,
        avgTimeToFirstQuoteHours:
          sql<number | null>`avg(extract(epoch from (${firstQuote.firstQuoteAt} - ${inquiries.submittedAt})) / 3600) filter (where ${firstQuote.firstQuoteAt} is not null)`,
        avgFirstResponseHours:
          sql<number | null>`avg(extract(epoch from (${firstResponse.firstResponseAt} - ${inquiries.submittedAt})) / 3600) filter (where ${firstResponse.firstResponseAt} is not null)`,
      })
      .from(inquiries)
      .leftJoin(firstResponse, eq(firstResponse.inquiryId, inquiries.id))
      .leftJoin(firstQuote, eq(firstQuote.inquiryId, inquiries.id))
      .where(
        and(
          eq(inquiries.businessId, businessId),
          getNonDeletedInquiryCondition(),
          gte(inquiries.submittedAt, summaryStart),
        ),
      ),
    db
      .select({
        quotesSent:
          sql<number>`count(distinct ${quotes.id}) filter (where ${quotes.sentAt} is not null)`,
        quotesViewed:
          sql<number>`count(distinct ${quotes.id}) filter (where ${quotes.publicViewedAt} is not null)`,
        quotesAccepted:
          sql<number>`count(distinct ${quotes.id}) filter (where ${quotes.status} = 'accepted')`,
        quotesRejected:
          sql<number>`count(distinct ${quotes.id}) filter (where ${quotes.status} = 'rejected')`,
        avgTimeSentToDecisionHours:
          sql<number | null>`avg(extract(epoch from (${quotes.customerRespondedAt} - ${quotes.sentAt})) / 3600) filter (where ${quotes.customerRespondedAt} is not null and ${quotes.sentAt} is not null)`,
      })
      .from(quotes)
      .innerJoin(inquiries, eq(quotes.inquiryId, inquiries.id))
      .where(
        and(
          eq(quotes.businessId, businessId),
          getNonDeletedQuoteCondition(),
          eq(quotes.status, "accepted"),
          eq(inquiries.businessId, businessId),
          getNonDeletedInquiryCondition(),
          gte(inquiries.submittedAt, summaryStart),
        ),
      ),
  ]);

  const statusRows = await db
    .select({
      status: getEffectiveInquiryStatus,
      count: count(),
    })
    .from(inquiries)
    .where(and(eq(inquiries.businessId, businessId), getNonDeletedInquiryCondition()))
    .groupBy(getEffectiveInquiryStatus);

  const [formViewTrendRows, inquiryTrendRows] = await Promise.all([
    db
      .select({
        weekStart:
          sql<string>`to_char(date_trunc('week', ${formViewsInTrend.occurredAt}), 'YYYY-MM-DD')`,
        formViews: sql<number>`count(*)`,
      })
      .from(formViewsInTrend)
      .groupBy(sql`date_trunc('week', ${formViewsInTrend.occurredAt})`)
      .orderBy(sql`date_trunc('week', ${formViewsInTrend.occurredAt})`),
    db
      .select({
        weekStart:
          sql<string>`to_char(date_trunc('week', ${inquiries.submittedAt}), 'YYYY-MM-DD')`,
        inquirySubmissions: sql<number>`count(*)`,
      })
      .from(inquiries)
      .where(
        and(
          eq(inquiries.businessId, businessId),
          getNonDeletedInquiryCondition(),
          gte(inquiries.submittedAt, trendStart),
        ),
      )
      .groupBy(sql`date_trunc('week', ${inquiries.submittedAt})`)
      .orderBy(sql`date_trunc('week', ${inquiries.submittedAt})`),
  ]);

  const [quoteSentTrendRows, acceptedQuoteTrendRows] = await Promise.all([
    db
      .select({
        weekStart:
          sql<string>`to_char(date_trunc('week', ${quotes.sentAt}), 'YYYY-MM-DD')`,
        quotesSent: sql<number>`count(*)`,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          getNonDeletedQuoteCondition(),
          isNotNull(quotes.sentAt),
          gte(quotes.sentAt, trendStart),
        ),
      )
      .groupBy(sql`date_trunc('week', ${quotes.sentAt})`)
      .orderBy(sql`date_trunc('week', ${quotes.sentAt})`),
    db
      .select({
        weekStart:
          sql<string>`to_char(date_trunc('week', ${quotes.acceptedAt}), 'YYYY-MM-DD')`,
        acceptedQuotes: sql<number>`count(*)`,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          getNonDeletedQuoteCondition(),
          isNotNull(quotes.acceptedAt),
          gte(quotes.acceptedAt, trendStart),
        ),
      )
      .groupBy(sql`date_trunc('week', ${quotes.acceptedAt})`)
      .orderBy(sql`date_trunc('week', ${quotes.acceptedAt})`),
  ]);

  const [staleRows, pendingRows] = await Promise.all([
    db
      .select({ count: count() })
      .from(inquiries)
      .leftJoin(firstResponse, eq(firstResponse.inquiryId, inquiries.id))
      .where(
        and(
          eq(inquiries.businessId, businessId),
          getOperationalInquiryCondition(),
          sql`${getEffectiveInquiryStatus} in ('new', 'waiting')`,
          lt(inquiries.submittedAt, staleCutoff),
          isNull(firstResponse.firstResponseAt),
        ),
      ),
    db
      .select({ count: count() })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          getOperationalQuoteCondition(),
          eq(quotes.status, "sent"),
          isNotNull(quotes.sentAt),
          lte(quotes.sentAt, pendingCutoff),
          isNull(quotes.customerRespondedAt),
        ),
      ),
  ]);

  const inquirySummary = inquirySummaryRows[0];
  const quoteSummary = quoteSummaryRows[0];
  const formViews = Number(formViewSummaryRows[0]?.formViews ?? 0);
  const uniqueVisitors = Number(formViewSummaryRows[0]?.uniqueVisitors ?? 0);
  const inquirySubmissions = Number(inquirySummary?.inquirySubmissions ?? 0);
  const respondedInquiries = Number(inquirySummary?.respondedInquiries ?? 0);
  const inquiriesWithQuote = Number(inquirySummary?.inquiriesWithQuote ?? 0);
  const quotesSent = Number(quoteSummary?.quotesSent ?? 0);
  const quotesViewed = Number(quoteSummary?.quotesViewed ?? 0);
  const quotesAccepted = Number(quoteSummary?.quotesAccepted ?? 0);
  const quotesRejected = Number(quoteSummary?.quotesRejected ?? 0);
  const avgFirstResponseHours = roundHours(inquirySummary?.avgFirstResponseHours);
  const avgTimeToFirstQuoteHours = roundHours(
    inquirySummary?.avgTimeToFirstQuoteHours,
  );
  const avgTimeSentToDecisionHours = roundHours(quoteSummary?.avgTimeSentToDecisionHours);

  const inquiryStatusCountsMap = toCountMap(
    statusRows as Array<{
      status: (typeof inquiryFilterableStatuses)[number];
      count: number | string;
    }>,
  );
  const inquiryStatusCounts: BusinessAnalyticsStatusCount[] =
    inquiryFilterableStatuses.map((status) => ({
      status,
      count: inquiryStatusCountsMap.get(status) ?? 0,
    }));

  return {
    summary: {
      formViews,
      uniqueVisitors,
      inquirySubmissions,
      inquiriesWithQuote,
      formConversionRate: uniqueVisitors ? inquirySubmissions / uniqueVisitors : 0,
      inquiryToQuoteRate: inquirySubmissions
        ? inquiriesWithQuote / inquirySubmissions
        : 0,
      quotesSent,
      quotesViewed,
      quotesAccepted,
      quotesRejected,
      quoteAcceptanceRate: quotesSent ? quotesAccepted / quotesSent : 0,
      responseRate: inquirySubmissions ? respondedInquiries / inquirySubmissions : 0,
      avgFirstResponseHours,
      avgTimeToFirstQuoteHours,
      avgTimeSentToDecisionHours,
    },
    funnel: {
      uniqueVisitors,
      inquirySubmissions,
      inquiriesWithQuote,
      acceptedQuotes: quotesAccepted,
    },
    inquiryStatusCounts,
    recentTrend: buildOverviewTrendPoints(
      trendStart,
      formViewTrendRows,
      inquiryTrendRows,
      quoteSentTrendRows,
      acceptedQuoteTrendRows,
    ),
    backlog: {
      staleInquiryCount: Number(staleRows[0]?.count ?? 0),
      pendingQuotesOverSevenDays: Number(pendingRows[0]?.count ?? 0),
    },
  };
}

export async function getConversionAnalyticsData(
  businessId: string,
): Promise<ConversionAnalyticsData> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessAnalyticsCacheTags(businessId));

  const now = new Date();
  const summaryStart = subtractDays(now, summaryWindowDays);
  const trendStart = addUtcWeeks(startOfUtcWeek(now), -(trendWeekCount - 1));
  const firstQuote = buildFirstQuoteSubquery(businessId);
  const formViewsInSummary = buildDedupedInquiryFormViewEventsSubquery(
    businessId,
    summaryStart,
  );
  const quoteViewsInSummary = buildDedupedQuoteViewEventsSubquery(
    businessId,
    summaryStart,
  );
  const quoteViewsInTrend = buildDedupedQuoteViewEventsSubquery(
    businessId,
    trendStart,
  );

  const formViewStats = db
    .select({
      businessInquiryFormId: formViewsInSummary.businessInquiryFormId,
      viewCount: sql<number>`count(*)`.as("view_count"),
      uniqueVisitorCount:
        sql<number>`count(distinct ${formViewsInSummary.visitorHash})`.as(
          "unique_visitor_count",
        ),
    })
    .from(formViewsInSummary)
    .groupBy(formViewsInSummary.businessInquiryFormId)
    .as("form_view_stats");

  const formPipelineStats = db
    .select({
      businessInquiryFormId: inquiries.businessInquiryFormId,
      submissionCount:
        sql<number>`count(distinct ${inquiries.id})`.as("submission_count"),
      inquiriesWithQuoteCount:
        sql<number>`count(distinct ${inquiries.id}) filter (where ${firstQuote.firstQuoteAt} is not null)`.as(
          "inquiries_with_quote_count",
        ),
      sentQuoteCount:
        sql<number>`count(distinct ${quotes.id}) filter (where ${quotes.sentAt} is not null)`.as(
          "sent_quote_count",
        ),
      acceptedQuoteCount:
        sql<number>`count(distinct ${quotes.id}) filter (where ${quotes.status} = 'accepted')`.as(
          "accepted_quote_count",
        ),
    })
    .from(inquiries)
    .leftJoin(firstQuote, eq(firstQuote.inquiryId, inquiries.id))
    .leftJoin(
      quotes,
      and(
        eq(quotes.businessId, businessId),
        eq(quotes.inquiryId, inquiries.id),
        getNonDeletedQuoteCondition(),
      ),
    )
    .where(
      and(
        eq(inquiries.businessId, businessId),
        getNonDeletedInquiryCondition(),
        gte(inquiries.submittedAt, summaryStart),
      ),
    )
    .groupBy(inquiries.businessInquiryFormId)
    .as("form_pipeline_stats");

  const [summaryRows, quoteViewRows] = await Promise.all([
    db
      .select({
        inquirySubmissions: sql<number>`count(distinct ${inquiries.id})`,
        inquiriesWithQuote:
          sql<number>`count(distinct ${inquiries.id}) filter (where ${firstQuote.firstQuoteAt} is not null)`,
        quotesSent:
          sql<number>`count(distinct ${quotes.id}) filter (where ${quotes.sentAt} is not null)`,
        quotesViewed:
          sql<number>`count(distinct ${quotes.id}) filter (where ${quotes.publicViewedAt} is not null)`,
        quotesAccepted:
          sql<number>`count(distinct ${quotes.id}) filter (where ${quotes.status} = 'accepted')`,
        quotesRejected:
          sql<number>`count(distinct ${quotes.id}) filter (where ${quotes.status} = 'rejected')`,
        acceptedValueInCents:
          sql<number>`coalesce(sum(${quotes.totalInCents}) filter (where ${quotes.status} = 'accepted'), 0)`,
        avgAcceptedValueInCents:
          sql<number>`coalesce(avg(${quotes.totalInCents}) filter (where ${quotes.status} = 'accepted'), 0)`,
      })
      .from(inquiries)
      .leftJoin(firstQuote, eq(firstQuote.inquiryId, inquiries.id))
      .leftJoin(
        quotes,
        and(
          eq(quotes.businessId, businessId),
          eq(quotes.inquiryId, inquiries.id),
          getNonDeletedQuoteCondition(),
        ),
      )
      .where(
        and(
          eq(inquiries.businessId, businessId),
          getNonDeletedInquiryCondition(),
          gte(inquiries.submittedAt, summaryStart),
        ),
      ),
    db
      .select({
        quotePageViews: sql<number>`count(*)`,
      })
      .from(quoteViewsInSummary),
  ]);

  const [sentTrendRows, quoteViewTrendRows] = await Promise.all([
    db
      .select({
        weekStart:
          sql<string>`to_char(date_trunc('week', ${quotes.sentAt}), 'YYYY-MM-DD')`,
        quotesSent: sql<number>`count(*)`,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          getNonDeletedQuoteCondition(),
          isNotNull(quotes.sentAt),
          gte(quotes.sentAt, trendStart),
        ),
      )
      .groupBy(sql`date_trunc('week', ${quotes.sentAt})`)
      .orderBy(sql`date_trunc('week', ${quotes.sentAt})`),
    db
      .select({
        weekStart:
          sql<string>`to_char(date_trunc('week', ${quoteViewsInTrend.occurredAt}), 'YYYY-MM-DD')`,
        quoteViews: sql<number>`count(*)`,
      })
      .from(quoteViewsInTrend)
      .groupBy(sql`date_trunc('week', ${quoteViewsInTrend.occurredAt})`)
      .orderBy(sql`date_trunc('week', ${quoteViewsInTrend.occurredAt})`),
  ]);

  const [acceptedTrendRows, rejectedTrendRows] = await Promise.all([
    db
      .select({
        weekStart:
          sql<string>`to_char(date_trunc('week', ${quotes.acceptedAt}), 'YYYY-MM-DD')`,
        acceptedQuotes: sql<number>`count(*)`,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          getNonDeletedQuoteCondition(),
          isNotNull(quotes.acceptedAt),
          gte(quotes.acceptedAt, trendStart),
        ),
      )
      .groupBy(sql`date_trunc('week', ${quotes.acceptedAt})`)
      .orderBy(sql`date_trunc('week', ${quotes.acceptedAt})`),
    db
      .select({
        weekStart:
          sql<string>`to_char(date_trunc('week', ${quotes.customerRespondedAt}), 'YYYY-MM-DD')`,
        rejectedQuotes: sql<number>`count(*)`,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          getNonDeletedQuoteCondition(),
          eq(quotes.status, "rejected"),
          isNotNull(quotes.customerRespondedAt),
          gte(quotes.customerRespondedAt, trendStart),
        ),
      )
      .groupBy(sql`date_trunc('week', ${quotes.customerRespondedAt})`)
      .orderBy(sql`date_trunc('week', ${quotes.customerRespondedAt})`),
  ]);

  const formRows = await db
    .select({
      formId: businessInquiryForms.id,
      formName: businessInquiryForms.name,
      formSlug: businessInquiryForms.slug,
      isDefault: businessInquiryForms.isDefault,
      publicInquiryEnabled: businessInquiryForms.publicInquiryEnabled,
      archivedAt: businessInquiryForms.archivedAt,
      viewCount: sql<number>`coalesce(${formViewStats.viewCount}, 0)`,
      uniqueVisitorCount:
        sql<number>`coalesce(${formViewStats.uniqueVisitorCount}, 0)`,
      submissionCount:
        sql<number>`coalesce(${formPipelineStats.submissionCount}, 0)`,
      inquiriesWithQuoteCount:
        sql<number>`coalesce(${formPipelineStats.inquiriesWithQuoteCount}, 0)`,
      sentQuoteCount:
        sql<number>`coalesce(${formPipelineStats.sentQuoteCount}, 0)`,
      acceptedQuoteCount:
        sql<number>`coalesce(${formPipelineStats.acceptedQuoteCount}, 0)`,
    })
    .from(businessInquiryForms)
    .leftJoin(
      formViewStats,
      eq(formViewStats.businessInquiryFormId, businessInquiryForms.id),
    )
    .leftJoin(
      formPipelineStats,
      eq(formPipelineStats.businessInquiryFormId, businessInquiryForms.id),
    )
    .where(eq(businessInquiryForms.businessId, businessId))
    .orderBy(
      asc(businessInquiryForms.archivedAt),
      sql`coalesce(${formPipelineStats.submissionCount}, 0) desc`,
      sql`coalesce(${formViewStats.viewCount}, 0) desc`,
      desc(businessInquiryForms.isDefault),
      asc(businessInquiryForms.name),
    );

  const summary = summaryRows[0];
  const inquirySubmissions = Number(summary?.inquirySubmissions ?? 0);
  const inquiriesWithQuote = Number(summary?.inquiriesWithQuote ?? 0);
  const quotesSent = Number(summary?.quotesSent ?? 0);
  const quotesViewed = Number(summary?.quotesViewed ?? 0);
  const quotesAccepted = Number(summary?.quotesAccepted ?? 0);
  const quotesRejected = Number(summary?.quotesRejected ?? 0);
  const quotePageViews = Number(quoteViewRows[0]?.quotePageViews ?? 0);

  const formPerformance: FormPerformanceAnalyticsRow[] = formRows.map((row) => {
    const submissionCount = Number(row.submissionCount);
    const sentQuoteCount = Number(row.sentQuoteCount);
    const viewCount = Number(row.viewCount);
    const uniqueVisitorCount = Number(row.uniqueVisitorCount);
    const inquiriesWithQuoteCount = Number(row.inquiriesWithQuoteCount);
    const acceptedQuoteCount = Number(row.acceptedQuoteCount);

    return {
      formId: row.formId,
      formName: row.formName,
      formSlug: row.formSlug,
      isDefault: row.isDefault,
      publicInquiryEnabled: row.publicInquiryEnabled,
      archivedAt: row.archivedAt,
      viewCount,
      uniqueVisitorCount,
      submissionCount,
      inquiriesWithQuoteCount,
      sentQuoteCount,
      acceptedQuoteCount,
      formConversionRate: uniqueVisitorCount ? submissionCount / uniqueVisitorCount : 0,
      inquiryToQuoteRate: submissionCount ? inquiriesWithQuoteCount / submissionCount : 0,
      quoteAcceptanceRate: sentQuoteCount ? acceptedQuoteCount / sentQuoteCount : 0,
    };
  });

  return {
    summary: {
      inquirySubmissions,
      inquiriesWithQuote,
      quotesSent,
      quotesViewed,
      quotePageViews,
      quotesAccepted,
      quotesRejected,
      inquiryToQuoteRate: inquirySubmissions
        ? inquiriesWithQuote / inquirySubmissions
        : 0,
      quoteViewRate: quotesSent ? quotesViewed / quotesSent : 0,
      quoteAcceptanceRate: quotesSent ? quotesAccepted / quotesSent : 0,
      acceptedValueInCents: Number(summary?.acceptedValueInCents ?? 0),
      averageAcceptedValueInCents: Math.round(
        Number(summary?.avgAcceptedValueInCents ?? 0),
      ),
    },
    funnel: {
      inquirySubmissions,
      inquiriesWithQuote,
      quotesSent,
      quotesViewed,
      quotesAccepted,
    },
    quotesTrend: buildConversionTrendPoints(
      trendStart,
      sentTrendRows,
      quoteViewTrendRows,
      acceptedTrendRows,
      rejectedTrendRows,
    ),
    formPerformance,
  };
}

export async function getWorkflowAnalyticsData(
  businessId: string,
): Promise<WorkflowAnalyticsData> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessAnalyticsCacheTags(businessId));

  const now = new Date();
  const summaryStart = subtractDays(now, summaryWindowDays);
  const staleCutoff = subtractDays(now, 2);
  const pendingCutoff = subtractDays(now, 7);
  const firstResponse = buildFirstResponseSubquery(businessId);
  const firstQuote = buildFirstQuoteSubquery(businessId);

  const [inquiryTimingRows, quoteTimingRows, quoteStatusRows] = await Promise.all([
    db
      .select({
        inquirySubmissions: sql<number>`count(distinct ${inquiries.id})`,
        respondedInquiries:
          sql<number>`count(distinct ${inquiries.id}) filter (where ${firstResponse.firstResponseAt} is not null)`,
        inquiriesWithQuote:
          sql<number>`count(distinct ${inquiries.id}) filter (where ${firstQuote.firstQuoteAt} is not null)`,
        avgFirstResponseHours:
          sql<number | null>`avg(extract(epoch from (${firstResponse.firstResponseAt} - ${inquiries.submittedAt})) / 3600) filter (where ${firstResponse.firstResponseAt} is not null)`,
        avgTimeToFirstQuoteHours:
          sql<number | null>`avg(extract(epoch from (${firstQuote.firstQuoteAt} - ${inquiries.submittedAt})) / 3600) filter (where ${firstQuote.firstQuoteAt} is not null)`,
      })
      .from(inquiries)
      .leftJoin(firstResponse, eq(firstResponse.inquiryId, inquiries.id))
      .leftJoin(firstQuote, eq(firstQuote.inquiryId, inquiries.id))
      .where(
        and(
          eq(inquiries.businessId, businessId),
          getNonDeletedInquiryCondition(),
          gte(inquiries.submittedAt, summaryStart),
        ),
      ),
    db
      .select({
        quotesSent:
          sql<number>`count(*) filter (where ${quotes.sentAt} is not null)`,
        quotesViewed:
          sql<number>`count(*) filter (where ${quotes.publicViewedAt} is not null)`,
        quotesAccepted:
          sql<number>`count(*) filter (where ${quotes.status} = 'accepted')`,
        quotesRejected:
          sql<number>`count(*) filter (where ${quotes.status} = 'rejected')`,
        quotesVoided:
          sql<number>`count(*) filter (where ${quotes.status} = 'voided')`,
        avgTimeSentToDecisionHours:
          sql<number | null>`avg(extract(epoch from (${quotes.customerRespondedAt} - ${quotes.sentAt})) / 3600) filter (where ${quotes.customerRespondedAt} is not null and ${quotes.sentAt} is not null)`,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          getNonDeletedQuoteCondition(),
          isNotNull(quotes.sentAt),
          gte(quotes.sentAt, summaryStart),
        ),
      ),
    db
      .select({
        status: getEffectiveQuoteStatus,
        count: count(),
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          getNonDeletedQuoteCondition(),
        ),
      )
      .groupBy(getEffectiveQuoteStatus),
  ]);

  const [staleRows, pendingRows] = await Promise.all([
    db
      .select({ count: count() })
      .from(inquiries)
      .leftJoin(firstResponse, eq(firstResponse.inquiryId, inquiries.id))
      .where(
        and(
          eq(inquiries.businessId, businessId),
          getOperationalInquiryCondition(),
          sql`${getEffectiveInquiryStatus} in ('new', 'waiting')`,
          lt(inquiries.submittedAt, staleCutoff),
          isNull(firstResponse.firstResponseAt),
        ),
      ),
    db
      .select({ count: count() })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          getOperationalQuoteCondition(),
          eq(quotes.status, "sent"),
          isNotNull(quotes.sentAt),
          lte(quotes.sentAt, pendingCutoff),
          isNull(quotes.customerRespondedAt),
        ),
      ),
  ]);

  const inquiryTiming = inquiryTimingRows[0];
  const quoteTiming = quoteTimingRows[0];
  const inquirySubmissions = Number(inquiryTiming?.inquirySubmissions ?? 0);
  const respondedInquiries = Number(inquiryTiming?.respondedInquiries ?? 0);
  const inquiriesWithQuote = Number(inquiryTiming?.inquiriesWithQuote ?? 0);
  const quotesSent = Number(quoteTiming?.quotesSent ?? 0);
  const quotesViewed = Number(quoteTiming?.quotesViewed ?? 0);
  const quotesAccepted = Number(quoteTiming?.quotesAccepted ?? 0);
  const quotesRejected = Number(quoteTiming?.quotesRejected ?? 0);
  const quotesVoided = Number(quoteTiming?.quotesVoided ?? 0);
  const quoteStatusCountMap = new Map(
    quoteStatusRows.map((row) => [row.status, Number(row.count)]),
  );

  return {
    summary: {
      responseRate: inquirySubmissions ? respondedInquiries / inquirySubmissions : 0,
      avgFirstResponseHours: roundHours(inquiryTiming?.avgFirstResponseHours),
      avgTimeToFirstQuoteHours: roundHours(
        inquiryTiming?.avgTimeToFirstQuoteHours,
      ),
      avgTimeSentToDecisionHours: roundHours(
        quoteTiming?.avgTimeSentToDecisionHours,
      ),
      inquiryToQuoteRate: inquirySubmissions
        ? inquiriesWithQuote / inquirySubmissions
        : 0,
      quotesSent,
      quotesViewed,
      quotesAccepted,
      quotesRejected,
      quotesVoided,
      quoteAcceptanceRate: quotesSent ? quotesAccepted / quotesSent : 0,
    },
    statusCounts: quoteStatuses.map((status) => ({
      status,
      count: quoteStatusCountMap.get(status) ?? 0,
    })),
    alerts: {
      staleInquiryCount: Number(staleRows[0]?.count ?? 0),
      pendingQuotesOverSevenDays: Number(pendingRows[0]?.count ?? 0),
    },
  };
}
