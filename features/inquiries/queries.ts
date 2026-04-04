import "server-only";

import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";

import { getNormalizedInquiryPageConfig } from "@/features/inquiries/page-config";
import { db } from "@/lib/db/client";
import {
  activityLogs,
  inquiries,
  inquiryAttachments,
  inquiryNotes,
  quotes,
  user,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";
import type {
  DashboardInquiryDetail,
  DashboardInquiryListItem,
  InquiryListFilters,
  PublicInquiryWorkspace,
} from "@/features/inquiries/types";

export async function getPublicInquiryWorkspaceBySlug(
  slug: string,
): Promise<PublicInquiryWorkspace | null> {
  const [workspace] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      shortDescription: workspaces.shortDescription,
      logoStoragePath: workspaces.logoStoragePath,
      updatedAt: workspaces.updatedAt,
      inquiryHeadline: workspaces.inquiryHeadline,
      inquiryPageConfig: workspaces.inquiryPageConfig,
      publicInquiryEnabled: workspaces.publicInquiryEnabled,
    })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);

  if (!workspace || !workspace.publicInquiryEnabled) {
    return null;
  }

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    shortDescription: workspace.shortDescription,
    logoUrl: workspace.logoStoragePath
      ? `/api/public/workspaces/${workspace.slug}/logo?v=${workspace.updatedAt.getTime()}`
      : null,
    inquiryPageConfig: getNormalizedInquiryPageConfig(workspace.inquiryPageConfig, {
      workspaceName: workspace.name,
      workspaceShortDescription: workspace.shortDescription,
      legacyInquiryHeadline: workspace.inquiryHeadline,
    }),
  };
}

export async function getPublicWorkspaceLogoAssetBySlug(slug: string) {
  const [workspace] = await db
    .select({
      logoStoragePath: workspaces.logoStoragePath,
      logoContentType: workspaces.logoContentType,
    })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);

  return workspace ?? null;
}

export async function getWorkspaceOwnerNotificationEmails(workspaceId: string) {
  const rows = await db
    .select({
      email: user.email,
    })
    .from(workspaceMembers)
    .innerJoin(user, eq(workspaceMembers.userId, user.id))
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.role, "owner"),
      ),
    )
    .orderBy(asc(user.email));

  const dedupedEmails = new Map<string, string>();

  for (const row of rows) {
    const email = row.email.trim();

    if (!email) {
      continue;
    }

    const key = email.toLowerCase();

    if (!dedupedEmails.has(key)) {
      dedupedEmails.set(key, email);
    }
  }

  return Array.from(dedupedEmails.values());
}

type GetInquiryListForWorkspaceInput = {
  workspaceId: string;
  filters: InquiryListFilters;
};

export async function getInquiryListForWorkspace({
  workspaceId,
  filters,
}: GetInquiryListForWorkspaceInput): Promise<DashboardInquiryListItem[]> {
  const conditions = [eq(inquiries.workspaceId, workspaceId)];

  if (filters.status !== "all") {
    conditions.push(eq(inquiries.status, filters.status));
  }

  if (filters.q) {
    const pattern = `%${filters.q}%`;

    conditions.push(
      or(
        ilike(inquiries.customerName, pattern),
        ilike(inquiries.customerEmail, pattern),
        ilike(inquiries.serviceCategory, pattern),
        ilike(inquiries.subject, pattern),
      )!,
    );
  }

  return db
    .select({
      id: inquiries.id,
      customerName: inquiries.customerName,
      customerEmail: inquiries.customerEmail,
      serviceCategory: inquiries.serviceCategory,
      budgetText: inquiries.budgetText,
      status: inquiries.status,
      subject: inquiries.subject,
      submittedAt: inquiries.submittedAt,
      createdAt: inquiries.createdAt,
    })
    .from(inquiries)
    .where(and(...conditions))
    .orderBy(desc(inquiries.submittedAt), desc(inquiries.createdAt));
}

type GetInquiryDetailForWorkspaceInput = {
  workspaceId: string;
  inquiryId: string;
};

export async function getInquiryDetailForWorkspace({
  workspaceId,
  inquiryId,
}: GetInquiryDetailForWorkspaceInput): Promise<DashboardInquiryDetail | null> {
  const [inquiry] = await db
    .select({
      id: inquiries.id,
      workspaceId: inquiries.workspaceId,
      customerName: inquiries.customerName,
      customerEmail: inquiries.customerEmail,
      customerPhone: inquiries.customerPhone,
      serviceCategory: inquiries.serviceCategory,
      requestedDeadline: inquiries.requestedDeadline,
      budgetText: inquiries.budgetText,
      subject: inquiries.subject,
      details: inquiries.details,
      source: inquiries.source,
      status: inquiries.status,
      submittedAt: inquiries.submittedAt,
      createdAt: inquiries.createdAt,
    })
    .from(inquiries)
    .where(and(eq(inquiries.id, inquiryId), eq(inquiries.workspaceId, workspaceId)))
    .limit(1);

  if (!inquiry) {
    return null;
  }

  const [attachments, notes, activities, relatedQuoteRows, quoteCountRows] =
    await Promise.all([
      db
        .select({
          id: inquiryAttachments.id,
          fileName: inquiryAttachments.fileName,
          contentType: inquiryAttachments.contentType,
          fileSize: inquiryAttachments.fileSize,
          createdAt: inquiryAttachments.createdAt,
        })
        .from(inquiryAttachments)
        .where(
          and(
            eq(inquiryAttachments.workspaceId, workspaceId),
            eq(inquiryAttachments.inquiryId, inquiryId),
          ),
        )
        .orderBy(desc(inquiryAttachments.createdAt)),
      db
        .select({
          id: inquiryNotes.id,
          body: inquiryNotes.body,
          createdAt: inquiryNotes.createdAt,
          authorName: user.name,
          authorEmail: user.email,
        })
        .from(inquiryNotes)
        .leftJoin(user, eq(inquiryNotes.authorUserId, user.id))
        .where(
          and(
            eq(inquiryNotes.workspaceId, workspaceId),
            eq(inquiryNotes.inquiryId, inquiryId),
          ),
        )
        .orderBy(desc(inquiryNotes.createdAt)),
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
            eq(activityLogs.inquiryId, inquiryId),
          ),
        )
        .orderBy(desc(activityLogs.createdAt)),
      db
        .select({
          id: quotes.id,
          status: quotes.status,
          quoteNumber: quotes.quoteNumber,
          totalInCents: quotes.totalInCents,
          createdAt: quotes.createdAt,
        })
        .from(quotes)
        .where(and(eq(quotes.workspaceId, workspaceId), eq(quotes.inquiryId, inquiryId)))
        .orderBy(desc(quotes.createdAt))
        .limit(1),
      db
        .select({
          count: count(),
        })
        .from(quotes)
        .where(and(eq(quotes.workspaceId, workspaceId), eq(quotes.inquiryId, inquiryId))),
    ]);

  const relatedQuote = relatedQuoteRows[0]
    ? {
        ...relatedQuoteRows[0],
        quoteCount: Number(quoteCountRows[0]?.count ?? 1),
      }
    : null;

  return {
    ...inquiry,
    attachments,
    notes,
    activities,
    relatedQuote,
  };
}

type GetInquiryAttachmentForWorkspaceInput = {
  workspaceId: string;
  inquiryId: string;
  attachmentId: string;
};

export async function getInquiryAttachmentForWorkspace({
  workspaceId,
  inquiryId,
  attachmentId,
}: GetInquiryAttachmentForWorkspaceInput) {
  const [attachment] = await db
    .select({
      id: inquiryAttachments.id,
      fileName: inquiryAttachments.fileName,
      storagePath: inquiryAttachments.storagePath,
      contentType: inquiryAttachments.contentType,
    })
    .from(inquiryAttachments)
    .innerJoin(
      inquiries,
      and(
        eq(inquiryAttachments.inquiryId, inquiries.id),
        eq(inquiryAttachments.workspaceId, inquiries.workspaceId),
      ),
    )
    .where(
      and(
        eq(inquiryAttachments.id, attachmentId),
        eq(inquiryAttachments.inquiryId, inquiryId),
        eq(inquiryAttachments.workspaceId, workspaceId),
        eq(inquiries.id, inquiryId),
        eq(inquiries.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  return attachment ?? null;
}
