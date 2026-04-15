import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import type { InquiryStatus } from "@/features/inquiries/types";

export const getEffectiveInquiryStatus = sql<InquiryStatus>`case
  when ${inquiries.status} in ('new', 'waiting', 'quoted') and ${inquiries.requestedDeadline} is not null and ${inquiries.requestedDeadline} < current_date then 'overdue'::inquiry_status
  when ${inquiries.status} in ('new', 'waiting') and ${inquiries.submittedAt} >= now() - interval '48 hours' then 'new'::inquiry_status
  when ${inquiries.status} in ('new', 'waiting') and ${inquiries.submittedAt} < now() - interval '48 hours' then 'waiting'::inquiry_status
  else ${inquiries.status}
end`;

import {
  getNormalizedInquiryFormConfig,
  getNormalizedInquirySubmittedFieldSnapshot,
} from "@/features/inquiries/form-config";
import { getNormalizedInquiryPageConfig } from "@/features/inquiries/page-config";
import { normalizeBusinessType } from "@/features/inquiries/business-types";
import {
  getBusinessInquiryDetailCacheTags,
  getBusinessInquiryFormCacheTags,
  getBusinessInquiryFormsCacheTags,
  getBusinessInquiryListCacheTags,
  hotBusinessCacheLife,
} from "@/lib/cache/business-tags";
import { db } from "@/lib/db/client";
import {
  activityLogs,
  inquiries,
  inquiryAttachments,
  inquiryNotes,
  quotes,
  user,
  businessInquiryForms,
  businessMembers,
  businesses,
  workspaces,
} from "@/lib/db/schema";
import type {
  DashboardInquiryDetail,
  DashboardInquiryListItem,
  InquiryListQueryFilters,
  PublicInquiryBusiness,
} from "@/features/inquiries/types";

export async function getPublicInquiryBusinessBySlug(
  slug: string,
): Promise<PublicInquiryBusiness | null> {
  return getCachedPublicInquiryBusinessBySlug(slug);
}

async function getCachedPublicInquiryBusinessBySlug(
  slug: string,
): Promise<PublicInquiryBusiness | null> {
  "use cache";

  cacheLife(hotBusinessCacheLife);

  const business = await getInquiryBusinessBySlug({
    slug,
    includeDisabled: false,
  });

  if (business) {
    cacheTag(
      ...getBusinessInquiryFormsCacheTags(business.id),
      ...getBusinessInquiryFormCacheTags(business.id, business.form.slug),
    );
  }

  return business;
}

async function getInquiryBusinessBySlug({
  slug,
  includeDisabled,
}: {
  slug: string;
  includeDisabled: boolean;
}): Promise<PublicInquiryBusiness | null> {
  const [business] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      plan: workspaces.plan,
      businessType: businesses.businessType,
      shortDescription: businesses.shortDescription,
      logoStoragePath: businesses.logoStoragePath,
      updatedAt: businesses.updatedAt,
      inquiryHeadline: businesses.inquiryHeadline,
      formId: businessInquiryForms.id,
      formName: businessInquiryForms.name,
      formSlug: businessInquiryForms.slug,
      formBusinessType: businessInquiryForms.businessType,
      formIsDefault: businessInquiryForms.isDefault,
      publicInquiryEnabled: businessInquiryForms.publicInquiryEnabled,
      inquiryFormConfig: businessInquiryForms.inquiryFormConfig,
      inquiryPageConfig: businessInquiryForms.inquiryPageConfig,
    })
    .from(businesses)
    .innerJoin(workspaces, eq(businesses.workspaceId, workspaces.id))
    .innerJoin(
      businessInquiryForms,
      and(
        eq(businessInquiryForms.businessId, businesses.id),
        eq(businessInquiryForms.isDefault, true),
        isNull(businessInquiryForms.archivedAt),
      ),
    )
    .where(eq(businesses.slug, slug))
    .limit(1);

  if (!business || (!includeDisabled && !business.publicInquiryEnabled)) {
    return null;
  }

  const formBusinessType = normalizeBusinessType(business.formBusinessType);

  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    plan: business.plan,
    businessType: formBusinessType,
    shortDescription: business.shortDescription,
    logoUrl: business.logoStoragePath
      ? `/api/public/businesses/${business.slug}/logo?v=${business.updatedAt.getTime()}`
      : null,
    form: {
      id: business.formId,
      name: business.formName,
      slug: business.formSlug,
      businessType: formBusinessType,
      isDefault: business.formIsDefault,
      publicInquiryEnabled: business.publicInquiryEnabled,
    },
    inquiryFormConfig: getNormalizedInquiryFormConfig(business.inquiryFormConfig, {
      businessType: formBusinessType,
    }),
    inquiryPageConfig: getNormalizedInquiryPageConfig(business.inquiryPageConfig, {
      businessName: business.name,
      businessShortDescription: business.shortDescription,
      legacyInquiryHeadline: business.inquiryHeadline,
      businessType: formBusinessType,
    }),
  };
}

export async function getPublicInquiryBusinessByFormSlug({
  businessSlug,
  formSlug,
}: {
  businessSlug: string;
  formSlug: string;
}): Promise<PublicInquiryBusiness | null> {
  return getCachedPublicInquiryBusinessByFormSlug({
    businessSlug,
    formSlug,
  });
}

async function getCachedPublicInquiryBusinessByFormSlug({
  businessSlug,
  formSlug,
}: {
  businessSlug: string;
  formSlug: string;
}): Promise<PublicInquiryBusiness | null> {
  "use cache";

  cacheLife(hotBusinessCacheLife);

  const business = await getInquiryBusinessByFormSlug({
    businessSlug,
    formSlug,
    includeDisabled: false,
  });

  if (business) {
    cacheTag(
      ...getBusinessInquiryFormsCacheTags(business.id),
      ...getBusinessInquiryFormCacheTags(business.id, business.form.slug),
    );
  }

  return business;
}

export async function getInquiryBusinessPreviewByFormSlug({
  businessSlug,
  formSlug,
}: {
  businessSlug: string;
  formSlug: string;
}): Promise<PublicInquiryBusiness | null> {
  return getCachedInquiryBusinessPreviewByFormSlug({
    businessSlug,
    formSlug,
  });
}

async function getCachedInquiryBusinessPreviewByFormSlug({
  businessSlug,
  formSlug,
}: {
  businessSlug: string;
  formSlug: string;
}): Promise<PublicInquiryBusiness | null> {
  "use cache";

  cacheLife(hotBusinessCacheLife);

  const business = await getInquiryBusinessByFormSlug({
    businessSlug,
    formSlug,
    includeDisabled: true,
  });

  if (business) {
    cacheTag(
      ...getBusinessInquiryFormsCacheTags(business.id),
      ...getBusinessInquiryFormCacheTags(business.id, business.form.slug),
    );
  }

  return business;
}

async function getInquiryBusinessByFormSlug({
  businessSlug,
  formSlug,
  includeDisabled,
}: {
  businessSlug: string;
  formSlug: string;
  includeDisabled: boolean;
}): Promise<PublicInquiryBusiness | null> {
  const [business] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      plan: workspaces.plan,
      businessType: businesses.businessType,
      shortDescription: businesses.shortDescription,
      logoStoragePath: businesses.logoStoragePath,
      updatedAt: businesses.updatedAt,
      inquiryHeadline: businesses.inquiryHeadline,
      formId: businessInquiryForms.id,
      formName: businessInquiryForms.name,
      formSlug: businessInquiryForms.slug,
      formBusinessType: businessInquiryForms.businessType,
      formIsDefault: businessInquiryForms.isDefault,
      publicInquiryEnabled: businessInquiryForms.publicInquiryEnabled,
      inquiryFormConfig: businessInquiryForms.inquiryFormConfig,
      inquiryPageConfig: businessInquiryForms.inquiryPageConfig,
    })
    .from(businesses)
    .innerJoin(workspaces, eq(businesses.workspaceId, workspaces.id))
    .innerJoin(
      businessInquiryForms,
      and(
        eq(businessInquiryForms.businessId, businesses.id),
        eq(businessInquiryForms.slug, formSlug),
        isNull(businessInquiryForms.archivedAt),
      ),
    )
    .where(eq(businesses.slug, businessSlug))
    .limit(1);

  if (!business || (!includeDisabled && !business.publicInquiryEnabled)) {
    return null;
  }

  const formBusinessType = normalizeBusinessType(business.formBusinessType);

  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    plan: business.plan,
    businessType: formBusinessType,
    shortDescription: business.shortDescription,
    logoUrl: business.logoStoragePath
      ? `/api/public/businesses/${business.slug}/logo?v=${business.updatedAt.getTime()}`
      : null,
    form: {
      id: business.formId,
      name: business.formName,
      slug: business.formSlug,
      businessType: formBusinessType,
      isDefault: business.formIsDefault,
      publicInquiryEnabled: business.publicInquiryEnabled,
    },
    inquiryFormConfig: getNormalizedInquiryFormConfig(business.inquiryFormConfig, {
      businessType: formBusinessType,
    }),
    inquiryPageConfig: getNormalizedInquiryPageConfig(business.inquiryPageConfig, {
      businessName: business.name,
      businessShortDescription: business.shortDescription,
      legacyInquiryHeadline: business.inquiryHeadline,
      businessType: formBusinessType,
    }),
  };
}

export async function getPublicBusinessLogoAssetBySlug(slug: string) {
  const [business] = await db
    .select({
      logoStoragePath: businesses.logoStoragePath,
      logoContentType: businesses.logoContentType,
    })
    .from(businesses)
    .where(eq(businesses.slug, slug))
    .limit(1);

  return business ?? null;
}

export async function getBusinessOwnerNotificationEmails(businessId: string) {
  const rows = await db
    .select({
      email: user.email,
    })
    .from(businessMembers)
    .innerJoin(user, eq(businessMembers.userId, user.id))
    .where(
      and(
        eq(businessMembers.businessId, businessId),
        eq(businessMembers.role, "owner"),
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

type GetInquiryListForBusinessInput = {
  businessId: string;
  filters: InquiryListQueryFilters;
};

function getInquiryListConditions({
  businessId,
  filters,
}: GetInquiryListForBusinessInput) {
  const conditions = [eq(inquiries.businessId, businessId)];

  if (filters.status !== "all") {
    conditions.push(
      sql`${getEffectiveInquiryStatus} = ${filters.status}::inquiry_status`,
    );
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
    conditions.push(eq(businessInquiryForms.slug, filters.form));
  }

  return conditions;
}

export async function getInquiryListCountForBusiness({
  businessId,
  filters,
}: GetInquiryListForBusinessInput): Promise<number> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessInquiryListCacheTags(businessId));

  const conditions = getInquiryListConditions({
    businessId,
    filters,
  });

  const rows = await db
    .select({
      count: count(),
    })
    .from(inquiries)
    .innerJoin(
      businessInquiryForms,
      eq(inquiries.businessInquiryFormId, businessInquiryForms.id),
    )
    .where(and(...conditions));

  return Number(rows[0]?.count ?? 0);
}

type GetInquiryListPageForBusinessInput = GetInquiryListForBusinessInput & {
  page: number;
  pageSize: number;
};

export async function getInquiryListPageForBusiness({
  businessId,
  filters,
  page,
  pageSize,
}: GetInquiryListPageForBusinessInput): Promise<DashboardInquiryListItem[]> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessInquiryListCacheTags(businessId));

  const conditions = getInquiryListConditions({
    businessId,
    filters,
  });

  const submittedAtSort = filters.sort === "oldest" ? asc : desc;
  const createdAtSort = filters.sort === "oldest" ? asc : desc;
  const offset = Math.max(0, (page - 1) * pageSize);

  return db
    .select({
      id: inquiries.id,
      businessInquiryFormId: inquiries.businessInquiryFormId,
      inquiryFormName: businessInquiryForms.name,
      inquiryFormSlug: businessInquiryForms.slug,
      customerName: inquiries.customerName,
      customerEmail: inquiries.customerEmail,
      serviceCategory: inquiries.serviceCategory,
      budgetText: inquiries.budgetText,
      status: getEffectiveInquiryStatus,
      subject: inquiries.subject,
      submittedAt: inquiries.submittedAt,
      createdAt: inquiries.createdAt,
    })
    .from(inquiries)
    .innerJoin(
      businessInquiryForms,
      eq(inquiries.businessInquiryFormId, businessInquiryForms.id),
    )
    .where(and(...conditions))
    .orderBy(submittedAtSort(inquiries.submittedAt), createdAtSort(inquiries.createdAt))
    .limit(pageSize)
    .offset(offset);
}

type InquiryExportRow = {
  id: string;
  inquiryFormName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  companyName: string | null;
  serviceCategory: string;
  requestedDeadline: string | null;
  budgetText: string | null;
  subject: string | null;
  details: string;
  status: string;
  submittedAt: Date;
};

export async function getInquiryExportRowsForBusiness({
  businessId,
  filters,
  from,
  to,
}: GetInquiryListForBusinessInput & {
  from?: string;
  to?: string;
}): Promise<InquiryExportRow[]> {
  const conditions = getInquiryListConditions({
    businessId,
    filters,
  });
  if (from) {
    conditions.push(gte(inquiries.submittedAt, new Date(`${from}T00:00:00.000Z`)));
  }
  if (to) {
    conditions.push(lte(inquiries.submittedAt, new Date(`${to}T23:59:59.999Z`)));
  }
  const submittedAtSort = filters.sort === "oldest" ? asc : desc;
  const createdAtSort = filters.sort === "oldest" ? asc : desc;

  return db
    .select({
      id: inquiries.id,
      inquiryFormName: businessInquiryForms.name,
      customerName: inquiries.customerName,
      customerEmail: inquiries.customerEmail,
      customerPhone: inquiries.customerPhone,
      companyName: inquiries.companyName,
      serviceCategory: inquiries.serviceCategory,
      requestedDeadline: inquiries.requestedDeadline,
      budgetText: inquiries.budgetText,
      subject: inquiries.subject,
      details: inquiries.details,
      status: getEffectiveInquiryStatus,
      submittedAt: inquiries.submittedAt,
    })
    .from(inquiries)
    .innerJoin(
      businessInquiryForms,
      eq(inquiries.businessInquiryFormId, businessInquiryForms.id),
    )
    .where(and(...conditions))
    .orderBy(submittedAtSort(inquiries.submittedAt), createdAtSort(inquiries.createdAt));
}

type GetInquiryDetailForBusinessInput = {
  businessId: string;
  inquiryId: string;
};

export async function getInquiryDetailForBusiness({
  businessId,
  inquiryId,
}: GetInquiryDetailForBusinessInput): Promise<DashboardInquiryDetail | null> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessInquiryDetailCacheTags(businessId, inquiryId));

  const [inquiry] = await db
    .select({
      id: inquiries.id,
      businessId: inquiries.businessId,
      businessInquiryFormId: inquiries.businessInquiryFormId,
      inquiryFormName: businessInquiryForms.name,
      inquiryFormSlug: businessInquiryForms.slug,
      inquiryFormBusinessType: businessInquiryForms.businessType,
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
      businessInquiryForms,
      eq(inquiries.businessInquiryFormId, businessInquiryForms.id),
    )
    .where(and(eq(inquiries.id, inquiryId), eq(inquiries.businessId, businessId)))
    .limit(1);

  if (!inquiry) {
    return null;
  }

  const inquiryFormBusinessType = normalizeBusinessType(
    inquiry.inquiryFormBusinessType,
  );

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
            eq(inquiryAttachments.businessId, businessId),
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
            eq(inquiryNotes.businessId, businessId),
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
            eq(activityLogs.businessId, businessId),
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
        .where(and(eq(quotes.businessId, businessId), eq(quotes.inquiryId, inquiryId)))
        .orderBy(desc(quotes.createdAt))
        .limit(1),
      db
        .select({
          count: count(),
        })
        .from(quotes)
        .where(and(eq(quotes.businessId, businessId), eq(quotes.inquiryId, inquiryId))),
    ]);

  const relatedQuote = relatedQuoteRows[0]
    ? {
        ...relatedQuoteRows[0],
        quoteCount: Number(quoteCountRows[0]?.count ?? 1),
      }
    : null;

  return {
    ...inquiry,
    inquiryFormBusinessType,
    submittedFieldSnapshot: getNormalizedInquirySubmittedFieldSnapshot(
      inquiry.submittedFieldSnapshot,
    ),
    attachments,
    notes,
    activities,
    relatedQuote,
  };
}

export async function getBusinessInquiryFormOptionsForBusiness(
  businessId: string,
) {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessInquiryFormsCacheTags(businessId));

  return db
    .select({
      id: businessInquiryForms.id,
      name: businessInquiryForms.name,
      slug: businessInquiryForms.slug,
      isDefault: businessInquiryForms.isDefault,
      archivedAt: businessInquiryForms.archivedAt,
    })
    .from(businessInquiryForms)
    .where(eq(businessInquiryForms.businessId, businessId))
    .orderBy(desc(businessInquiryForms.isDefault), asc(businessInquiryForms.name));
}

type GetInquiryAttachmentForBusinessInput = {
  businessId: string;
  inquiryId: string;
  attachmentId: string;
};

export async function getInquiryAttachmentForBusiness({
  businessId,
  inquiryId,
  attachmentId,
}: GetInquiryAttachmentForBusinessInput) {
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
        eq(inquiryAttachments.businessId, inquiries.businessId),
      ),
    )
    .where(
      and(
        eq(inquiryAttachments.id, attachmentId),
        eq(inquiryAttachments.inquiryId, inquiryId),
        eq(inquiryAttachments.businessId, businessId),
        eq(inquiries.id, inquiryId),
        eq(inquiries.businessId, businessId),
      ),
    )
    .limit(1);

  return attachment ?? null;
}
