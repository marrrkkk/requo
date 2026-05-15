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

import type { InquiryStatus } from "@/features/inquiries/types";
import type {
  InquiryRecordState,
  InquiryRecordView,
} from "@/features/inquiries/types";

export const getEffectiveInquiryStatus = sql<InquiryStatus>`case
  when ${inquiries.status} in ('new', 'waiting', 'quoted') and ${inquiries.requestedDeadline} is not null and ${inquiries.requestedDeadline} < current_date then 'overdue'
  when ${inquiries.status} in ('new', 'waiting') and ${inquiries.submittedAt} >= now() - interval '48 hours' then 'new'
  when ${inquiries.status} in ('new', 'waiting') and ${inquiries.submittedAt} < now() - interval '48 hours' then 'waiting'
  else ${inquiries.status}::text
end`;

export const getInquiryRecordState = sql<InquiryRecordState>`case
  when ${inquiries.archivedAt} is not null then 'archived'
  else 'active'
end`;

import {
  getNormalizedInquiryFormConfig,
  getNormalizedInquirySubmittedFieldSnapshot,
} from "@/features/inquiries/form-config";
import { getNormalizedInquiryPageConfig } from "@/features/inquiries/page-config";
import {
  resolveInquiryFormConfigForPlan,
  resolveInquiryPageConfigForPlan,
} from "@/features/inquiries/plan-rules";
import { normalizeBusinessType } from "@/features/inquiries/business-types";
import { getBusinessPublicInquiryUrl } from "@/features/settings/utils";
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
  followUps,
  inquiries,
  inquiryAttachments,
  inquiryNotes,
  quotes,
  user,
  businessInquiryForms,
  businessMembers,
  businesses,
  } from "@/lib/db/schema";
import type {
  DashboardInquiryDetail,
  DashboardInquiryListItem,
  InquiryEditorForm,
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
      plan: businesses.plan,
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
    .innerJoin(
      businessInquiryForms,
      and(
        eq(businessInquiryForms.businessId, businesses.id),
        eq(businessInquiryForms.isDefault, true),
        isNull(businessInquiryForms.archivedAt),
      ),
    )
    .where(
      and(
        eq(businesses.slug, slug),
        isNull(businesses.deletedAt),
        isNull(businesses.deletedAt),
        includeDisabled
          ? undefined
          : and(isNull(businesses.archivedAt), isNull(businesses.lockedAt)),
      ),
    )
    .limit(1);

  if (!business || (!includeDisabled && !business.publicInquiryEnabled)) {
    return null;
  }

  const formBusinessType = normalizeBusinessType(business.formBusinessType);

  const inquiryFormConfig = getNormalizedInquiryFormConfig(
    business.inquiryFormConfig,
    {
      businessType: formBusinessType,
    },
  );
  const inquiryPageConfig = getNormalizedInquiryPageConfig(
    business.inquiryPageConfig,
    {
      businessName: business.name,
      businessShortDescription: business.shortDescription,
      legacyInquiryHeadline: business.inquiryHeadline,
      businessType: formBusinessType,
    },
  );

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
    inquiryFormConfig: resolveInquiryFormConfigForPlan(
      inquiryFormConfig,
      business.plan,
    ),
    inquiryPageConfig: resolveInquiryPageConfigForPlan(
      inquiryPageConfig,
      business.plan,
    ),
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
      plan: businesses.plan,
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
    .innerJoin(
      businessInquiryForms,
      and(
        eq(businessInquiryForms.businessId, businesses.id),
        eq(businessInquiryForms.slug, formSlug),
        isNull(businessInquiryForms.archivedAt),
      ),
    )
    .where(
      and(
        eq(businesses.slug, businessSlug),
        isNull(businesses.deletedAt),
        isNull(businesses.deletedAt),
        includeDisabled
          ? undefined
          : and(isNull(businesses.archivedAt), isNull(businesses.lockedAt)),
      ),
    )
    .limit(1);

  if (!business || (!includeDisabled && !business.publicInquiryEnabled)) {
    return null;
  }

  const formBusinessType = normalizeBusinessType(business.formBusinessType);

  const inquiryFormConfig = getNormalizedInquiryFormConfig(
    business.inquiryFormConfig,
    {
      businessType: formBusinessType,
    },
  );
  const inquiryPageConfig = getNormalizedInquiryPageConfig(
    business.inquiryPageConfig,
    {
      businessName: business.name,
      businessShortDescription: business.shortDescription,
      legacyInquiryHeadline: business.inquiryHeadline,
      businessType: formBusinessType,
    },
  );

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
    inquiryFormConfig: resolveInquiryFormConfigForPlan(
      inquiryFormConfig,
      business.plan,
    ),
    inquiryPageConfig: resolveInquiryPageConfigForPlan(
      inquiryPageConfig,
      business.plan,
    ),
  };
}

export async function getPublicBusinessLogoAssetBySlug(slug: string) {
  const [business] = await db
    .select({
      logoStoragePath: businesses.logoStoragePath,
      logoContentType: businesses.logoContentType,
    })
    .from(businesses)
    .where(
      and(
        eq(businesses.slug, slug),
        isNull(businesses.deletedAt),
        isNull(businesses.archivedAt),
        isNull(businesses.lockedAt),
        isNull(businesses.deletedAt),
      ),
    )
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

export function getOperationalInquiryCondition() {
  return isNull(inquiries.archivedAt);
}

function getInquiryViewCondition(view: InquiryRecordView) {
  switch (view) {
    case "archived":
      return isNotNull(inquiries.archivedAt);
    case "active":
    default:
      return isNull(inquiries.archivedAt);
  }
}

function getInquiryListConditions({
  businessId,
  filters,
}: GetInquiryListForBusinessInput) {
  const conditions = [
    eq(inquiries.businessId, businessId),
    getInquiryViewCondition(filters.view),
  ];

  if (filters.status !== "all") {
    conditions.push(
      sql`${getEffectiveInquiryStatus} = ${filters.status}`,
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
      recordState: getInquiryRecordState,
      subject: inquiries.subject,
      archivedAt: inquiries.archivedAt,
      pendingFollowUpCount: sql<number>`(
        select count(*)::int
        from ${followUps}
        where ${followUps.businessId} = ${inquiries.businessId}
          and ${followUps.inquiryId} = ${inquiries.id}
          and ${followUps.status} = 'pending'
      )`,
      nextFollowUpDueAt: sql<Date | null>`(
        select min(${followUps.dueAt})
        from ${followUps}
        where ${followUps.businessId} = ${inquiries.businessId}
          and ${followUps.inquiryId} = ${inquiries.id}
          and ${followUps.status} = 'pending'
      )`,
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
  customerEmail: string | null;
  customerContactMethod: string;
  customerContactHandle: string;
  serviceCategory: string;
  requestedDeadline: string | null;
  budgetText: string | null;
  subject: string | null;
  details: string;
  status: string;
  recordState: InquiryRecordState;
  archivedAt: Date | null;
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
      customerContactMethod: inquiries.customerContactMethod,
      customerContactHandle: inquiries.customerContactHandle,
      serviceCategory: inquiries.serviceCategory,
      requestedDeadline: inquiries.requestedDeadline,
      budgetText: inquiries.budgetText,
      subject: inquiries.subject,
      details: inquiries.details,
      status: getEffectiveInquiryStatus,
      recordState: getInquiryRecordState,
      archivedAt: inquiries.archivedAt,
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
      customerContactMethod: inquiries.customerContactMethod,
      customerContactHandle: inquiries.customerContactHandle,
      serviceCategory: inquiries.serviceCategory,
      requestedDeadline: inquiries.requestedDeadline,
      budgetText: inquiries.budgetText,
      subject: inquiries.subject,
      details: inquiries.details,
      source: inquiries.source,
      status: getEffectiveInquiryStatus,
      recordState: getInquiryRecordState,
      archivedAt: inquiries.archivedAt,
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
        .where(
          and(
            eq(quotes.businessId, businessId),
            eq(quotes.inquiryId, inquiryId),
            isNull(quotes.deletedAt),
          ),
        )
        .orderBy(desc(quotes.createdAt))
        .limit(1),
      db
        .select({
          count: count(),
        })
        .from(quotes)
        .where(
          and(
            eq(quotes.businessId, businessId),
            eq(quotes.inquiryId, inquiryId),
            isNull(quotes.deletedAt),
          ),
        ),
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

export async function getInquiryEditorFormsForBusiness(
  businessId: string,
): Promise<InquiryEditorForm[]> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessInquiryFormsCacheTags(businessId));

  const forms = await db
    .select({
      id: businessInquiryForms.id,
      name: businessInquiryForms.name,
      slug: businessInquiryForms.slug,
      businessType: businessInquiryForms.businessType,
      isDefault: businessInquiryForms.isDefault,
      publicInquiryEnabled: businessInquiryForms.publicInquiryEnabled,
      inquiryFormConfig: businessInquiryForms.inquiryFormConfig,
      plan: businesses.plan,
    })
    .from(businessInquiryForms)
    .innerJoin(businesses, eq(businessInquiryForms.businessId, businesses.id))
    .where(
      and(
        eq(businessInquiryForms.businessId, businessId),
        isNull(businessInquiryForms.archivedAt),
      ),
    )
    .orderBy(desc(businessInquiryForms.isDefault), asc(businessInquiryForms.name));

  return forms.map((form) => {
    const businessType = normalizeBusinessType(form.businessType);

    return {
      id: form.id,
      name: form.name,
      slug: form.slug,
      businessType,
      isDefault: form.isDefault,
      publicInquiryEnabled: form.publicInquiryEnabled,
      inquiryFormConfig: resolveInquiryFormConfigForPlan(
        getNormalizedInquiryFormConfig(form.inquiryFormConfig, {
          businessType,
        }),
        form.plan,
      ),
    } satisfies InquiryEditorForm;
  });
}

export async function getInquiryEditorFormForBusiness({
  businessId,
  formSlug,
}: {
  businessId: string;
  formSlug: string;
}): Promise<InquiryEditorForm | null> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(
    ...getBusinessInquiryFormsCacheTags(businessId),
    ...getBusinessInquiryFormCacheTags(businessId, formSlug),
  );

  const [form] = await db
    .select({
      id: businessInquiryForms.id,
      name: businessInquiryForms.name,
      slug: businessInquiryForms.slug,
      businessType: businessInquiryForms.businessType,
      isDefault: businessInquiryForms.isDefault,
      publicInquiryEnabled: businessInquiryForms.publicInquiryEnabled,
      inquiryFormConfig: businessInquiryForms.inquiryFormConfig,
      plan: businesses.plan,
    })
    .from(businessInquiryForms)
    .innerJoin(businesses, eq(businessInquiryForms.businessId, businesses.id))
    .where(
      and(
        eq(businessInquiryForms.businessId, businessId),
        eq(businessInquiryForms.slug, formSlug),
        isNull(businessInquiryForms.archivedAt),
      ),
    )
    .limit(1);

  if (!form) {
    return null;
  }

  const businessType = normalizeBusinessType(form.businessType);

  return {
    id: form.id,
    name: form.name,
    slug: form.slug,
    businessType,
    isDefault: form.isDefault,
    publicInquiryEnabled: form.publicInquiryEnabled,
    inquiryFormConfig: resolveInquiryFormConfigForPlan(
      getNormalizedInquiryFormConfig(form.inquiryFormConfig, {
        businessType,
      }),
      form.plan,
    ),
  } satisfies InquiryEditorForm;
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

export type PublicInquirySitemapEntry = {
  lastModified: Date;
  pathname: string;
};

/**
 * Indexable public inquiry URLs for sitemap.xml (mirrors public page visibility).
 */
export async function listPublicInquirySitemapEntries(): Promise<
  PublicInquirySitemapEntry[]
> {
  const rows = await db
    .select({
      businessSlug: businesses.slug,
      formIsDefault: businessInquiryForms.isDefault,
      formSlug: businessInquiryForms.slug,
      businessUpdatedAt: businesses.updatedAt,
      formUpdatedAt: businessInquiryForms.updatedAt,
    })
    .from(businesses)
    .innerJoin(
      businessInquiryForms,
      and(
        eq(businessInquiryForms.businessId, businesses.id),
        eq(businessInquiryForms.publicInquiryEnabled, true),
        isNull(businessInquiryForms.archivedAt),
      ),
    )
    .where(
      and(
        isNull(businesses.deletedAt),
        isNull(businesses.archivedAt),
        isNull(businesses.lockedAt),
      ),
    );

  return rows.map((row) => ({
    lastModified:
      row.formUpdatedAt.getTime() >= row.businessUpdatedAt.getTime()
        ? row.formUpdatedAt
        : row.businessUpdatedAt,
    pathname: getBusinessPublicInquiryUrl(
      row.businessSlug,
      row.formIsDefault ? undefined : row.formSlug,
    ),
  }));
}
