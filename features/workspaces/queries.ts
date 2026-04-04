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

import type { WorkspaceOverviewData } from "@/features/workspaces/types";
import { syncExpiredQuotesForWorkspace } from "@/features/quotes/mutations";
import {
  getWorkspaceOverviewCacheTags,
  hotWorkspaceCacheLife,
} from "@/lib/cache/workspace-tags";
import { db } from "@/lib/db/client";
import { inquiries, quotes } from "@/lib/db/schema";

const overdueReplyStatuses = ["new", "waiting"] as const;
const actionableInquiryStatuses = ["new", "waiting", "quoted"] as const;

function getFutureUtcDateString(daysAhead: number) {
  return new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export async function getWorkspaceOverviewData(
  workspaceId: string,
): Promise<WorkspaceOverviewData> {
  await syncExpiredQuotesForWorkspace(workspaceId);

  return getCachedWorkspaceOverviewData(workspaceId);
}

async function getCachedWorkspaceOverviewData(
  workspaceId: string,
): Promise<WorkspaceOverviewData> {
  "use cache";

  cacheLife(hotWorkspaceCacheLife);
  cacheTag(...getWorkspaceOverviewCacheTags(workspaceId));

  const overdueCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
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
    awaitingResponseQuotes,
    awaitingResponseQuoteCountRows,
    recentAcceptedQuotes,
    recentAcceptedQuoteCountRows,
  ] = await Promise.all([
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
      .leftJoin(
        quotes,
        and(
          eq(quotes.inquiryId, inquiries.id),
          eq(quotes.workspaceId, workspaceId),
        ),
      )
      .where(
        and(
          eq(inquiries.workspaceId, workspaceId),
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
          eq(quotes.workspaceId, workspaceId),
        ),
      )
      .where(
        and(
          eq(inquiries.workspaceId, workspaceId),
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
        validUntil: quotes.validUntil,
        sentAt: quotes.sentAt,
        acceptedAt: quotes.acceptedAt,
        customerRespondedAt: quotes.customerRespondedAt,
        updatedAt: quotes.updatedAt,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.workspaceId, workspaceId),
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
          eq(quotes.workspaceId, workspaceId),
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
        status: inquiries.status,
        submittedAt: inquiries.submittedAt,
      })
      .from(inquiries)
      .leftJoin(
        quotes,
        and(
          eq(quotes.inquiryId, inquiries.id),
          eq(quotes.workspaceId, workspaceId),
        ),
      )
      .where(
        and(
          eq(inquiries.workspaceId, workspaceId),
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
          eq(quotes.workspaceId, workspaceId),
        ),
      )
      .where(
        and(
          eq(inquiries.workspaceId, workspaceId),
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
        validUntil: quotes.validUntil,
        sentAt: quotes.sentAt,
        acceptedAt: quotes.acceptedAt,
        customerRespondedAt: quotes.customerRespondedAt,
        updatedAt: quotes.updatedAt,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.workspaceId, workspaceId),
          eq(quotes.status, "sent"),
          isNull(quotes.customerRespondedAt),
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
          eq(quotes.workspaceId, workspaceId),
          eq(quotes.status, "sent"),
          isNull(quotes.customerRespondedAt),
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
        validUntil: quotes.validUntil,
        sentAt: quotes.sentAt,
        acceptedAt: quotes.acceptedAt,
        customerRespondedAt: quotes.customerRespondedAt,
        updatedAt: quotes.updatedAt,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.workspaceId, workspaceId),
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
          eq(quotes.workspaceId, workspaceId),
          eq(quotes.status, "accepted"),
          isNotNull(quotes.acceptedAt),
          gte(quotes.acceptedAt, recentAcceptedCutoff),
        ),
      ),
  ]);

  return {
    overdueReplies,
    expiringSoonQuotes,
    inquiriesWithoutQuotes,
    awaitingResponseQuotes,
    recentAcceptedQuotes,
    counts: {
      overdueReplies: Number(overdueReplyCountRows[0]?.count ?? 0),
      expiringSoonQuotes: Number(expiringSoonQuoteCountRows[0]?.count ?? 0),
      inquiriesWithoutQuotes: Number(inquiryWithoutQuoteCountRows[0]?.count ?? 0),
      awaitingResponseQuotes: Number(awaitingResponseQuoteCountRows[0]?.count ?? 0),
      recentAcceptedQuotes: Number(recentAcceptedQuoteCountRows[0]?.count ?? 0),
    },
  };
}
