import "server-only";

import { and, asc, count, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import {
  getNormalizedInquiryFormConfig,
  getNormalizedInquirySubmittedFieldSnapshot,
} from "@/features/inquiries/form-config";
import { getNormalizedInquiryPageConfig } from "@/features/inquiries/page-config";
import {
  getWorkspaceInquiryDetailCacheTags,
  getWorkspaceInquiryFormCacheTags,
  getWorkspaceInquiryFormsCacheTags,
  getWorkspaceInquiryListCacheTags,
  hotWorkspaceCacheLife,
} from "@/lib/cache/workspace-tags";
import { db } from "@/lib/db/client";
import {
  activityLogs,
  inquiries,
  inquiryAttachments,
  inquiryNotes,
  quotes,
  user,
  workspaceInquiryForms,
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
      workspaceBusinessType: workspaces.businessType,
      shortDescription: workspaces.shortDescription,
      logoStoragePath: workspaces.logoStoragePath,
      updatedAt: workspaces.updatedAt,
      inquiryHeadline: workspaces.inquiryHeadline,
      formId: workspaceInquiryForms.id,
      formName: workspaceInquiryForms.name,
      formSlug: workspaceInquiryForms.slug,
      formBusinessType: workspaceInquiryForms.businessType,
      formIsDefault: workspaceInquiryForms.isDefault,
      publicInquiryEnabled: workspaceInquiryForms.publicInquiryEnabled,
      inquiryFormConfig: workspaceInquiryForms.inquiryFormConfig,
      inquiryPageConfig: workspaceInquiryForms.inquiryPageConfig,
    })
    .from(workspaces)
    .innerJoin(
      workspaceInquiryForms,
      and(
        eq(workspaceInquiryForms.workspaceId, workspaces.id),
        eq(workspaceInquiryForms.isDefault, true),
        isNull(workspaceInquiryForms.archivedAt),
      ),
    )
    .where(eq(workspaces.slug, slug))
    .limit(1);

  if (!workspace || !workspace.publicInquiryEnabled) {
    return null;
  }

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    businessType: workspace.formBusinessType,
    shortDescription: workspace.shortDescription,
    logoUrl: workspace.logoStoragePath
      ? `/api/public/workspaces/${workspace.slug}/logo?v=${workspace.updatedAt.getTime()}`
      : null,
    form: {
      id: workspace.formId,
      name: workspace.formName,
      slug: workspace.formSlug,
      businessType: workspace.formBusinessType,
      isDefault: workspace.formIsDefault,
      publicInquiryEnabled: workspace.publicInquiryEnabled,
    },
    inquiryFormConfig: getNormalizedInquiryFormConfig(workspace.inquiryFormConfig, {
      businessType: workspace.formBusinessType,
    }),
    inquiryPageConfig: getNormalizedInquiryPageConfig(workspace.inquiryPageConfig, {
      workspaceName: workspace.name,
      workspaceShortDescription: workspace.shortDescription,
      legacyInquiryHeadline: workspace.inquiryHeadline,
      businessType: workspace.formBusinessType,
    }),
  };
}

export async function getPublicInquiryWorkspaceByFormSlug({
  workspaceSlug,
  formSlug,
}: {
  workspaceSlug: string;
  formSlug: string;
}): Promise<PublicInquiryWorkspace | null> {
  return getInquiryWorkspaceByFormSlug({
    workspaceSlug,
    formSlug,
    includeDisabled: false,
  });
}

export async function getInquiryWorkspacePreviewByFormSlug({
  workspaceSlug,
  formSlug,
}: {
  workspaceSlug: string;
  formSlug: string;
}): Promise<PublicInquiryWorkspace | null> {
  return getCachedInquiryWorkspacePreviewByFormSlug({
    workspaceSlug,
    formSlug,
  });
}

async function getCachedInquiryWorkspacePreviewByFormSlug({
  workspaceSlug,
  formSlug,
}: {
  workspaceSlug: string;
  formSlug: string;
}): Promise<PublicInquiryWorkspace | null> {
  "use cache";

  cacheLife(hotWorkspaceCacheLife);

  const workspace = await getInquiryWorkspaceByFormSlug({
    workspaceSlug,
    formSlug,
    includeDisabled: true,
  });

  if (workspace) {
    cacheTag(...getWorkspaceInquiryFormCacheTags(workspace.id, workspace.form.slug));
  }

  return workspace;
}

async function getInquiryWorkspaceByFormSlug({
  workspaceSlug,
  formSlug,
  includeDisabled,
}: {
  workspaceSlug: string;
  formSlug: string;
  includeDisabled: boolean;
}): Promise<PublicInquiryWorkspace | null> {
  const [workspace] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      workspaceBusinessType: workspaces.businessType,
      shortDescription: workspaces.shortDescription,
      logoStoragePath: workspaces.logoStoragePath,
      updatedAt: workspaces.updatedAt,
      inquiryHeadline: workspaces.inquiryHeadline,
      formId: workspaceInquiryForms.id,
      formName: workspaceInquiryForms.name,
      formSlug: workspaceInquiryForms.slug,
      formBusinessType: workspaceInquiryForms.businessType,
      formIsDefault: workspaceInquiryForms.isDefault,
      publicInquiryEnabled: workspaceInquiryForms.publicInquiryEnabled,
      inquiryFormConfig: workspaceInquiryForms.inquiryFormConfig,
      inquiryPageConfig: workspaceInquiryForms.inquiryPageConfig,
    })
    .from(workspaces)
    .innerJoin(
      workspaceInquiryForms,
      and(
        eq(workspaceInquiryForms.workspaceId, workspaces.id),
        eq(workspaceInquiryForms.slug, formSlug),
        isNull(workspaceInquiryForms.archivedAt),
      ),
    )
    .where(eq(workspaces.slug, workspaceSlug))
    .limit(1);

  if (!workspace || (!includeDisabled && !workspace.publicInquiryEnabled)) {
    return null;
  }

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    businessType: workspace.formBusinessType,
    shortDescription: workspace.shortDescription,
    logoUrl: workspace.logoStoragePath
      ? `/api/public/workspaces/${workspace.slug}/logo?v=${workspace.updatedAt.getTime()}`
      : null,
    form: {
      id: workspace.formId,
      name: workspace.formName,
      slug: workspace.formSlug,
      businessType: workspace.formBusinessType,
      isDefault: workspace.formIsDefault,
      publicInquiryEnabled: workspace.publicInquiryEnabled,
    },
    inquiryFormConfig: getNormalizedInquiryFormConfig(workspace.inquiryFormConfig, {
      businessType: workspace.formBusinessType,
    }),
    inquiryPageConfig: getNormalizedInquiryPageConfig(workspace.inquiryPageConfig, {
      workspaceName: workspace.name,
      workspaceShortDescription: workspace.shortDescription,
      legacyInquiryHeadline: workspace.inquiryHeadline,
      businessType: workspace.formBusinessType,
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
  "use cache";

  cacheLife(hotWorkspaceCacheLife);
  cacheTag(...getWorkspaceInquiryListCacheTags(workspaceId));

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

  if (filters.form !== "all") {
    conditions.push(eq(workspaceInquiryForms.slug, filters.form));
  }

  return db
    .select({
      id: inquiries.id,
      workspaceInquiryFormId: inquiries.workspaceInquiryFormId,
      inquiryFormName: workspaceInquiryForms.name,
      inquiryFormSlug: workspaceInquiryForms.slug,
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
    .innerJoin(
      workspaceInquiryForms,
      eq(inquiries.workspaceInquiryFormId, workspaceInquiryForms.id),
    )
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
  "use cache";

  cacheLife(hotWorkspaceCacheLife);
  cacheTag(...getWorkspaceInquiryDetailCacheTags(workspaceId, inquiryId));

  const [inquiry] = await db
    .select({
      id: inquiries.id,
      workspaceId: inquiries.workspaceId,
      workspaceInquiryFormId: inquiries.workspaceInquiryFormId,
      inquiryFormName: workspaceInquiryForms.name,
      inquiryFormSlug: workspaceInquiryForms.slug,
      inquiryFormBusinessType: workspaceInquiryForms.businessType,
      customerName: inquiries.customerName,
      customerEmail: inquiries.customerEmail,
      customerPhone: inquiries.customerPhone,
      companyName: inquiries.companyName,
      serviceCategory: inquiries.serviceCategory,
      requestedDeadline: inquiries.requestedDeadline,
      budgetText: inquiries.budgetText,
      subject: inquiries.subject,
      details: inquiries.details,
      source: inquiries.source,
      status: inquiries.status,
      submittedAt: inquiries.submittedAt,
      createdAt: inquiries.createdAt,
      submittedFieldSnapshot: inquiries.submittedFieldSnapshot,
    })
    .from(inquiries)
    .innerJoin(
      workspaceInquiryForms,
      eq(inquiries.workspaceInquiryFormId, workspaceInquiryForms.id),
    )
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
    submittedFieldSnapshot: getNormalizedInquirySubmittedFieldSnapshot(
      inquiry.submittedFieldSnapshot,
    ),
    attachments,
    notes,
    activities,
    relatedQuote,
  };
}

export async function getWorkspaceInquiryFormOptionsForWorkspace(
  workspaceId: string,
) {
  "use cache";

  cacheLife(hotWorkspaceCacheLife);
  cacheTag(...getWorkspaceInquiryFormsCacheTags(workspaceId));

  return db
    .select({
      id: workspaceInquiryForms.id,
      name: workspaceInquiryForms.name,
      slug: workspaceInquiryForms.slug,
      isDefault: workspaceInquiryForms.isDefault,
    })
    .from(workspaceInquiryForms)
    .where(
      and(
        eq(workspaceInquiryForms.workspaceId, workspaceId),
        isNull(workspaceInquiryForms.archivedAt),
      ),
    )
    .orderBy(desc(workspaceInquiryForms.isDefault), asc(workspaceInquiryForms.name));
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
