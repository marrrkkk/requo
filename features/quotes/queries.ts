import "server-only";

import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/lib/db/client";
import {
  activityLogs,
  inquiries,
  quoteItems,
  quotes,
  user,
  workspaces,
} from "@/lib/db/schema";
import {
  syncExpiredQuoteForPublicToken,
  syncExpiredQuotesForWorkspace,
} from "@/features/quotes/mutations";
import {
  getWorkspaceInquiryDetailCacheTags,
  getWorkspaceQuoteDetailCacheTags,
  getWorkspaceQuoteListCacheTags,
  hotWorkspaceCacheLife,
} from "@/lib/cache/workspace-tags";
import type {
  DashboardQuoteDetail,
  DashboardQuoteListItem,
  PublicQuoteView,
  QuoteInquiryPrefill,
  QuoteListFilters,
} from "@/features/quotes/types";
import { getQuoteReminderKinds } from "@/features/quotes/utils";

type GetQuoteListForWorkspaceInput = {
  workspaceId: string;
  filters: QuoteListFilters;
};

export async function getQuoteListForWorkspace({
  workspaceId,
  filters,
}: GetQuoteListForWorkspaceInput): Promise<DashboardQuoteListItem[]> {
  await syncExpiredQuotesForWorkspace(workspaceId);

  return getCachedQuoteListForWorkspace({
    workspaceId,
    filters,
  });
}

async function getCachedQuoteListForWorkspace({
  workspaceId,
  filters,
}: GetQuoteListForWorkspaceInput): Promise<DashboardQuoteListItem[]> {
  "use cache";

  cacheLife(hotWorkspaceCacheLife);
  cacheTag(...getWorkspaceQuoteListCacheTags(workspaceId));

  const conditions = [eq(quotes.workspaceId, workspaceId)];

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
    .orderBy(desc(quotes.createdAt));

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

type GetQuoteDetailForWorkspaceInput = {
  workspaceId: string;
  quoteId: string;
};

export async function getQuoteDetailForWorkspace({
  workspaceId,
  quoteId,
}: GetQuoteDetailForWorkspaceInput): Promise<DashboardQuoteDetail | null> {
  await syncExpiredQuotesForWorkspace(workspaceId);

  return getCachedQuoteDetailForWorkspace({
    workspaceId,
    quoteId,
  });
}

async function getCachedQuoteDetailForWorkspace({
  workspaceId,
  quoteId,
}: GetQuoteDetailForWorkspaceInput): Promise<DashboardQuoteDetail | null> {
  "use cache";

  cacheLife(hotWorkspaceCacheLife);
  cacheTag(...getWorkspaceQuoteDetailCacheTags(workspaceId, quoteId));

  const [quote] = await db
    .select({
      id: quotes.id,
      workspaceId: quotes.workspaceId,
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
    .where(and(eq(quotes.id, quoteId), eq(quotes.workspaceId, workspaceId)))
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
          eq(quoteItems.workspaceId, workspaceId),
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
          eq(activityLogs.workspaceId, workspaceId),
          eq(activityLogs.quoteId, quoteId),
        ),
      )
      .orderBy(desc(activityLogs.createdAt)),
  ]);

  return {
    id: quote.id,
    workspaceId: quote.workspaceId,
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
      workspaceName: workspaces.name,
      workspaceShortDescription: workspaces.shortDescription,
      workspaceContactEmail: workspaces.contactEmail,
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
    .innerJoin(workspaces, eq(quotes.workspaceId, workspaces.id))
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

type GetInquiryQuotePrefillForWorkspaceInput = {
  workspaceId: string;
  inquiryId: string;
};

export async function getInquiryQuotePrefillForWorkspace({
  workspaceId,
  inquiryId,
}: GetInquiryQuotePrefillForWorkspaceInput): Promise<QuoteInquiryPrefill | null> {
  "use cache";

  cacheLife(hotWorkspaceCacheLife);
  cacheTag(...getWorkspaceInquiryDetailCacheTags(workspaceId, inquiryId));

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
    .where(and(eq(inquiries.id, inquiryId), eq(inquiries.workspaceId, workspaceId)))
    .limit(1);

  return inquiry ?? null;
}
