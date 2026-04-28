import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { after } from "next/server";
import { cache } from "react";

import { db } from "@/lib/db/client";
import {
  activityLogs,
  followUps,
  inquiries,
  postWinChecklistItems,
  quoteItems,
  quotes,
  user,
  businesses,
  workspaces,
} from "@/lib/db/schema";
import {
  syncExpiredQuoteForPublicToken,
  syncExpiredQuotesForBusiness,
} from "@/features/quotes/mutations";
import {
  getEffectiveInquiryStatus,
  getInquiryRecordState,
} from "@/features/inquiries/queries";
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
  QuoteRecordView,
  QuoteSendPayload,
  QuoteStatus,
} from "@/features/quotes/types";
import { getQuoteReminderKinds } from "@/features/quotes/utils";
import {
  getQuotePublicTokenLookupCondition,
  tryResolveStoredQuotePublicToken,
} from "@/features/quotes/token-storage";

export const getEffectiveQuoteStatus = sql<QuoteStatus>`case
  when ${quotes.status} = 'sent' and ${quotes.validUntil} < current_date then 'expired'::quote_status
  else ${quotes.status}
end`;

export const getQuoteRecordState = sql<QuoteRecordView>`case
  when ${quotes.archivedAt} is not null then 'archived'
  else 'active'
end`;

const scheduleExpiredQuotesSyncForBusiness = cache((businessId: string) => {
  after(async () => {
    try {
      await syncExpiredQuotesForBusiness(businessId);
    } catch (error) {
      console.error("Failed to reconcile expired quotes for business.", error);
    }
  });
});

const scheduleExpiredQuoteSyncForPublicToken = cache((token: string) => {
  after(async () => {
    try {
      await syncExpiredQuoteForPublicToken(token);
    } catch (error) {
      console.error("Failed to reconcile expired public quote.", error);
    }
  });
});

type GetQuoteListForBusinessInput = {
  businessId: string;
  filters: QuoteListQueryFilters;
};

export function getNonDeletedQuoteCondition() {
  return isNull(quotes.deletedAt);
}

export function getOperationalQuoteCondition() {
  return and(isNull(quotes.deletedAt), isNull(quotes.archivedAt));
}

function getQuoteViewCondition(view: QuoteRecordView) {
  switch (view) {
    case "archived":
      return and(isNull(quotes.deletedAt), isNotNull(quotes.archivedAt));
    case "active":
    default:
      return and(isNull(quotes.deletedAt), isNull(quotes.archivedAt));
  }
}

function getQuoteListConditions({
  businessId,
  filters,
}: GetQuoteListForBusinessInput) {
  const conditions = [
    eq(quotes.businessId, businessId),
    getQuoteViewCondition(filters.view),
  ];

  if (filters.status !== "all") {
    conditions.push(
      sql`${getEffectiveQuoteStatus} = ${filters.status}::quote_status`,
    );
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
  scheduleExpiredQuotesSyncForBusiness(businessId);

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
  scheduleExpiredQuotesSyncForBusiness(businessId);
  return getCachedQuoteListPageForBusiness({
    businessId,
    filters,
    page,
    pageSize,
  });
}

async function getCachedQuoteListPageForBusiness({
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
      quoteNumber: quotes.quoteNumber,
      title: quotes.title,
      customerName: quotes.customerName,
      customerEmail: quotes.customerEmail,
      customerContactMethod: quotes.customerContactMethod,
      customerContactHandle: quotes.customerContactHandle,
      totalInCents: quotes.totalInCents,
      currency: quotes.currency,
      validUntil: quotes.validUntil,
      status: getEffectiveQuoteStatus,
      archivedAt: quotes.archivedAt,
      postAcceptanceStatus: quotes.postAcceptanceStatus,
      sentAt: quotes.sentAt,
      publicViewedAt: quotes.publicViewedAt,
      customerRespondedAt: quotes.customerRespondedAt,
      pendingFollowUpCount: sql<number>`(
        select count(*)::int
        from ${followUps}
        where ${followUps.businessId} = ${quotes.businessId}
          and ${followUps.quoteId} = ${quotes.id}
          and ${followUps.status} = 'pending'
      )`,
      nextFollowUpDueAt: sql<Date | null>`(
        select min(${followUps.dueAt})
        from ${followUps}
        where ${followUps.businessId} = ${quotes.businessId}
          and ${followUps.quoteId} = ${quotes.id}
          and ${followUps.status} = 'pending'
      )`,
    })
    .from(quotes)
    .where(and(...conditions))
    .orderBy(createdAtSort(quotes.createdAt))
    .limit(pageSize)
    .offset(offset);

  return rows.map((row) => {
    return {
      currency: row.currency,
      customerEmail: row.customerEmail,
      customerContactMethod: row.customerContactMethod,
      customerContactHandle: row.customerContactHandle,
      customerName: row.customerName,
      customerRespondedAt: row.customerRespondedAt,
      id: row.id,
      nextFollowUpDueAt: row.nextFollowUpDueAt,
      pendingFollowUpCount: row.pendingFollowUpCount,
      postAcceptanceStatus: row.postAcceptanceStatus,
      publicViewedAt: row.publicViewedAt,
      quoteNumber: row.quoteNumber,
      reminders: getQuoteReminderKinds({
        status: row.status,
        sentAt: row.sentAt,
        customerRespondedAt: row.customerRespondedAt,
        validUntil: row.validUntil,
      }),
      archivedAt: row.archivedAt,
      sentAt: row.sentAt,
      status: row.status,
      title: row.title,
      totalInCents: row.totalInCents,
      validUntil: row.validUntil,
    };
  });
}

type QuoteExportRow = {
  id: string;
  inquiryId: string | null;
  quoteNumber: string;
  title: string;
  customerName: string;
  customerEmail: string | null;
  customerContactMethod: string;
  customerContactHandle: string;
  totalInCents: number;
  currency: string;
  validUntil: string;
  status: string;
  archivedAt: Date | null;
  voidedAt: Date | null;
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
  scheduleExpiredQuotesSyncForBusiness(businessId);

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
      customerContactMethod: quotes.customerContactMethod,
      customerContactHandle: quotes.customerContactHandle,
      totalInCents: quotes.totalInCents,
      currency: quotes.currency,
      validUntil: quotes.validUntil,
      status: getEffectiveQuoteStatus,
      archivedAt: quotes.archivedAt,
      voidedAt: quotes.voidedAt,
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
  scheduleExpiredQuotesSyncForBusiness(businessId);

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
      customerContactMethod: quotes.customerContactMethod,
      customerContactHandle: quotes.customerContactHandle,
      currency: quotes.currency,
      notes: quotes.notes,
      subtotalInCents: quotes.subtotalInCents,
      discountInCents: quotes.discountInCents,
      totalInCents: quotes.totalInCents,
      validUntil: quotes.validUntil,
      status: getEffectiveQuoteStatus,
      archivedAt: quotes.archivedAt,
      voidedAt: quotes.voidedAt,
      postAcceptanceStatus: quotes.postAcceptanceStatus,
      sentAt: quotes.sentAt,
      acceptedAt: quotes.acceptedAt,
      completedAt: quotes.completedAt,
      canceledAt: quotes.canceledAt,
      cancellationReason: quotes.cancellationReason,
      cancellationNote: quotes.cancellationNote,
      publicViewedAt: quotes.publicViewedAt,
      customerRespondedAt: quotes.customerRespondedAt,
      customerResponseMessage: quotes.customerResponseMessage,
      createdAt: quotes.createdAt,
      updatedAt: quotes.updatedAt,
      linkedInquiryId: inquiries.id,
      linkedInquiryCustomerName: inquiries.customerName,
      linkedInquiryCustomerEmail: inquiries.customerEmail,
      linkedInquiryCustomerContactMethod: inquiries.customerContactMethod,
      linkedInquiryCustomerContactHandle: inquiries.customerContactHandle,
      linkedInquiryServiceCategory: inquiries.serviceCategory,
      linkedInquiryStatus: getEffectiveInquiryStatus,
      linkedInquiryRecordState: getInquiryRecordState,
    })
    .from(quotes)
    .leftJoin(inquiries, eq(quotes.inquiryId, inquiries.id))
    .where(
      and(
        eq(quotes.id, quoteId),
        eq(quotes.businessId, businessId),
        isNull(quotes.deletedAt),
      ),
    )
    .limit(1);

  if (!quote) {
    return null;
  }

  const [items, activities, checklistItems] = await Promise.all([
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
    db
      .select({
        id: postWinChecklistItems.id,
        label: postWinChecklistItems.label,
        completedAt: postWinChecklistItems.completedAt,
        position: postWinChecklistItems.position,
      })
      .from(postWinChecklistItems)
      .where(
        and(
          eq(postWinChecklistItems.businessId, businessId),
          eq(postWinChecklistItems.quoteId, quoteId),
        ),
      )
      .orderBy(asc(postWinChecklistItems.position)),
  ]);

  return {
    id: quote.id,
    businessId: quote.businessId,
    inquiryId: quote.inquiryId,
    quoteNumber: quote.quoteNumber,
    publicToken: tryResolveStoredQuotePublicToken(quote),
    title: quote.title,
    customerName: quote.customerName,
    customerEmail: quote.customerEmail,
    customerContactMethod: quote.customerContactMethod,
    customerContactHandle: quote.customerContactHandle,
    currency: quote.currency,
    notes: quote.notes,
    subtotalInCents: quote.subtotalInCents,
    discountInCents: quote.discountInCents,
    totalInCents: quote.totalInCents,
    validUntil: quote.validUntil,
    status: quote.status,
    archivedAt: quote.archivedAt,
    voidedAt: quote.voidedAt,
    postAcceptanceStatus: quote.postAcceptanceStatus,
    sentAt: quote.sentAt,
    acceptedAt: quote.acceptedAt,
    completedAt: quote.completedAt,
    canceledAt: quote.canceledAt,
    cancellationReason: quote.cancellationReason,
    cancellationNote: quote.cancellationNote,
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
          customerContactMethod: quote.linkedInquiryCustomerContactMethod!,
          customerContactHandle: quote.linkedInquiryCustomerContactHandle!,
          serviceCategory: quote.linkedInquiryServiceCategory!,
          status: quote.linkedInquiryStatus!,
          recordState: quote.linkedInquiryRecordState!,
        }
      : null,
    reminders: getQuoteReminderKinds({
      status: quote.status,
      sentAt: quote.sentAt,
      customerRespondedAt: quote.customerRespondedAt,
      validUntil: quote.validUntil,
    }),
    checklistItems,
  };
}

export async function getQuoteSendPayloadForBusiness({
  businessId,
  quoteId,
}: GetQuoteDetailForBusinessInput): Promise<QuoteSendPayload | null> {
  scheduleExpiredQuotesSyncForBusiness(businessId);

  return getCachedQuoteSendPayloadForBusiness({
    businessId,
    quoteId,
  });
}

async function getCachedQuoteSendPayloadForBusiness({
  businessId,
  quoteId,
}: GetQuoteDetailForBusinessInput): Promise<QuoteSendPayload | null> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessQuoteDetailCacheTags(businessId, quoteId));

  const [quote] = await db
    .select({
      id: quotes.id,
      inquiryId: quotes.inquiryId,
      quoteNumber: quotes.quoteNumber,
      publicToken: quotes.publicToken,
      title: quotes.title,
      customerName: quotes.customerName,
      customerEmail: quotes.customerEmail,
      customerContactMethod: quotes.customerContactMethod,
      customerContactHandle: quotes.customerContactHandle,
      currency: quotes.currency,
      notes: quotes.notes,
      subtotalInCents: quotes.subtotalInCents,
      discountInCents: quotes.discountInCents,
      totalInCents: quotes.totalInCents,
      validUntil: quotes.validUntil,
      status: getEffectiveQuoteStatus,
      updatedAt: quotes.updatedAt,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.id, quoteId),
        eq(quotes.businessId, businessId),
        isNull(quotes.deletedAt),
      ),
    )
    .limit(1);

  if (!quote) {
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
    .where(
      and(
        eq(quoteItems.businessId, businessId),
        eq(quoteItems.quoteId, quoteId),
      ),
    )
    .orderBy(asc(quoteItems.position), asc(quoteItems.createdAt));

  return {
    currency: quote.currency,
    customerEmail: quote.customerEmail,
    customerContactMethod: quote.customerContactMethod,
    customerContactHandle: quote.customerContactHandle,
    customerName: quote.customerName,
    discountInCents: quote.discountInCents,
    id: quote.id,
    inquiryId: quote.inquiryId,
    notes: quote.notes,
    publicToken: tryResolveStoredQuotePublicToken(quote),
    quoteNumber: quote.quoteNumber,
    status: quote.status,
    subtotalInCents: quote.subtotalInCents,
    title: quote.title,
    totalInCents: quote.totalInCents,
    updatedAt: quote.updatedAt,
    validUntil: quote.validUntil,
    items,
  };
}

export async function getPublicQuoteByToken(
  token: string,
): Promise<PublicQuoteView | null> {
  scheduleExpiredQuoteSyncForPublicToken(token);

  const [quote] = await db
    .select({
      id: quotes.id,
      businessId: quotes.businessId,
      quoteNumber: quotes.quoteNumber,
      title: quotes.title,
      businessName: businesses.name,
      businessPlan: workspaces.plan,
      businessShortDescription: businesses.shortDescription,
      businessContactEmail: businesses.contactEmail,
      customerName: quotes.customerName,
      customerEmail: quotes.customerEmail,
      customerContactMethod: quotes.customerContactMethod,
      customerContactHandle: quotes.customerContactHandle,
      currency: quotes.currency,
      notes: quotes.notes,
      validUntil: quotes.validUntil,
      status: getEffectiveQuoteStatus,
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
    .innerJoin(workspaces, eq(businesses.workspaceId, workspaces.id))
    .where(
      and(
        getQuotePublicTokenLookupCondition(token),
        isNull(quotes.deletedAt),
        isNull(workspaces.deletedAt),
        isNull(businesses.deletedAt),
        isNull(businesses.archivedAt),
      ),
    )
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
    acceptedAt: quote.acceptedAt,
    businessId: quote.businessId,
    businessContactEmail: quote.businessContactEmail,
    businessName: quote.businessName,
    businessPlan: quote.businessPlan,
    businessShortDescription: quote.businessShortDescription,
    currency: quote.currency,
    customerEmail: quote.customerEmail,
    customerContactMethod: quote.customerContactMethod,
    customerContactHandle: quote.customerContactHandle,
    customerName: quote.customerName,
    customerRespondedAt: quote.customerRespondedAt,
    customerResponseMessage: quote.customerResponseMessage,
    discountInCents: quote.discountInCents,
    id: quote.id,
    notes: quote.notes,
    publicViewedAt: quote.publicViewedAt,
    quoteNumber: quote.quoteNumber,
    sentAt: quote.sentAt,
    status: quote.status,
    subtotalInCents: quote.subtotalInCents,
    token,
    title: quote.title,
    totalInCents: quote.totalInCents,
    validUntil: quote.validUntil,
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
      customerContactMethod: inquiries.customerContactMethod,
      customerContactHandle: inquiries.customerContactHandle,
      serviceCategory: inquiries.serviceCategory,
      status: getEffectiveInquiryStatus,
      recordState: getInquiryRecordState,
      details: inquiries.details,
      requestedDeadline: inquiries.requestedDeadline,
      budgetText: inquiries.budgetText,
    })
    .from(inquiries)
    .where(
      and(
        eq(inquiries.id, inquiryId),
        eq(inquiries.businessId, businessId),
        isNull(inquiries.deletedAt),
      ),
    )
    .limit(1);

  return inquiry ?? null;
}
