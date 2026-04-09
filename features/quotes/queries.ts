import "server-only";

import { and, asc, count, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/lib/db/client";
import {
  activityLogs,
  inquiries,
  quoteItems,
  quotes,
  user,
  businesses,
} from "@/lib/db/schema";
import {
  syncExpiredQuoteForPublicToken,
  syncExpiredQuotesForBusiness,
} from "@/features/quotes/mutations";
import {
  getBusinessInquiryDetailCacheTags,
  getBusinessQuoteDetailCacheTags,
  getBusinessQuoteListCacheTags,
  hotBusinessCacheLife,
} from "@/lib/cache/business-tags";
import type {
  DashboardQuoteDetail,
  DashboardQuoteListItem,
  PublicQuoteView,
  QuoteInquiryPrefill,
  QuoteListQueryFilters,
} from "@/features/quotes/types";
import { getQuoteReminderKinds } from "@/features/quotes/utils";

type GetQuoteListForBusinessInput = {
  businessId: string;
  filters: QuoteListQueryFilters;
};

function getQuoteListConditions({
  businessId,
  filters,
}: GetQuoteListForBusinessInput) {
  const conditions = [eq(quotes.businessId, businessId)];

  if (filters.status !== "all") {
    conditions.push(eq(quotes.status, filters.status));
  }

  if (filters.q) {
    const pattern = `%${filters.q}%`;

    conditions.push(
      or(
        ilike(quotes.quoteNumber, pattern),
        ilike(quotes.title, pattern),
        ilike(quotes.customerName, pattern),
        ilike(quotes.customerEmail, pattern),
      )!,
    );
  }

  return conditions;
}

export async function getQuoteListCountForBusiness({
  businessId,
  filters,
}: GetQuoteListForBusinessInput): Promise<number> {
  await syncExpiredQuotesForBusiness(businessId);

  return getCachedQuoteListCountForBusiness({
    businessId,
    filters,
  });
}

async function getCachedQuoteListCountForBusiness({
  businessId,
  filters,
}: GetQuoteListForBusinessInput): Promise<number> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessQuoteListCacheTags(businessId));

  const conditions = getQuoteListConditions({
    businessId,
    filters,
  });

  const rows = await db
    .select({
      count: count(),
    })
    .from(quotes)
    .where(and(...conditions));

  return Number(rows[0]?.count ?? 0);
}

type GetQuoteListPageForBusinessInput = GetQuoteListForBusinessInput & {
  page: number;
  pageSize: number;
};

export async function getQuoteListPageForBusiness({
  businessId,
  filters,
  page,
  pageSize,
}: GetQuoteListPageForBusinessInput): Promise<DashboardQuoteListItem[]> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessQuoteListCacheTags(businessId));

  const conditions = getQuoteListConditions({
    businessId,
    filters,
  });

  const createdAtSort = filters.sort === "oldest" ? asc : desc;
  const offset = Math.max(0, (page - 1) * pageSize);

  const rows = await db
    .select({
      id: quotes.id,
      inquiryId: quotes.inquiryId,
      quoteNumber: quotes.quoteNumber,
      publicToken: quotes.publicToken,
      title: quotes.title,
      customerName: quotes.customerName,
      customerEmail: quotes.customerEmail,
      totalInCents: quotes.totalInCents,
      validUntil: quotes.validUntil,
      status: quotes.status,
      postAcceptanceStatus: quotes.postAcceptanceStatus,
      createdAt: quotes.createdAt,
      sentAt: quotes.sentAt,
      customerRespondedAt: quotes.customerRespondedAt,
    })
    .from(quotes)
    .where(and(...conditions))
    .orderBy(createdAtSort(quotes.createdAt))
    .limit(pageSize)
    .offset(offset);

  return rows.map((row) => ({
    ...row,
    reminders: getQuoteReminderKinds({
      status: row.status,
      sentAt: row.sentAt,
      customerRespondedAt: row.customerRespondedAt,
      validUntil: row.validUntil,
    }),
  }));
}

type QuoteExportRow = {
  id: string;
  inquiryId: string | null;
  quoteNumber: string;
  title: string;
  customerName: string;
  customerEmail: string;
  totalInCents: number;
  currency: string;
  validUntil: string;
  status: string;
  postAcceptanceStatus: string;
  createdAt: Date;
  sentAt: Date | null;
  customerRespondedAt: Date | null;
};

export async function getQuoteExportRowsForBusiness({
  businessId,
  filters,
  from,
  to,
}: GetQuoteListForBusinessInput & {
  from?: string;
  to?: string;
}): Promise<QuoteExportRow[]> {
  await syncExpiredQuotesForBusiness(businessId);

  const conditions = getQuoteListConditions({
    businessId,
    filters,
  });
  if (from) {
    conditions.push(gte(quotes.createdAt, new Date(`${from}T00:00:00.000Z`)));
  }
  if (to) {
    conditions.push(lte(quotes.createdAt, new Date(`${to}T23:59:59.999Z`)));
  }
  const createdAtSort = filters.sort === "oldest" ? asc : desc;

  return db
    .select({
      id: quotes.id,
      inquiryId: quotes.inquiryId,
      quoteNumber: quotes.quoteNumber,
      title: quotes.title,
      customerName: quotes.customerName,
      customerEmail: quotes.customerEmail,
      totalInCents: quotes.totalInCents,
      currency: quotes.currency,
      validUntil: quotes.validUntil,
      status: quotes.status,
      postAcceptanceStatus: quotes.postAcceptanceStatus,
      createdAt: quotes.createdAt,
      sentAt: quotes.sentAt,
      customerRespondedAt: quotes.customerRespondedAt,
    })
    .from(quotes)
    .where(and(...conditions))
    .orderBy(createdAtSort(quotes.createdAt));
}

type GetQuoteDetailForBusinessInput = {
  businessId: string;
  quoteId: string;
};

export async function getQuoteDetailForBusiness({
  businessId,
  quoteId,
}: GetQuoteDetailForBusinessInput): Promise<DashboardQuoteDetail | null> {
  await syncExpiredQuotesForBusiness(businessId);

  return getCachedQuoteDetailForBusiness({
    businessId,
    quoteId,
  });
}

async function getCachedQuoteDetailForBusiness({
  businessId,
  quoteId,
}: GetQuoteDetailForBusinessInput): Promise<DashboardQuoteDetail | null> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessQuoteDetailCacheTags(businessId, quoteId));

  const [quote] = await db
    .select({
      id: quotes.id,
      businessId: quotes.businessId,
      inquiryId: quotes.inquiryId,
      quoteNumber: quotes.quoteNumber,
      publicToken: quotes.publicToken,
      title: quotes.title,
      customerName: quotes.customerName,
      customerEmail: quotes.customerEmail,
      currency: quotes.currency,
      notes: quotes.notes,
      subtotalInCents: quotes.subtotalInCents,
      discountInCents: quotes.discountInCents,
      totalInCents: quotes.totalInCents,
      validUntil: quotes.validUntil,
      status: quotes.status,
      postAcceptanceStatus: quotes.postAcceptanceStatus,
      sentAt: quotes.sentAt,
      acceptedAt: quotes.acceptedAt,
      publicViewedAt: quotes.publicViewedAt,
      customerRespondedAt: quotes.customerRespondedAt,
      customerResponseMessage: quotes.customerResponseMessage,
      createdAt: quotes.createdAt,
      updatedAt: quotes.updatedAt,
      linkedInquiryId: inquiries.id,
      linkedInquiryCustomerName: inquiries.customerName,
      linkedInquiryCustomerEmail: inquiries.customerEmail,
      linkedInquiryServiceCategory: inquiries.serviceCategory,
      linkedInquiryStatus: inquiries.status,
    })
    .from(quotes)
    .leftJoin(inquiries, eq(quotes.inquiryId, inquiries.id))
    .where(and(eq(quotes.id, quoteId), eq(quotes.businessId, businessId)))
    .limit(1);

  if (!quote) {
    return null;
  }

  const [items, activities] = await Promise.all([
    db
      .select({
        id: quoteItems.id,
        description: quoteItems.description,
        quantity: quoteItems.quantity,
        unitPriceInCents: quoteItems.unitPriceInCents,
        lineTotalInCents: quoteItems.lineTotalInCents,
        position: quoteItems.position,
      })
      .from(quoteItems)
      .where(
        and(
          eq(quoteItems.businessId, businessId),
          eq(quoteItems.quoteId, quoteId),
        ),
      )
      .orderBy(asc(quoteItems.position), asc(quoteItems.createdAt)),
    db
      .select({
        id: activityLogs.id,
        type: activityLogs.type,
        summary: activityLogs.summary,
        createdAt: activityLogs.createdAt,
        actorName: user.name,
      })
      .from(activityLogs)
      .leftJoin(user, eq(activityLogs.actorUserId, user.id))
      .where(
        and(
          eq(activityLogs.businessId, businessId),
          eq(activityLogs.quoteId, quoteId),
        ),
      )
      .orderBy(desc(activityLogs.createdAt)),
  ]);

  return {
    id: quote.id,
    businessId: quote.businessId,
    inquiryId: quote.inquiryId,
    quoteNumber: quote.quoteNumber,
    publicToken: quote.publicToken,
    title: quote.title,
    customerName: quote.customerName,
    customerEmail: quote.customerEmail,
    currency: quote.currency,
    notes: quote.notes,
    subtotalInCents: quote.subtotalInCents,
    discountInCents: quote.discountInCents,
    totalInCents: quote.totalInCents,
    validUntil: quote.validUntil,
    status: quote.status,
    postAcceptanceStatus: quote.postAcceptanceStatus,
    sentAt: quote.sentAt,
    acceptedAt: quote.acceptedAt,
    publicViewedAt: quote.publicViewedAt,
    customerRespondedAt: quote.customerRespondedAt,
    customerResponseMessage: quote.customerResponseMessage,
    createdAt: quote.createdAt,
    updatedAt: quote.updatedAt,
    items,
    activities,
    linkedInquiry: quote.linkedInquiryId
      ? {
          id: quote.linkedInquiryId,
          customerName: quote.linkedInquiryCustomerName!,
          customerEmail: quote.linkedInquiryCustomerEmail!,
          serviceCategory: quote.linkedInquiryServiceCategory!,
          status: quote.linkedInquiryStatus!,
        }
      : null,
    reminders: getQuoteReminderKinds({
      status: quote.status,
      sentAt: quote.sentAt,
      customerRespondedAt: quote.customerRespondedAt,
      validUntil: quote.validUntil,
    }),
  };
}

export async function getPublicQuoteByToken(
  token: string,
): Promise<PublicQuoteView | null> {
  await syncExpiredQuoteForPublicToken(token);

  const [quote] = await db
    .select({
      id: quotes.id,
      token: quotes.publicToken,
      quoteNumber: quotes.quoteNumber,
      title: quotes.title,
      businessName: businesses.name,
      businessShortDescription: businesses.shortDescription,
      businessContactEmail: businesses.contactEmail,
      customerName: quotes.customerName,
      customerEmail: quotes.customerEmail,
      currency: quotes.currency,
      notes: quotes.notes,
      validUntil: quotes.validUntil,
      status: quotes.status,
      subtotalInCents: quotes.subtotalInCents,
      discountInCents: quotes.discountInCents,
      totalInCents: quotes.totalInCents,
      sentAt: quotes.sentAt,
      acceptedAt: quotes.acceptedAt,
      publicViewedAt: quotes.publicViewedAt,
      customerRespondedAt: quotes.customerRespondedAt,
      customerResponseMessage: quotes.customerResponseMessage,
    })
    .from(quotes)
    .innerJoin(businesses, eq(quotes.businessId, businesses.id))
    .where(eq(quotes.publicToken, token))
    .limit(1);

  if (!quote || quote.status === "draft") {
    return null;
  }

  const items = await db
    .select({
      id: quoteItems.id,
      description: quoteItems.description,
      quantity: quoteItems.quantity,
      unitPriceInCents: quoteItems.unitPriceInCents,
      lineTotalInCents: quoteItems.lineTotalInCents,
      position: quoteItems.position,
    })
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, quote.id))
    .orderBy(asc(quoteItems.position), asc(quoteItems.createdAt));

  return {
    ...quote,
    items,
  };
}

type GetInquiryQuotePrefillForBusinessInput = {
  businessId: string;
  inquiryId: string;
};

export async function getInquiryQuotePrefillForBusiness({
  businessId,
  inquiryId,
}: GetInquiryQuotePrefillForBusinessInput): Promise<QuoteInquiryPrefill | null> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessInquiryDetailCacheTags(businessId, inquiryId));

  const [inquiry] = await db
    .select({
      id: inquiries.id,
      customerName: inquiries.customerName,
      customerEmail: inquiries.customerEmail,
      serviceCategory: inquiries.serviceCategory,
      status: inquiries.status,
      details: inquiries.details,
      requestedDeadline: inquiries.requestedDeadline,
      budgetText: inquiries.budgetText,
    })
    .from(inquiries)
    .where(and(eq(inquiries.id, inquiryId), eq(inquiries.businessId, businessId)))
    .limit(1);

  return inquiry ?? null;
}
