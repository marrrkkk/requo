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
  OperationalAlerts,
  ProAnalyticsData,
  RevenueSummary,
  TrendPoint,
  WorkflowTimingData,
} from "@/features/analytics/types";
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
  analyticsEvents,
  businessInquiryForms,
  followUps,
  inquiries,
  quotes,
} from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SUMMARY_DAYS = 30;
const TREND_WEEKS = 12;

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

export async function getFreeAnalytics(businessId: string): Promise<FreeAnalyticsData> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessAnalyticsCacheTags(businessId));

  const now = new Date();
  const since = subtractDays(now, SUMMARY_DAYS);
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
// Pro tier query
// ---------------------------------------------------------------------------

export async function getProAnalytics(businessId: string): Promise<ProAnalyticsData> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessAnalyticsCacheTags(businessId));

  const now = new Date();
  const since = subtractDays(now, SUMMARY_DAYS);
  const priorStart = subtractDays(now, SUMMARY_DAYS * 2);
  const trendStart = addUtcWeeks(startOfUtcWeek(now), -(TREND_WEEKS - 1));
  const formViewsTrend = buildDedupedFormViews(businessId, trendStart);
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

  // Trends
  const [formViewTrend, inqTrend, sentTrend, acceptedTrend] = await Promise.all([
    db
      .select({
        weekStart: sql<string>`to_char(date_trunc('week', ${formViewsTrend.occurredAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)`,
      })
      .from(formViewsTrend)
      .groupBy(sql`date_trunc('week', ${formViewsTrend.occurredAt})`)
      .orderBy(sql`date_trunc('week', ${formViewsTrend.occurredAt})`),
    db
      .select({
        weekStart: sql<string>`to_char(date_trunc('week', ${inquiries.submittedAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)`,
      })
      .from(inquiries)
      .where(and(eq(inquiries.businessId, businessId), gte(inquiries.submittedAt, trendStart)))
      .groupBy(sql`date_trunc('week', ${inquiries.submittedAt})`)
      .orderBy(sql`date_trunc('week', ${inquiries.submittedAt})`),
    db
      .select({
        weekStart: sql<string>`to_char(date_trunc('week', ${quotes.sentAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)`,
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
        weekStart: sql<string>`to_char(date_trunc('week', ${quotes.acceptedAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)`,
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

  const fvMap = new Map(formViewTrend.map((r) => [r.weekStart, Number(r.count)]));
  const iqMap = new Map(inqTrend.map((r) => [r.weekStart, Number(r.count)]));
  const stMap = new Map(sentTrend.map((r) => [r.weekStart, Number(r.count)]));
  const acMap = new Map(acceptedTrend.map((r) => [r.weekStart, Number(r.count)]));

  const trend: TrendPoint[] = Array.from({ length: TREND_WEEKS }).map((_, i) => {
    const ws = addUtcWeeks(startOfUtcWeek(trendStart), i);
    const iso = toIso(ws);
    return {
      label: formatWeekLabel(ws),
      weekStart: iso,
      formViews: fvMap.get(iso) ?? 0,
      inquirySubmissions: iqMap.get(iso) ?? 0,
      quotesSent: stMap.get(iso) ?? 0,
      acceptedQuotes: acMap.get(iso) ?? 0,
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

export async function getBusinessAnalytics(businessId: string): Promise<BusinessAnalyticsData> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessAnalyticsCacheTags(businessId));

  const now = new Date();
  const since = subtractDays(now, SUMMARY_DAYS);
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
