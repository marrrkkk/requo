import "server-only";

import { and, desc, eq, ne, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import type { CustomerHistoryData } from "@/features/customers/types";
import { hotWorkspaceCacheLife } from "@/lib/cache/workspace-tags";
import { db } from "@/lib/db/client";
import { inquiries, quotes } from "@/lib/db/schema";
import {
  getWorkspaceInquiryListCacheTags,
  getWorkspaceQuoteListCacheTags,
} from "@/lib/cache/workspace-tags";

function normalizeCustomerEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function getCustomerHistoryForWorkspace(input: {
  workspaceId: string;
  customerEmail: string;
  excludeInquiryId?: string | null;
  excludeQuoteId?: string | null;
}): Promise<CustomerHistoryData | null> {
  const normalizedEmail = normalizeCustomerEmail(input.customerEmail);

  if (!normalizedEmail) {
    return null;
  }

  return getCachedCustomerHistoryForWorkspace({
    workspaceId: input.workspaceId,
    customerEmail: normalizedEmail,
    excludeInquiryId: input.excludeInquiryId ?? null,
    excludeQuoteId: input.excludeQuoteId ?? null,
  });
}

async function getCachedCustomerHistoryForWorkspace(input: {
  workspaceId: string;
  customerEmail: string;
  excludeInquiryId: string | null;
  excludeQuoteId: string | null;
}): Promise<CustomerHistoryData | null> {
  "use cache";

  cacheLife(hotWorkspaceCacheLife);
  cacheTag(
    ...getWorkspaceInquiryListCacheTags(input.workspaceId),
    ...getWorkspaceQuoteListCacheTags(input.workspaceId),
  );

  const inquiryConditions = [
    eq(inquiries.workspaceId, input.workspaceId),
    sql`lower(${inquiries.customerEmail}) = ${input.customerEmail}`,
  ];
  const quoteConditions = [
    eq(quotes.workspaceId, input.workspaceId),
    sql`lower(${quotes.customerEmail}) = ${input.customerEmail}`,
  ];

  if (input.excludeInquiryId) {
    inquiryConditions.push(ne(inquiries.id, input.excludeInquiryId));
  }

  if (input.excludeQuoteId) {
    quoteConditions.push(ne(quotes.id, input.excludeQuoteId));
  }

  const [inquiryCountRows, quoteCountRows, inquiryRows, quoteRows] =
    await Promise.all([
      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(inquiries)
        .where(and(...inquiryConditions)),
      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(quotes)
        .where(and(...quoteConditions)),
      db
        .select({
          id: inquiries.id,
          customerName: inquiries.customerName,
          customerEmail: inquiries.customerEmail,
          serviceCategory: inquiries.serviceCategory,
          status: inquiries.status,
          submittedAt: inquiries.submittedAt,
        })
        .from(inquiries)
        .where(and(...inquiryConditions))
        .orderBy(desc(inquiries.submittedAt), desc(inquiries.createdAt))
        .limit(5),
      db
        .select({
          id: quotes.id,
          customerName: quotes.customerName,
          customerEmail: quotes.customerEmail,
          quoteNumber: quotes.quoteNumber,
          title: quotes.title,
          status: quotes.status,
          postAcceptanceStatus: quotes.postAcceptanceStatus,
          totalInCents: quotes.totalInCents,
          currency: quotes.currency,
          createdAt: quotes.createdAt,
        })
        .from(quotes)
        .where(and(...quoteConditions))
        .orderBy(desc(quotes.createdAt))
        .limit(5),
    ]);

  const inquiryCount = Number(inquiryCountRows[0]?.count ?? 0);
  const quoteCount = Number(quoteCountRows[0]?.count ?? 0);

  if (!inquiryCount && !quoteCount) {
    return null;
  }

  const latestInquiry = inquiryRows[0];
  const latestQuote = quoteRows[0];
  const latestOutcome =
    latestInquiry && latestQuote
      ? latestInquiry.submittedAt >= latestQuote.createdAt
        ? {
            kind: "inquiry" as const,
            status: latestInquiry.status,
          }
        : {
            kind: "quote" as const,
            status: latestQuote.status,
            postAcceptanceStatus: latestQuote.postAcceptanceStatus,
          }
      : latestQuote
        ? {
            kind: "quote" as const,
            status: latestQuote.status,
            postAcceptanceStatus: latestQuote.postAcceptanceStatus,
          }
        : latestInquiry
          ? {
              kind: "inquiry" as const,
              status: latestInquiry.status,
            }
          : null;

  return {
    customerEmail: input.customerEmail,
    inquiryCount,
    quoteCount,
    latestOutcome,
    inquiries: inquiryRows,
    quotes: quoteRows,
  };
}
