import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lte,
  sql,
} from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import type {
  BusinessDashboardSummaryData,
  BusinessOverviewData,
} from "@/features/businesses/types";
import {
  getEffectiveInquiryStatus,
  getNonDeletedInquiryCondition,
  getOperationalInquiryCondition,
} from "@/features/inquiries/queries";
import {
  getEffectiveQuoteStatus,
  getNonDeletedQuoteCondition,
  getOperationalQuoteCondition,
} from "@/features/quotes/queries";
import { getQuoteReminderKinds } from "@/features/quotes/utils";
import {
  getBusinessAnalyticsCacheTags,
  getBusinessOverviewCacheTags,
  hotBusinessCacheLife,
} from "@/lib/cache/business-tags";
import { db } from "@/lib/db/client";
import { inquiries, quotes } from "@/lib/db/schema";

const overviewQueueItemLimit = 4;

function createEmptyBusinessOverviewData(): BusinessOverviewData {
  return {
    overdueInquiries: [],
    expiringSoonQuotes: [],
    newInquiries: [],
    recentAcceptedQuotes: [],
    counts: {
      overdueInquiries: 0,
      expiringSoonQuotes: 0,
      newInquiries: 0,
      recentAcceptedQuotes: 0,
    },
  };
}

function createEmptyBusinessDashboardSummaryData(): BusinessDashboardSummaryData {
  return {
    totalInquiries: 0,
    totalQuotes: 0,
    inquiriesThisWeek: 0,
    inquiryCoverageRate: 0,
    wonCount: 0,
    lostCount: 0,
  };
}

function getFutureUtcDateString(daysAhead: number) {
  return new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export async function getBusinessOverviewData(
  businessId: string,
): Promise<BusinessOverviewData> {
  try {
    return await getCachedBusinessOverviewData(businessId);
  } catch (error) {
    console.error(
      "Failed to load business overview data.",
      { businessId },
      error,
    );

    return createEmptyBusinessOverviewData();
  }
}

async function getCachedBusinessOverviewData(
  businessId: string,
): Promise<BusinessOverviewData> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessOverviewCacheTags(businessId));

  const recentAcceptedCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const today = new Date().toISOString().slice(0, 10);
  const expiringSoonCutoff = getFutureUtcDateString(7);
  const isOverdueInquiry = sql`${getEffectiveInquiryStatus} = 'overdue'`;
  const isNewInquiry = sql`${getEffectiveInquiryStatus} = 'new'`;
  const totalCount = sql<number>`count(*) over ()`;

  const [
    overdueInquiries,
    expiringSoonQuotes,
    newInquiries,
    recentAcceptedQuotes,
  ] = await Promise.all([
    db
      .select({
        id: inquiries.id,
        customerName: inquiries.customerName,
        customerEmail: inquiries.customerEmail,
        customerContactMethod: inquiries.customerContactMethod,
        customerContactHandle: inquiries.customerContactHandle,
        serviceCategory: inquiries.serviceCategory,
        status: getEffectiveInquiryStatus,
        submittedAt: inquiries.submittedAt,
        totalCount,
      })
      .from(inquiries)
      .where(
        and(
          eq(inquiries.businessId, businessId),
          getOperationalInquiryCondition(),
          isOverdueInquiry,
        ),
      )
      .orderBy(
        asc(inquiries.requestedDeadline),
        asc(inquiries.submittedAt),
        asc(inquiries.createdAt),
      )
      .limit(overviewQueueItemLimit),
    db
      .select({
        id: quotes.id,
        inquiryId: quotes.inquiryId,
        quoteNumber: quotes.quoteNumber,
        title: quotes.title,
        customerName: quotes.customerName,
        customerEmail: quotes.customerEmail,
        customerContactMethod: quotes.customerContactMethod,
        customerContactHandle: quotes.customerContactHandle,
        currency: quotes.currency,
        totalInCents: quotes.totalInCents,
        status: getEffectiveQuoteStatus,
        postAcceptanceStatus: quotes.postAcceptanceStatus,
        validUntil: quotes.validUntil,
        sentAt: quotes.sentAt,
        acceptedAt: quotes.acceptedAt,
        customerRespondedAt: quotes.customerRespondedAt,
        updatedAt: quotes.updatedAt,
        totalCount,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          getOperationalQuoteCondition(),
          sql`${getEffectiveQuoteStatus} = 'sent'::quote_status`,
          isNull(quotes.customerRespondedAt),
          gte(quotes.validUntil, today),
          lte(quotes.validUntil, expiringSoonCutoff),
        ),
      )
      .orderBy(asc(quotes.validUntil), desc(quotes.sentAt), desc(quotes.createdAt))
      .limit(overviewQueueItemLimit),
    db
      .select({
        id: inquiries.id,
        customerName: inquiries.customerName,
        customerEmail: inquiries.customerEmail,
        customerContactMethod: inquiries.customerContactMethod,
        customerContactHandle: inquiries.customerContactHandle,
        serviceCategory: inquiries.serviceCategory,
        status: getEffectiveInquiryStatus,
        submittedAt: inquiries.submittedAt,
        totalCount,
      })
      .from(inquiries)
      .where(
        and(
          eq(inquiries.businessId, businessId),
          getOperationalInquiryCondition(),
          isNewInquiry,
        ),
      )
      .orderBy(asc(inquiries.submittedAt), asc(inquiries.createdAt))
      .limit(overviewQueueItemLimit),
    db
      .select({
        id: quotes.id,
        inquiryId: quotes.inquiryId,
        quoteNumber: quotes.quoteNumber,
        title: quotes.title,
        customerName: quotes.customerName,
        customerEmail: quotes.customerEmail,
        customerContactMethod: quotes.customerContactMethod,
        customerContactHandle: quotes.customerContactHandle,
        currency: quotes.currency,
        totalInCents: quotes.totalInCents,
        status: getEffectiveQuoteStatus,
        postAcceptanceStatus: quotes.postAcceptanceStatus,
        validUntil: quotes.validUntil,
        sentAt: quotes.sentAt,
        acceptedAt: quotes.acceptedAt,
        customerRespondedAt: quotes.customerRespondedAt,
        updatedAt: quotes.updatedAt,
        totalCount,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          getOperationalQuoteCondition(),
          eq(quotes.status, "accepted"),
          isNotNull(quotes.acceptedAt),
          gte(quotes.acceptedAt, recentAcceptedCutoff),
        ),
      )
      .orderBy(desc(quotes.acceptedAt), desc(quotes.createdAt))
      .limit(overviewQueueItemLimit),
  ]);

  function withQuoteReminders<
    T extends {
      status: (typeof expiringSoonQuotes)[number]["status"];
      sentAt: Date | null;
      customerRespondedAt: Date | null;
      validUntil: string;
      totalCount: number;
    },
  >(quote: T) {
    const { totalCount, ...row } = quote;

    void totalCount;

    return {
      ...row,
      reminders: getQuoteReminderKinds({
        status: row.status,
        sentAt: row.sentAt,
        customerRespondedAt: row.customerRespondedAt,
        validUntil: row.validUntil,
      }),
    };
  }

  function stripTotalCount<T extends { totalCount: number }>(row: T) {
    const { totalCount, ...rest } = row;

    void totalCount;

    return rest;
  }

  return {
    overdueInquiries: overdueInquiries.map(stripTotalCount),
    expiringSoonQuotes: expiringSoonQuotes.map(withQuoteReminders),
    newInquiries: newInquiries.map(stripTotalCount),
    recentAcceptedQuotes: recentAcceptedQuotes.map(withQuoteReminders),
    counts: {
      overdueInquiries: Number(overdueInquiries[0]?.totalCount ?? 0),
      expiringSoonQuotes: Number(expiringSoonQuotes[0]?.totalCount ?? 0),
      newInquiries: Number(newInquiries[0]?.totalCount ?? 0),
      recentAcceptedQuotes: Number(recentAcceptedQuotes[0]?.totalCount ?? 0),
    },
  };
}

export async function getBusinessDashboardSummaryData(
  businessId: string,
): Promise<BusinessDashboardSummaryData> {
  try {
    return await getCachedBusinessDashboardSummaryData(businessId);
  } catch (error) {
    console.error(
      "Failed to load business dashboard summary data.",
      { businessId },
      error,
    );

    return createEmptyBusinessDashboardSummaryData();
  }
}

async function getCachedBusinessDashboardSummaryData(
  businessId: string,
): Promise<BusinessDashboardSummaryData> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessAnalyticsCacheTags(businessId));

  const thisWeekStart = new Date();

  thisWeekStart.setUTCDate(thisWeekStart.getUTCDate() - 6);
  thisWeekStart.setUTCHours(0, 0, 0, 0);
  const thisWeekStartIso = thisWeekStart.toISOString();

  const [inquirySummaryRows, quoteSummaryRows] = await Promise.all([
    db
      .select({
        totalInquiries: sql<number>`count(*)`.as("total_inquiries"),
        inquiriesThisWeek: sql<number>`count(*) filter (where ${inquiries.submittedAt} >= ${thisWeekStartIso}::timestamptz)`.as(
          "inquiries_this_week",
        ),
        wonCount:
          sql<number>`count(*) filter (where ${inquiries.status} = 'won')`.as(
            "won_count",
          ),
        lostCount:
          sql<number>`count(*) filter (where ${inquiries.status} = 'lost')`.as(
            "lost_count",
          ),
      })
      .from(inquiries)
      .where(and(eq(inquiries.businessId, businessId), getNonDeletedInquiryCondition())),
    db
      .select({
        totalQuotes: sql<number>`count(*)`.as("total_quotes"),
        linkedInquiryCount: sql<number>`count(distinct ${quotes.inquiryId}) filter (where ${quotes.inquiryId} is not null)`.as(
          "linked_inquiry_count",
        ),
      })
      .from(quotes)
      .where(and(eq(quotes.businessId, businessId), getNonDeletedQuoteCondition())),
  ]);

  const totalInquiries = Number(inquirySummaryRows[0]?.totalInquiries ?? 0);
  const totalQuotes = Number(quoteSummaryRows[0]?.totalQuotes ?? 0);
  const linkedInquiryCount = Number(quoteSummaryRows[0]?.linkedInquiryCount ?? 0);

  return {
    totalInquiries,
    totalQuotes,
    inquiriesThisWeek: Number(inquirySummaryRows[0]?.inquiriesThisWeek ?? 0),
    inquiryCoverageRate: totalInquiries ? linkedInquiryCount / totalInquiries : 0,
    wonCount: Number(inquirySummaryRows[0]?.wonCount ?? 0),
    lostCount: Number(inquirySummaryRows[0]?.lostCount ?? 0),
  };
}
