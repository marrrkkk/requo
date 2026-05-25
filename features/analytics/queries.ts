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
  or,
  sql,
} from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import type {
  AiUsageSummary,
  BusinessAnalyticsData,
  FollowUpSummary,
  FormPerformanceRow,
  FreeAnalyticsData,
  FunnelStep,
  RevenueForecast,
  MetricSparklineData,
  OperationalAlerts,
  ProAnalyticsData,
  RevenueSummary,
  TrendPoint,
  WorkflowTimingData,
} from "@/features/analytics/types";
import { interpolateSparklineData } from "@/features/analytics/utils/sparkline-interpolation";
import { formatWeekLabel } from "@/features/analytics/utils";
import {
  getNonDeletedQuoteCondition,
  getOperationalQuoteCondition,
} from "@/features/quotes/queries";
import {
  getEffectiveInquiryStatus,
  getOperationalInquiryCondition,
} from "@/features/inquiries/queries";
import {
  getBusinessAnalyticsCacheTags,
  hotBusinessCacheLife,
} from "@/lib/cache/business-tags";
import { db } from "@/lib/db/client";
import {
  activityLogs,
  aiTokenLogs,
  analyticsDailyRollups,
  analyticsEvents,
  businessInquiryForms,
  followUps,
  inquiries,
  quotes,
} from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_SUMMARY_DAYS = 30;
const TREND_WEEKS = 12;

/** Preset range days mapped to cache-tag suffixes. */
const PRESET_RANGE_MAP: Record<number, string> = {
  7: "7d",
  30: "30d",
  90: "90d",
};

function subtractDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

function startOfUtcWeek(date: Date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  return d;
}

function addUtcWeeks(date: Date, weeks: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d;
}

function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function roundHours(v: number | string | null | undefined) {
  if (v === null || v === undefined) return null;
  return Math.round(Number(v) * 10) / 10;
}

/**
 * Resolves the effective date window. When since/until are not provided,
 * defaults to the last DEFAULT_SUMMARY_DAYS (30) days.
 */
function resolveDateWindow(since?: Date, until?: Date): { since: Date; until: Date } {
  const effectiveUntil = until ?? new Date();
  const effectiveSince = since ?? subtractDays(effectiveUntil, DEFAULT_SUMMARY_DAYS);
  return { since: effectiveSince, until: effectiveUntil };
}

/**
 * Determines the cache range suffix for preset ranges. Returns the suffix
 * string (e.g. "7d", "30d", "90d") if the date window matches a preset,
 * or undefined for custom ranges (which bypass caching).
 */
function detectPresetRange(since: Date, until: Date): string | undefined {
  const diffMs = until.getTime() - since.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return PRESET_RANGE_MAP[diffDays];
}

function buildDedupedFormViews(businessId: string, since?: Date) {
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
        since ? gte(analyticsEvents.occurredAt, since) : undefined,
      ),
    )
    .groupBy(
      analyticsEvents.businessInquiryFormId,
      analyticsEvents.visitorHash,
      sql`date_trunc('second', ${analyticsEvents.occurredAt})`,
    )
    .as("deduped_form_views");
}

function buildFirstQuoteSq(businessId: string) {
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
    .as("first_quote_sq");
}

function buildFirstResponseSq(businessId: string) {
  return db
    .select({
      inquiryId: activityLogs.inquiryId,
      firstResponseAt: sql<Date>`min(${activityLogs.createdAt})`.as("first_response_at"),
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
    .as("first_response_sq");
}

// ---------------------------------------------------------------------------
// Free tier query
// ---------------------------------------------------------------------------

export async function getFreeAnalytics(
  businessId: string,
  since?: Date,
  until?: Date,
): Promise<FreeAnalyticsData> {
  const { since: effectiveSince, until: effectiveUntil } = resolveDateWindow(since, until);
  const rangeSuffix = detectPresetRange(effectiveSince, effectiveUntil);

  // For preset ranges, use cross-request caching. Custom ranges query directly.
  if (rangeSuffix) {
    return getFreeAnalyticsCached(businessId, effectiveSince, effectiveUntil, rangeSuffix);
  }

  return getFreeAnalyticsUncached(businessId, effectiveSince, effectiveUntil);
}

async function getFreeAnalyticsCached(
  businessId: string,
  since: Date,
  until: Date,
  rangeSuffix: string,
): Promise<FreeAnalyticsData> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessAnalyticsCacheTags(businessId, rangeSuffix));

  return getFreeAnalyticsUncached(businessId, since, until);
}

async function getFreeAnalyticsUncached(
  businessId: string,
  since: Date,
  _until: Date,
): Promise<FreeAnalyticsData> {
  const formViews = buildDedupedFormViews(businessId, since);

  const firstQuoteSq = buildFirstQuoteSq(businessId);

  const [viewRows, inquiryRows, quoteRows] = await Promise.all([
    db
      .select({
        formViews: sql<number>`count(*)`,
        uniqueVisitors: sql<number>`count(distinct ${formViews.visitorHash})`,
      })
      .from(formViews),
    db
      .select({
        submissions: sql<number>`count(distinct ${inquiries.id})`,
        withQuote: sql<number>`count(distinct ${inquiries.id}) filter (where ${firstQuoteSq.firstQuoteAt} is not null)`,
      })
      .from(inquiries)
      .leftJoin(firstQuoteSq, eq(firstQuoteSq.inquiryId, inquiries.id))
      .where(and(eq(inquiries.businessId, businessId), gte(inquiries.submittedAt, since))),
    db
      .select({
        sent: sql<number>`count(distinct ${quotes.id}) filter (where ${quotes.sentAt} is not null and ${quotes.sentAt} >= ${since.toISOString()})`,
        viewed: sql<number>`count(distinct ${quotes.id}) filter (where ${quotes.publicViewedAt} is not null and ${quotes.publicViewedAt} >= ${since.toISOString()})`,
        accepted: sql<number>`count(distinct ${quotes.id}) filter (where ${quotes.status} = 'accepted' and ${quotes.acceptedAt} >= ${since.toISOString()})`,
        rejected: sql<number>`count(distinct ${quotes.id}) filter (where ${quotes.status} = 'rejected' and ${quotes.customerRespondedAt} >= ${since.toISOString()})`,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          getNonDeletedQuoteCondition(),
          or(
            gte(quotes.sentAt, since),
            gte(quotes.publicViewedAt, since),
            gte(quotes.acceptedAt, since),
            gte(quotes.customerRespondedAt, since),
          ),
        ),
      ),
  ]);

  const fv = Number(viewRows[0]?.formViews ?? 0);
  const uv = Number(viewRows[0]?.uniqueVisitors ?? 0);
  const submissions = Number(inquiryRows[0]?.submissions ?? 0);
  const withQuote = Number(inquiryRows[0]?.withQuote ?? 0);
  const sent = Number(quoteRows[0]?.sent ?? 0);
  const viewed = Number(quoteRows[0]?.viewed ?? 0);
  const accepted = Number(quoteRows[0]?.accepted ?? 0);
  const rejected = Number(quoteRows[0]?.rejected ?? 0);

  return {
    formViews: fv,
    uniqueVisitors: uv,
    inquirySubmissions: submissions,
    inquiriesWithQuote: withQuote,
    quotesSent: sent,
    quotesViewed: viewed,
    quotesAccepted: accepted,
    quotesRejected: rejected,
    formConversionRate: uv ? submissions / uv : 0,
    inquiryToQuoteRate: submissions ? withQuote / submissions : 0,
    quoteAcceptanceRate: sent ? accepted / sent : 0,
  };
}

// ---------------------------------------------------------------------------
// Sparkline data for basic metrics
// ---------------------------------------------------------------------------

export async function getBasicSparklineData(
  businessId: string,
  since?: Date,
  until?: Date,
): Promise<MetricSparklineData> {
  const { since: effectiveSince, until: effectiveUntil } = resolveDateWindow(since, until);
  const rangeSuffix = detectPresetRange(effectiveSince, effectiveUntil);

  if (rangeSuffix) {
    return getBasicSparklineDataCached(businessId, effectiveSince, effectiveUntil, rangeSuffix);
  }

  return getBasicSparklineDataUncached(businessId, effectiveSince, effectiveUntil);
}

async function getBasicSparklineDataCached(
  businessId: string,
  since: Date,
  until: Date,
  rangeSuffix: string,
): Promise<MetricSparklineData> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessAnalyticsCacheTags(businessId, `sparkline:${rangeSuffix}`));

  return getBasicSparklineDataUncached(businessId, since, until);
}

async function getBasicSparklineDataUncached(
  businessId: string,
  since: Date,
  until: Date,
): Promise<MetricSparklineData> {
  const rows = await db
    .select({
      date: analyticsDailyRollups.date,
      formViews: analyticsDailyRollups.formViews,
      inquirySubmissions: analyticsDailyRollups.inquirySubmissions,
      quotesSent: analyticsDailyRollups.quotesSent,
      quotesAccepted: analyticsDailyRollups.quotesAccepted,
      quotesRejected: analyticsDailyRollups.quotesRejected,
    })
    .from(analyticsDailyRollups)
    .where(
      and(
        eq(analyticsDailyRollups.businessId, businessId),
        gte(analyticsDailyRollups.date, toIso(since)),
        lte(analyticsDailyRollups.date, toIso(until)),
      ),
    )
    .orderBy(asc(analyticsDailyRollups.date));

  const toDailyValues = (extractor: (row: (typeof rows)[number]) => number) =>
    rows.map((r) => ({ date: r.date, value: extractor(r) }));

  return {
    formViews: interpolateSparklineData(toDailyValues((r) => r.formViews), since, until),
    inquirySubmissions: interpolateSparklineData(toDailyValues((r) => r.inquirySubmissions), since, until),
    quotesSent: interpolateSparklineData(toDailyValues((r) => r.quotesSent), since, until),
    quotesAccepted: interpolateSparklineData(toDailyValues((r) => r.quotesAccepted), since, until),
    quotesRejected: interpolateSparklineData(toDailyValues((r) => r.quotesRejected), since, until),
    quotesViewed: interpolateSparklineData(
      // Daily rollups don't have quotesViewed, fall back to empty (renders as flat zeros)
      [],
      since,
      until,
    ),
  };
}

// ---------------------------------------------------------------------------
// Pro tier query
// ---------------------------------------------------------------------------

export async function getProAnalytics(
  businessId: string,
  since?: Date,
  until?: Date,
): Promise<ProAnalyticsData> {
  const { since: effectiveSince, until: effectiveUntil } = resolveDateWindow(since, until);
  const rangeSuffix = detectPresetRange(effectiveSince, effectiveUntil);

  if (rangeSuffix) {
    return getProAnalyticsCached(businessId, effectiveSince, effectiveUntil, rangeSuffix);
  }

  return getProAnalyticsUncached(businessId, effectiveSince, effectiveUntil);
}

async function getProAnalyticsCached(
  businessId: string,
  since: Date,
  until: Date,
  rangeSuffix: string,
): Promise<ProAnalyticsData> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessAnalyticsCacheTags(businessId, rangeSuffix));

  return getProAnalyticsUncached(businessId, since, until);
}

async function getProAnalyticsUncached(
  businessId: string,
  since: Date,
  until: Date,
): Promise<ProAnalyticsData> {
  const summaryDays = Math.round((until.getTime() - since.getTime()) / (1000 * 60 * 60 * 24));
  const priorStart = subtractDays(since, summaryDays);
  const trendStart = addUtcWeeks(startOfUtcWeek(until), -(TREND_WEEKS - 1));
  const formViewsPrior = buildDedupedFormViews(businessId, priorStart);
  const firstQuote = buildFirstQuoteSq(businessId);

  // Prior period
  const [priorFormRows, priorInqRows, priorQuoteRows] = await Promise.all([
    db
      .select({
        formViews: sql<number>`count(*)`,
      })
      .from(formViewsPrior)
      .where(lt(formViewsPrior.occurredAt, sql`${since.toISOString()}::timestamp`)),
    db
      .select({ count: sql<number>`count(distinct ${inquiries.id})` })
      .from(inquiries)
      .where(
        and(
          eq(inquiries.businessId, businessId),
          gte(inquiries.submittedAt, priorStart),
          lt(inquiries.submittedAt, since),
        ),
      ),
    db
      .select({
        sent: sql<number>`count(distinct ${quotes.id}) filter (where ${quotes.sentAt} >= ${priorStart.toISOString()} and ${quotes.sentAt} < ${since.toISOString()})`,
        accepted: sql<number>`count(distinct ${quotes.id}) filter (where ${quotes.status} = 'accepted' and ${quotes.acceptedAt} >= ${priorStart.toISOString()} and ${quotes.acceptedAt} < ${since.toISOString()})`,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          getNonDeletedQuoteCondition(),
          or(
            and(gte(quotes.sentAt, priorStart), lt(quotes.sentAt, since)),
            and(gte(quotes.acceptedAt, priorStart), lt(quotes.acceptedAt, since)),
          ),
        ),
      ),
  ]);

  // Trends — reads from daily rollup table for complete past days, and falls
  // back to raw event scan for the current (partial) day. Results are combined
  // and grouped by week for the final trend output.
  const today = new Date();
  const todayIso = toIso(today);
  const trendStartIso = toIso(trendStart);

  // Determine if we need a partial-day supplement for today
  const todayIsInRange = today >= trendStart;

  // Read complete days from the rollup table (excludes today since it's partial)
  const rollupRows = await db
    .select({
      date: analyticsDailyRollups.date,
      formViews: analyticsDailyRollups.formViews,
      inquirySubmissions: analyticsDailyRollups.inquirySubmissions,
      quotesSent: analyticsDailyRollups.quotesSent,
      quotesAccepted: analyticsDailyRollups.quotesAccepted,
    })
    .from(analyticsDailyRollups)
    .where(
      and(
        eq(analyticsDailyRollups.businessId, businessId),
        gte(analyticsDailyRollups.date, trendStartIso),
        lt(analyticsDailyRollups.date, todayIso),
      ),
    )
    .orderBy(asc(analyticsDailyRollups.date));

  // For the current day (partial), query raw events in real-time
  let todayData = { formViews: 0, inquirySubmissions: 0, quotesSent: 0, acceptedQuotes: 0 };
  if (todayIsInRange) {
    const [todayRows] = await db.execute<{
      form_views: string;
      inquiry_submissions: string;
      quotes_sent: string;
      accepted_quotes: string;
    }>(sql`
      WITH today_events AS (
        SELECT occurred_at AS ts, 'form_view' AS metric
        FROM (
          SELECT min(${analyticsEvents.occurredAt}) AS occurred_at
          FROM ${analyticsEvents}
          WHERE ${analyticsEvents.businessId} = ${businessId}
            AND ${analyticsEvents.eventType} = 'inquiry_form_viewed'
            AND ${analyticsEvents.businessInquiryFormId} IS NOT NULL
            AND ${analyticsEvents.occurredAt} >= ${todayIso}::timestamp
          GROUP BY ${analyticsEvents.businessInquiryFormId}, ${analyticsEvents.visitorHash}, date_trunc('second', ${analyticsEvents.occurredAt})
        ) deduped

        UNION ALL

        SELECT ${inquiries.submittedAt} AS ts, 'inquiry' AS metric
        FROM ${inquiries}
        WHERE ${inquiries.businessId} = ${businessId}
          AND ${inquiries.submittedAt} >= ${todayIso}::timestamp

        UNION ALL

        SELECT ${quotes.sentAt} AS ts, 'sent' AS metric
        FROM ${quotes}
        WHERE ${quotes.businessId} = ${businessId}
          AND ${quotes.deletedAt} IS NULL
          AND ${quotes.sentAt} IS NOT NULL
          AND ${quotes.sentAt} >= ${todayIso}::timestamp

        UNION ALL

        SELECT ${quotes.acceptedAt} AS ts, 'accepted' AS metric
        FROM ${quotes}
        WHERE ${quotes.businessId} = ${businessId}
          AND ${quotes.deletedAt} IS NULL
          AND ${quotes.acceptedAt} IS NOT NULL
          AND ${quotes.acceptedAt} >= ${todayIso}::timestamp
      )
      SELECT
        count(*) FILTER (WHERE metric = 'form_view') AS form_views,
        count(*) FILTER (WHERE metric = 'inquiry') AS inquiry_submissions,
        count(*) FILTER (WHERE metric = 'sent') AS quotes_sent,
        count(*) FILTER (WHERE metric = 'accepted') AS accepted_quotes
      FROM today_events
    `);
    if (todayRows) {
      const row = todayRows as unknown as {
        form_views: string;
        inquiry_submissions: string;
        quotes_sent: string;
        accepted_quotes: string;
      };
      todayData = {
        formViews: Number(row.form_views),
        inquirySubmissions: Number(row.inquiry_submissions),
        quotesSent: Number(row.quotes_sent),
        acceptedQuotes: Number(row.accepted_quotes),
      };
    }
  }

  // Build a daily map combining rollup data + today's partial data
  const dailyMap = new Map<string, { formViews: number; inquirySubmissions: number; quotesSent: number; acceptedQuotes: number }>();
  for (const row of rollupRows) {
    dailyMap.set(row.date, {
      formViews: row.formViews,
      inquirySubmissions: row.inquirySubmissions,
      quotesSent: row.quotesSent,
      acceptedQuotes: row.quotesAccepted,
    });
  }
  if (todayIsInRange) {
    dailyMap.set(todayIso, todayData);
  }

  // Aggregate daily data into weekly buckets
  const trendMap = new Map<string, { formViews: number; inquirySubmissions: number; quotesSent: number; acceptedQuotes: number }>();
  for (const [dateStr, data] of dailyMap) {
    const d = new Date(dateStr + "T00:00:00Z");
    const weekStart = toIso(startOfUtcWeek(d));
    const existing = trendMap.get(weekStart);
    if (existing) {
      existing.formViews += data.formViews;
      existing.inquirySubmissions += data.inquirySubmissions;
      existing.quotesSent += data.quotesSent;
      existing.acceptedQuotes += data.acceptedQuotes;
    } else {
      trendMap.set(weekStart, { ...data });
    }
  }

  const trend: TrendPoint[] = Array.from({ length: TREND_WEEKS }).map((_, i) => {
    const ws = addUtcWeeks(startOfUtcWeek(trendStart), i);
    const iso = toIso(ws);
    const data = trendMap.get(iso);
    return {
      label: formatWeekLabel(ws),
      weekStart: iso,
      formViews: data?.formViews ?? 0,
      inquirySubmissions: data?.inquirySubmissions ?? 0,
      quotesSent: data?.quotesSent ?? 0,
      acceptedQuotes: data?.acceptedQuotes ?? 0,
    };
  });

  // Funnel (reuse free data or compute fresh — here we compute inline)
  const freeFormViews = buildDedupedFormViews(businessId, since);
  const [funnelView, funnelInq, funnelQuote] = await Promise.all([
    db.select({ uv: sql<number>`count(distinct ${freeFormViews.visitorHash})` }).from(freeFormViews),
    db
      .select({
        submissions: sql<number>`count(distinct ${inquiries.id})`,
        withQuote: sql<number>`count(distinct ${inquiries.id}) filter (where ${firstQuote.firstQuoteAt} is not null)`,
      })
      .from(inquiries)
      .leftJoin(firstQuote, eq(firstQuote.inquiryId, inquiries.id))
      .where(and(eq(inquiries.businessId, businessId), gte(inquiries.submittedAt, since))),
    db
      .select({
        accepted: sql<number>`count(distinct ${quotes.id}) filter (where ${quotes.status} = 'accepted' and ${quotes.acceptedAt} >= ${since.toISOString()})`,
      })
      .from(quotes)
      .where(and(eq(quotes.businessId, businessId), getNonDeletedQuoteCondition())),
  ]);

  const funnel: FunnelStep[] = [
    { label: "Visitors", count: Number(funnelView[0]?.uv ?? 0) },
    { label: "Submissions", count: Number(funnelInq[0]?.submissions ?? 0) },
    { label: "Quoted", count: Number(funnelInq[0]?.withQuote ?? 0) },
    { label: "Accepted", count: Number(funnelQuote[0]?.accepted ?? 0) },
  ];

  // Form performance
  const formViewStats = buildDedupedFormViews(businessId, since);
  const fvStatsSq = db
    .select({
      formId: formViewStats.businessInquiryFormId,
      viewCount: sql<number>`count(*)`.as("view_count"),
      uvCount: sql<number>`count(distinct ${formViewStats.visitorHash})`.as("uv_count"),
    })
    .from(formViewStats)
    .groupBy(formViewStats.businessInquiryFormId)
    .as("fv_stats");

  const formPipeline = db
    .select({
      formId: inquiries.businessInquiryFormId,
      submissionCount: sql<number>`count(distinct ${inquiries.id})`.as("sub_count"),
      sentCount: sql<number>`count(distinct ${quotes.id}) filter (where ${quotes.sentAt} is not null)`.as("sent_count"),
      acceptedCount: sql<number>`count(distinct ${quotes.id}) filter (where ${quotes.status} = 'accepted')`.as("acc_count"),
    })
    .from(inquiries)
    .leftJoin(
      quotes,
      and(
        eq(quotes.businessId, businessId),
        eq(quotes.inquiryId, inquiries.id),
        getNonDeletedQuoteCondition(),
      ),
    )
    .where(and(eq(inquiries.businessId, businessId), gte(inquiries.submittedAt, since)))
    .groupBy(inquiries.businessInquiryFormId)
    .as("form_pipeline");

  const formRows = await db
    .select({
      formId: businessInquiryForms.id,
      formName: businessInquiryForms.name,
      formSlug: businessInquiryForms.slug,
      isDefault: businessInquiryForms.isDefault,
      publicInquiryEnabled: businessInquiryForms.publicInquiryEnabled,
      archivedAt: businessInquiryForms.archivedAt,
      viewCount: sql<number>`coalesce(${fvStatsSq.viewCount}, 0)`,
      uvCount: sql<number>`coalesce(${fvStatsSq.uvCount}, 0)`,
      subCount: sql<number>`coalesce(${formPipeline.submissionCount}, 0)`,
      sentCount: sql<number>`coalesce(${formPipeline.sentCount}, 0)`,
      accCount: sql<number>`coalesce(${formPipeline.acceptedCount}, 0)`,
    })
    .from(businessInquiryForms)
    .leftJoin(fvStatsSq, eq(fvStatsSq.formId, businessInquiryForms.id))
    .leftJoin(formPipeline, eq(formPipeline.formId, businessInquiryForms.id))
    .where(eq(businessInquiryForms.businessId, businessId))
    .orderBy(
      asc(businessInquiryForms.archivedAt),
      sql`coalesce(${formPipeline.submissionCount}, 0) desc`,
      desc(businessInquiryForms.isDefault),
    );

  const formPerformance: FormPerformanceRow[] = formRows.map((r) => {
    const vc = Number(r.viewCount);
    const uv = Number(r.uvCount);
    const sub = Number(r.subCount);
    const sent = Number(r.sentCount);
    const acc = Number(r.accCount);
    return {
      formId: r.formId,
      formName: r.formName,
      formSlug: r.formSlug,
      isDefault: r.isDefault,
      publicInquiryEnabled: r.publicInquiryEnabled,
      archivedAt: r.archivedAt,
      viewCount: vc,
      uniqueVisitorCount: uv,
      submissionCount: sub,
      sentQuoteCount: sent,
      acceptedQuoteCount: acc,
      formConversionRate: uv ? sub / uv : 0,
      quoteAcceptanceRate: sent ? acc / sent : 0,
    };
  });

  return {
    priorPeriod: {
      formViews: Number(priorFormRows[0]?.formViews ?? 0),
      inquirySubmissions: Number(priorInqRows[0]?.count ?? 0),
      quotesSent: Number(priorQuoteRows[0]?.sent ?? 0),
      quotesAccepted: Number(priorQuoteRows[0]?.accepted ?? 0),
    },
    trend,
    funnel,
    formPerformance,
  };
}

// ---------------------------------------------------------------------------
// Business tier query
// ---------------------------------------------------------------------------

export async function getBusinessAnalytics(
  businessId: string,
  since?: Date,
  until?: Date,
): Promise<BusinessAnalyticsData> {
  const { since: effectiveSince, until: effectiveUntil } = resolveDateWindow(since, until);
  const rangeSuffix = detectPresetRange(effectiveSince, effectiveUntil);

  if (rangeSuffix) {
    return getBusinessAnalyticsCached(businessId, effectiveSince, effectiveUntil, rangeSuffix);
  }

  return getBusinessAnalyticsUncached(businessId, effectiveSince, effectiveUntil);
}

async function getBusinessAnalyticsCached(
  businessId: string,
  since: Date,
  until: Date,
  rangeSuffix: string,
): Promise<BusinessAnalyticsData> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessAnalyticsCacheTags(businessId, rangeSuffix));

  return getBusinessAnalyticsUncached(businessId, since, until);
}

async function getBusinessAnalyticsUncached(
  businessId: string,
  since: Date,
  until: Date,
): Promise<BusinessAnalyticsData> {
  const now = until;
  const staleCutoff = subtractDays(now, 2);
  const pendingCutoff = subtractDays(now, 7);
  const firstResponse = buildFirstResponseSq(businessId);
  const firstQuote = buildFirstQuoteSq(businessId);

  // Timing
  const [timingRows, quoteTimingRows] = await Promise.all([
    db
      .select({
        submissions: sql<number>`count(distinct ${inquiries.id})`,
        responded: sql<number>`count(distinct ${inquiries.id}) filter (where ${firstResponse.firstResponseAt} is not null)`,
        avgFirstResponse: sql<number | null>`avg(extract(epoch from (${firstResponse.firstResponseAt} - ${inquiries.submittedAt})) / 3600) filter (where ${firstResponse.firstResponseAt} is not null)`,
        avgToQuote: sql<number | null>`avg(extract(epoch from (${firstQuote.firstQuoteAt} - ${inquiries.submittedAt})) / 3600) filter (where ${firstQuote.firstQuoteAt} is not null)`,
      })
      .from(inquiries)
      .leftJoin(firstResponse, eq(firstResponse.inquiryId, inquiries.id))
      .leftJoin(firstQuote, eq(firstQuote.inquiryId, inquiries.id))
      .where(and(eq(inquiries.businessId, businessId), gte(inquiries.submittedAt, since))),
    db
      .select({
        avgToDecision: sql<number | null>`avg(extract(epoch from (${quotes.customerRespondedAt} - ${quotes.sentAt})) / 3600) filter (where ${quotes.customerRespondedAt} is not null and ${quotes.sentAt} is not null)`,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          getNonDeletedQuoteCondition(),
          isNotNull(quotes.sentAt),
          gte(quotes.sentAt, since),
        ),
      ),
  ]);

  const tRow = timingRows[0];
  const submissions = Number(tRow?.submissions ?? 0);
  const responded = Number(tRow?.responded ?? 0);

  const timing: WorkflowTimingData = {
    avgFirstResponseHours: roundHours(tRow?.avgFirstResponse),
    avgTimeToFirstQuoteHours: roundHours(tRow?.avgToQuote),
    avgTimeSentToDecisionHours: roundHours(quoteTimingRows[0]?.avgToDecision),
    responseRate: submissions ? responded / submissions : 0,
  };

  // Alerts
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

  const alerts: OperationalAlerts = {
    staleInquiryCount: Number(staleRows[0]?.count ?? 0),
    pendingQuotesOverSevenDays: Number(pendingRows[0]?.count ?? 0),
  };

  // Follow-ups
  const [fuRows] = await Promise.all([
    db
      .select({
        created: sql<number>`count(*)`,
        completed: sql<number>`count(*) filter (where ${followUps.status} = 'completed')`,
        skipped: sql<number>`count(*) filter (where ${followUps.status} = 'skipped')`,
        overdue: sql<number>`count(*) filter (where ${followUps.status} = 'pending' and ${followUps.dueAt} < now())`,
        avgDays: sql<number | null>`avg(extract(epoch from (${followUps.completedAt} - ${followUps.createdAt})) / 86400) filter (where ${followUps.completedAt} is not null)`,
      })
      .from(followUps)
      .where(and(eq(followUps.businessId, businessId), gte(followUps.createdAt, since))),
  ]);

  const fu = fuRows[0];
  const fuCreated = Number(fu?.created ?? 0);
  const fuCompleted = Number(fu?.completed ?? 0);

  const followUpSummary: FollowUpSummary = {
    created: fuCreated,
    completed: fuCompleted,
    skipped: Number(fu?.skipped ?? 0),
    overdue: Number(fu?.overdue ?? 0),
    completionRate: fuCreated > 0 ? fuCompleted / fuCreated : 0,
    avgDaysToComplete: fu?.avgDays != null ? Math.round(Number(fu.avgDays) * 10) / 10 : null,
  };

  // Revenue
  const [revRows] = await Promise.all([
    db
      .select({
        acceptedValue: sql<number>`coalesce(sum(${quotes.totalInCents}) filter (where ${quotes.status} = 'accepted'), 0)`,
        avgAccepted: sql<number>`coalesce(avg(${quotes.totalInCents}) filter (where ${quotes.status} = 'accepted'), 0)`,
        completedValue: sql<number>`coalesce(sum(${quotes.totalInCents}) filter (where ${quotes.status} = 'accepted' and ${quotes.completedAt} is not null), 0)`,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          getNonDeletedQuoteCondition(),
          gte(quotes.acceptedAt, since),
        ),
      ),
  ]);

  const revenue: RevenueSummary = {
    acceptedValueInCents: Number(revRows[0]?.acceptedValue ?? 0),
    averageAcceptedValueInCents: Math.round(Number(revRows[0]?.avgAccepted ?? 0)),
    completedValueInCents: Number(revRows[0]?.completedValue ?? 0),
  };

  // AI
  const [aiRows] = await Promise.all([
    db
      .select({
        invocations: sql<number>`count(*)`,
        tokens: sql<number>`coalesce(sum(${aiTokenLogs.totalTokens}), 0)`,
        cost: sql<number>`coalesce(sum(${aiTokenLogs.estimatedCostCents}), 0)`,
      })
      .from(aiTokenLogs)
      .where(and(eq(aiTokenLogs.businessId, businessId), gte(aiTokenLogs.createdAt, since))),
  ]);

  const ai: AiUsageSummary = {
    totalInvocations: Number(aiRows[0]?.invocations ?? 0),
    totalTokens: Number(aiRows[0]?.tokens ?? 0),
    estimatedCostCents: Number(aiRows[0]?.cost ?? 0),
  };

  return { timing, alerts, followUps: followUpSummary, revenue, ai };
}


// ---------------------------------------------------------------------------
// Revenue Forecast
// ---------------------------------------------------------------------------

/**
 * Computes a revenue forecast based on:
 * - Count of pending (sent, not responded) quotes
 * - Historical acceptance rate over the last 90 days
 * - Average accepted quote value over the last 90 days
 *
 * Returns null forecast when no historical acceptance data exists or
 * there are no pending quotes.
 */
export async function getRevenueForecast(
  businessId: string,
): Promise<RevenueForecast> {
  const now = new Date();
  const ninetyDaysAgo = subtractDays(now, 90);

  const [pendingRows, historicalRows] = await Promise.all([
    // Count of currently pending quotes (sent but not responded to)
    db
      .select({ count: sql<number>`count(*)` })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          getNonDeletedQuoteCondition(),
          eq(quotes.status, "sent"),
          isNotNull(quotes.sentAt),
          isNull(quotes.customerRespondedAt),
        ),
      ),
    // Historical acceptance rate and average value over last 90 days
    db
      .select({
        totalSent: sql<number>`count(distinct ${quotes.id}) filter (where ${quotes.sentAt} is not null)`,
        totalAccepted: sql<number>`count(distinct ${quotes.id}) filter (where ${quotes.status} = 'accepted')`,
        avgAcceptedValue: sql<number | null>`avg(${quotes.totalInCents}) filter (where ${quotes.status} = 'accepted')`,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          getNonDeletedQuoteCondition(),
          gte(quotes.sentAt, ninetyDaysAgo),
        ),
      ),
  ]);

  const pendingQuoteCount = Number(pendingRows[0]?.count ?? 0);
  const totalSent = Number(historicalRows[0]?.totalSent ?? 0);
  const totalAccepted = Number(historicalRows[0]?.totalAccepted ?? 0);
  const avgAcceptedValue = historicalRows[0]?.avgAcceptedValue != null
    ? Math.round(Number(historicalRows[0].avgAcceptedValue))
    : 0;

  const historicalAcceptanceRate = totalSent > 0 ? totalAccepted / totalSent : 0;

  // Return null forecast when insufficient data
  if (pendingQuoteCount === 0 || totalAccepted === 0) {
    return {
      forecastCents: null,
      pendingQuoteCount,
      historicalAcceptanceRate,
      averageQuoteValueCents: avgAcceptedValue,
    };
  }

  const forecastCents = Math.round(
    pendingQuoteCount * historicalAcceptanceRate * avgAcceptedValue,
  );

  return {
    forecastCents,
    pendingQuoteCount,
    historicalAcceptanceRate,
    averageQuoteValueCents: avgAcceptedValue,
  };
}

// ---------------------------------------------------------------------------
// Top Sources (Referrer Domains)
// ---------------------------------------------------------------------------

export type ReferrerSource = {
  domain: string;
  count: number;
};

/**
 * Returns the top 5 referrer domains from analytics event metadata within
 * the specified date range. Excludes "direct" traffic from the ranking.
 *
 * Gated behind `analyticsConversion` entitlement (enforced by the parent component).
 */
export async function getTopSources(
  businessId: string,
  since?: Date,
  until?: Date,
): Promise<ReferrerSource[]> {
  const { since: effectiveSince, until: effectiveUntil } = resolveDateWindow(since, until);

  const rows = await db.execute<{ domain: string; visit_count: string }>(sql`
    SELECT
      metadata->>'referrer' AS domain,
      count(*) AS visit_count
    FROM ${analyticsEvents}
    WHERE ${analyticsEvents.businessId} = ${businessId}
      AND ${analyticsEvents.occurredAt} >= ${effectiveSince.toISOString()}::timestamp
      AND ${analyticsEvents.occurredAt} <= ${effectiveUntil.toISOString()}::timestamp
      AND metadata->>'referrer' IS NOT NULL
      AND metadata->>'referrer' != 'direct'
      AND metadata->>'referrer' != ''
    GROUP BY metadata->>'referrer'
    ORDER BY count(*) DESC
    LIMIT 5
  `);

  return (rows as unknown as Array<{ domain: string; visit_count: string }>).map((r) => ({
    domain: r.domain,
    count: Number(r.visit_count),
  }));
}

// ---------------------------------------------------------------------------
// Campaign Performance (UTM)
// ---------------------------------------------------------------------------

export type CampaignPerformanceRow = {
  source: string;
  campaign: string;
  count: number;
};

/**
 * Returns inquiry counts grouped by utm_source and utm_campaign from the
 * analytics event metadata within the specified date range.
 *
 * Gated behind `analyticsConversion` entitlement (enforced by the parent component).
 */
export async function getCampaignPerformance(
  businessId: string,
  since?: Date,
  until?: Date,
): Promise<CampaignPerformanceRow[]> {
  const { since: effectiveSince, until: effectiveUntil } = resolveDateWindow(since, until);

  const rows = await db.execute<{ source: string; campaign: string; inquiry_count: string }>(sql`
    SELECT
      metadata->>'utmSource' AS source,
      metadata->>'utmCampaign' AS campaign,
      count(*) AS inquiry_count
    FROM ${analyticsEvents}
    WHERE ${analyticsEvents.businessId} = ${businessId}
      AND ${analyticsEvents.occurredAt} >= ${effectiveSince.toISOString()}::timestamp
      AND ${analyticsEvents.occurredAt} <= ${effectiveUntil.toISOString()}::timestamp
      AND metadata->>'utmSource' IS NOT NULL
      AND metadata->>'utmSource' != ''
    GROUP BY metadata->>'utmSource', metadata->>'utmCampaign'
    ORDER BY count(*) DESC
  `);

  return (rows as unknown as Array<{ source: string; campaign: string; inquiry_count: string }>).map((r) => ({
    source: r.source,
    campaign: r.campaign || "(none)",
    count: Number(r.inquiry_count),
  }));
}
