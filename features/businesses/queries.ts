import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
} from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import type { BusinessOverviewData } from "@/features/businesses/types";
import { syncExpiredQuotesForBusiness } from "@/features/quotes/mutations";
import { getEffectiveInquiryStatus } from "@/features/inquiries/queries";
import { getQuoteReminderKinds } from "@/features/quotes/utils";
import {
  getBusinessOverviewCacheTags,
  hotBusinessCacheLife,
} from "@/lib/cache/business-tags";
import { db } from "@/lib/db/client";
import { inquiries, quotes } from "@/lib/db/schema";

const overdueReplyStatuses = ["new", "waiting"] as const;
const actionableInquiryStatuses = ["new", "waiting", "quoted"] as const;

function getFutureUtcDateString(daysAhead: number) {
  return new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export async function getBusinessOverviewData(
  businessId: string,
): Promise<BusinessOverviewData> {
  await syncExpiredQuotesForBusiness(businessId);

  return getCachedBusinessOverviewData(businessId);
}

async function getCachedBusinessOverviewData(
  businessId: string,
): Promise<BusinessOverviewData> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessOverviewCacheTags(businessId));

  const overdueCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const followUpDueCutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const recentAcceptedCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const today = new Date().toISOString().slice(0, 10);
  const expiringSoonCutoff = getFutureUtcDateString(7);

  const [
    overdueReplies,
    overdueReplyCountRows,
    expiringSoonQuotes,
    expiringSoonQuoteCountRows,
    inquiriesWithoutQuotes,
    inquiryWithoutQuoteCountRows,
    followUpDueQuotes,
    followUpDueQuoteCountRows,
    recentAcceptedQuotes,
    recentAcceptedQuoteCountRows,
  ] = await Promise.all([
    db
      .select({
        id: inquiries.id,
        customerName: inquiries.customerName,
        customerEmail: inquiries.customerEmail,
        serviceCategory: inquiries.serviceCategory,
        status: getEffectiveInquiryStatus,
        submittedAt: inquiries.submittedAt,
      })
      .from(inquiries)
      .leftJoin(
        quotes,
        and(
          eq(quotes.inquiryId, inquiries.id),
          eq(quotes.businessId, businessId),
        ),
      )
      .where(
        and(
          eq(inquiries.businessId, businessId),
          inArray(inquiries.status, overdueReplyStatuses),
          lt(inquiries.submittedAt, overdueCutoff),
          isNull(quotes.id),
        ),
      )
      .orderBy(asc(inquiries.submittedAt), asc(inquiries.createdAt))
      .limit(4),
    db
      .select({
        count: count(),
      })
      .from(inquiries)
      .leftJoin(
        quotes,
        and(
          eq(quotes.inquiryId, inquiries.id),
          eq(quotes.businessId, businessId),
        ),
      )
      .where(
        and(
          eq(inquiries.businessId, businessId),
          inArray(inquiries.status, overdueReplyStatuses),
          lt(inquiries.submittedAt, overdueCutoff),
          isNull(quotes.id),
        ),
      ),
    db
      .select({
        id: quotes.id,
        inquiryId: quotes.inquiryId,
        quoteNumber: quotes.quoteNumber,
        title: quotes.title,
        customerName: quotes.customerName,
        customerEmail: quotes.customerEmail,
        currency: quotes.currency,
        totalInCents: quotes.totalInCents,
        status: quotes.status,
        postAcceptanceStatus: quotes.postAcceptanceStatus,
        validUntil: quotes.validUntil,
        sentAt: quotes.sentAt,
        acceptedAt: quotes.acceptedAt,
        customerRespondedAt: quotes.customerRespondedAt,
        updatedAt: quotes.updatedAt,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          eq(quotes.status, "sent"),
          isNull(quotes.customerRespondedAt),
          gte(quotes.validUntil, today),
          lte(quotes.validUntil, expiringSoonCutoff),
        ),
      )
      .orderBy(asc(quotes.validUntil), desc(quotes.sentAt), desc(quotes.createdAt))
      .limit(4),
    db
      .select({
        count: count(),
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          eq(quotes.status, "sent"),
          isNull(quotes.customerRespondedAt),
          gte(quotes.validUntil, today),
          lte(quotes.validUntil, expiringSoonCutoff),
        ),
      ),
    db
      .select({
        id: inquiries.id,
        customerName: inquiries.customerName,
        customerEmail: inquiries.customerEmail,
        serviceCategory: inquiries.serviceCategory,
        status: getEffectiveInquiryStatus,
        submittedAt: inquiries.submittedAt,
      })
      .from(inquiries)
      .leftJoin(
        quotes,
        and(
          eq(quotes.inquiryId, inquiries.id),
          eq(quotes.businessId, businessId),
        ),
      )
      .where(
        and(
          eq(inquiries.businessId, businessId),
          inArray(inquiries.status, actionableInquiryStatuses),
          isNull(quotes.id),
        ),
      )
      .orderBy(desc(inquiries.submittedAt), desc(inquiries.createdAt))
      .limit(4),
    db
      .select({
        count: count(),
      })
      .from(inquiries)
      .leftJoin(
        quotes,
        and(
          eq(quotes.inquiryId, inquiries.id),
          eq(quotes.businessId, businessId),
        ),
      )
      .where(
        and(
          eq(inquiries.businessId, businessId),
          inArray(inquiries.status, actionableInquiryStatuses),
          isNull(quotes.id),
        ),
      ),
    db
      .select({
        id: quotes.id,
        inquiryId: quotes.inquiryId,
        quoteNumber: quotes.quoteNumber,
        title: quotes.title,
        customerName: quotes.customerName,
        customerEmail: quotes.customerEmail,
        currency: quotes.currency,
        totalInCents: quotes.totalInCents,
        status: quotes.status,
        postAcceptanceStatus: quotes.postAcceptanceStatus,
        validUntil: quotes.validUntil,
        sentAt: quotes.sentAt,
        acceptedAt: quotes.acceptedAt,
        customerRespondedAt: quotes.customerRespondedAt,
        updatedAt: quotes.updatedAt,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          eq(quotes.status, "sent"),
          isNull(quotes.customerRespondedAt),
          isNotNull(quotes.sentAt),
          lte(quotes.sentAt, followUpDueCutoff),
        ),
      )
      .orderBy(asc(quotes.validUntil), asc(quotes.sentAt), desc(quotes.createdAt))
      .limit(4),
    db
      .select({
        count: count(),
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          eq(quotes.status, "sent"),
          isNull(quotes.customerRespondedAt),
          isNotNull(quotes.sentAt),
          lte(quotes.sentAt, followUpDueCutoff),
        ),
      ),
    db
      .select({
        id: quotes.id,
        inquiryId: quotes.inquiryId,
        quoteNumber: quotes.quoteNumber,
        title: quotes.title,
        customerName: quotes.customerName,
        customerEmail: quotes.customerEmail,
        currency: quotes.currency,
        totalInCents: quotes.totalInCents,
        status: quotes.status,
        postAcceptanceStatus: quotes.postAcceptanceStatus,
        validUntil: quotes.validUntil,
        sentAt: quotes.sentAt,
        acceptedAt: quotes.acceptedAt,
        customerRespondedAt: quotes.customerRespondedAt,
        updatedAt: quotes.updatedAt,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          eq(quotes.status, "accepted"),
          isNotNull(quotes.acceptedAt),
          gte(quotes.acceptedAt, recentAcceptedCutoff),
        ),
      )
      .orderBy(desc(quotes.acceptedAt), desc(quotes.createdAt))
      .limit(4),
    db
      .select({
        count: count(),
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          eq(quotes.status, "accepted"),
          isNotNull(quotes.acceptedAt),
          gte(quotes.acceptedAt, recentAcceptedCutoff),
        ),
      ),
  ]);

  function withQuoteReminders<
    T extends {
      status: (typeof expiringSoonQuotes)[number]["status"];
      sentAt: Date | null;
      customerRespondedAt: Date | null;
      validUntil: string;
    },
  >(quote: T) {
    return {
      ...quote,
      reminders: getQuoteReminderKinds({
        status: quote.status,
        sentAt: quote.sentAt,
        customerRespondedAt: quote.customerRespondedAt,
        validUntil: quote.validUntil,
      }),
    };
  }

  return {
    overdueReplies,
    expiringSoonQuotes: expiringSoonQuotes.map(withQuoteReminders),
    inquiriesWithoutQuotes,
    followUpDueQuotes: followUpDueQuotes.map(withQuoteReminders),
    recentAcceptedQuotes: recentAcceptedQuotes.map(withQuoteReminders),
    counts: {
      overdueReplies: Number(overdueReplyCountRows[0]?.count ?? 0),
      expiringSoonQuotes: Number(expiringSoonQuoteCountRows[0]?.count ?? 0),
      inquiriesWithoutQuotes: Number(inquiryWithoutQuoteCountRows[0]?.count ?? 0),
      followUpDueQuotes: Number(followUpDueQuoteCountRows[0]?.count ?? 0),
      recentAcceptedQuotes: Number(recentAcceptedQuoteCountRows[0]?.count ?? 0),
    },
  };
}
