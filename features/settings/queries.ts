import "server-only";

import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { getNormalizedInquiryFormConfig } from "@/features/inquiries/form-config";
import { getNormalizedInquiryPageConfig } from "@/features/inquiries/page-config";
import { normalizeBusinessType } from "@/features/inquiries/business-types";
import type {
  BusinessInquiryFormsSettingsView,
  BusinessInquiryFormEditorView,
  BusinessInquiryFormSettingsView,
  BusinessInquiryPageSettingsView,
  BusinessSettingsView,
} from "@/features/settings/types";
import {
  getBusinessInquiryFormCacheTags,
  getBusinessInquiryFormsCacheTags,
  getBusinessSettingsCacheTags,
  settingsBusinessCacheLife,
} from "@/lib/cache/business-tags";
import { db } from "@/lib/db/client";
import { inquiries, businessInquiryForms, businesses, workspaces } from "@/lib/db/schema";

export async function getBusinessSettingsForBusiness(
  businessId: string,
): Promise<BusinessSettingsView | null> {
  "use cache";

  cacheLife(settingsBusinessCacheLife);
  cacheTag(...getBusinessSettingsCacheTags(businessId));

  const [business] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      countryCode: businesses.countryCode,
      businessType: businesses.businessType,
      shortDescription: businesses.shortDescription,
      contactEmail: businesses.contactEmail,
      logoStoragePath: businesses.logoStoragePath,
      logoContentType: businesses.logoContentType,
      defaultEmailSignature: businesses.defaultEmailSignature,
      defaultQuoteNotes: businesses.defaultQuoteNotes,
      defaultQuoteValidityDays: businesses.defaultQuoteValidityDays,
      aiTonePreference: businesses.aiTonePreference,
      notifyOnNewInquiry: businesses.notifyOnNewInquiry,
      notifyOnQuoteSent: businesses.notifyOnQuoteSent,
      notifyOnQuoteResponse: businesses.notifyOnQuoteResponse,
      notifyInAppOnNewInquiry: businesses.notifyInAppOnNewInquiry,
      notifyInAppOnQuoteResponse: businesses.notifyInAppOnQuoteResponse,
      defaultCurrency: businesses.defaultCurrency,
      updatedAt: businesses.updatedAt,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  return business ?? null;
}

export async function getBusinessInquiryPageSettingsForBusiness(
  businessId: string,
  formSlug?: string,
): Promise<BusinessInquiryPageSettingsView | null> {
  "use cache";

  cacheLife(settingsBusinessCacheLife);
  cacheTag(
    ...(
      formSlug
        ? getBusinessInquiryFormCacheTags(businessId, formSlug)
        : getBusinessInquiryFormsCacheTags(businessId)
    ),
  );

  const [row] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      shortDescription: businesses.shortDescription,
      logoStoragePath: businesses.logoStoragePath,
      updatedAt: businesses.updatedAt,
      inquiryHeadline: businesses.inquiryHeadline,
      formId: businessInquiryForms.id,
      formName: businessInquiryForms.name,
      formSlug: businessInquiryForms.slug,
      businessType: businessInquiryForms.businessType,
      publicInquiryEnabled: businessInquiryForms.publicInquiryEnabled,
      isDefault: businessInquiryForms.isDefault,
      inquiryFormConfig: businessInquiryForms.inquiryFormConfig,
      inquiryPageConfig: businessInquiryForms.inquiryPageConfig,
    })
    .from(businesses)
    .innerJoin(
      businessInquiryForms,
      and(
        eq(businessInquiryForms.businessId, businesses.id),
        formSlug
          ? eq(businessInquiryForms.slug, formSlug)
          : eq(businessInquiryForms.isDefault, true),
        isNull(businessInquiryForms.archivedAt),
      ),
    )
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!row) {
    return null;
  }

  const businessType = normalizeBusinessType(row.businessType);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.shortDescription,
    logoStoragePath: row.logoStoragePath,
    formId: row.formId,
    formName: row.formName,
    formSlug: row.formSlug,
    businessType,
    publicInquiryEnabled: row.publicInquiryEnabled,
    isDefault: row.isDefault,
    inquiryFormConfig: getNormalizedInquiryFormConfig(row.inquiryFormConfig, {
      businessType,
    }),
    inquiryPageConfig: getNormalizedInquiryPageConfig(row.inquiryPageConfig, {
      businessName: row.name,
      businessShortDescription: row.shortDescription,
      legacyInquiryHeadline: row.inquiryHeadline,
      businessType,
    }),
    updatedAt: row.updatedAt,
  };
}

export async function getBusinessInquiryFormSettingsForBusiness(
  businessId: string,
  formSlug?: string,
): Promise<BusinessInquiryFormSettingsView | null> {
  "use cache";

  cacheLife(settingsBusinessCacheLife);
  cacheTag(
    ...(
      formSlug
        ? getBusinessInquiryFormCacheTags(businessId, formSlug)
        : getBusinessInquiryFormsCacheTags(businessId)
    ),
  );

  const [row] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      plan: workspaces.plan,
      updatedAt: businesses.updatedAt,
      inquiryHeadline: businesses.inquiryHeadline,
      shortDescription: businesses.shortDescription,
      formId: businessInquiryForms.id,
      formName: businessInquiryForms.name,
      formSlug: businessInquiryForms.slug,
      businessType: businessInquiryForms.businessType,
      publicInquiryEnabled: businessInquiryForms.publicInquiryEnabled,
      isDefault: businessInquiryForms.isDefault,
      inquiryFormConfig: businessInquiryForms.inquiryFormConfig,
      inquiryPageConfig: businessInquiryForms.inquiryPageConfig,
    })
    .from(businesses)
    .innerJoin(workspaces, eq(businesses.workspaceId, workspaces.id))
    .innerJoin(
      businessInquiryForms,
      and(
        eq(businessInquiryForms.businessId, businesses.id),
        formSlug
          ? eq(businessInquiryForms.slug, formSlug)
          : eq(businessInquiryForms.isDefault, true),
        isNull(businessInquiryForms.archivedAt),
      ),
    )
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!row) {
    return null;
  }

  const businessType = normalizeBusinessType(row.businessType);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    formId: row.formId,
    formName: row.formName,
    formSlug: row.formSlug,
    businessType,
    publicInquiryEnabled: row.publicInquiryEnabled,
    isDefault: row.isDefault,
    inquiryFormConfig: getNormalizedInquiryFormConfig(row.inquiryFormConfig, {
      businessType,
    }),
    inquiryPageConfig: getNormalizedInquiryPageConfig(row.inquiryPageConfig, {
      businessName: row.name,
      businessShortDescription: row.shortDescription,
      legacyInquiryHeadline: row.inquiryHeadline,
      businessType,
    }),
    updatedAt: row.updatedAt,
  };
}

export async function getBusinessInquiryFormsSettingsForBusiness(
  businessId: string,
): Promise<BusinessInquiryFormsSettingsView | null> {
  "use cache";

  cacheLife(settingsBusinessCacheLife);
  cacheTag(...getBusinessInquiryFormsCacheTags(businessId));

  const submittedInquiryCountSelection = sql<number>`(
    select count(*)::int
    from ${inquiries}
    where ${inquiries.businessInquiryFormId} = ${businessInquiryForms.id}
  )`;

  const [business, forms] = await Promise.all([
    db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
        businessType: businesses.businessType,
      })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1),
    db
      .select({
        id: businessInquiryForms.id,
        name: businessInquiryForms.name,
        slug: businessInquiryForms.slug,
        businessType: businessInquiryForms.businessType,
        isDefault: businessInquiryForms.isDefault,
        publicInquiryEnabled: businessInquiryForms.publicInquiryEnabled,
        archivedAt: businessInquiryForms.archivedAt,
        createdAt: businessInquiryForms.createdAt,
        updatedAt: businessInquiryForms.updatedAt,
        submittedInquiryCount: submittedInquiryCountSelection,
        inquiryFormConfig: businessInquiryForms.inquiryFormConfig,
        inquiryPageConfig: businessInquiryForms.inquiryPageConfig,
      })
      .from(businessInquiryForms)
      .where(eq(businessInquiryForms.businessId, businessId))
      .orderBy(
        desc(businessInquiryForms.isDefault),
        asc(businessInquiryForms.archivedAt),
        asc(businessInquiryForms.name),
      ),
  ]);

  const businessRow = business[0];

  if (!businessRow) {
    return null;
  }

  const businessType = normalizeBusinessType(businessRow.businessType);

  return {
    id: businessRow.id,
    name: businessRow.name,
    slug: businessRow.slug,
    businessType,
    forms: forms.map((form) => {
      const formBusinessType = normalizeBusinessType(form.businessType);

      return {
        id: form.id,
        name: form.name,
        slug: form.slug,
        businessType: formBusinessType,
        isDefault: form.isDefault,
        publicInquiryEnabled: form.publicInquiryEnabled,
        archivedAt: form.archivedAt,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
        submittedInquiryCount: form.submittedInquiryCount,
        inquiryFormConfig: getNormalizedInquiryFormConfig(form.inquiryFormConfig, {
          businessType: formBusinessType,
        }),
        inquiryPageConfig: getNormalizedInquiryPageConfig(form.inquiryPageConfig, {
          businessName: businessRow.name,
          businessType: formBusinessType,
        }),
      };
    }),
  };
}

export async function getBusinessInquiryFormEditorForBusiness(
  businessId: string,
  formSlug: string,
): Promise<BusinessInquiryFormEditorView | null> {
  "use cache";

  cacheLife(settingsBusinessCacheLife);
  cacheTag(...getBusinessInquiryFormCacheTags(businessId, formSlug));

  const [row, activeFormRows, inquiryRows] = await Promise.all([
    db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
        plan: workspaces.plan,
        shortDescription: businesses.shortDescription,
        logoStoragePath: businesses.logoStoragePath,
        updatedAt: businesses.updatedAt,
        inquiryHeadline: businesses.inquiryHeadline,
        formId: businessInquiryForms.id,
        formName: businessInquiryForms.name,
        formSlug: businessInquiryForms.slug,
        businessType: businessInquiryForms.businessType,
        publicInquiryEnabled: businessInquiryForms.publicInquiryEnabled,
        isDefault: businessInquiryForms.isDefault,
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
      .where(eq(businesses.id, businessId))
      .limit(1),
    db
      .select({
        id: businessInquiryForms.id,
      })
      .from(businessInquiryForms)
      .where(
        and(
          eq(businessInquiryForms.businessId, businessId),
          isNull(businessInquiryForms.archivedAt),
        ),
      ),
    db
      .select({
        id: inquiries.id,
      })
      .from(inquiries)
      .innerJoin(
        businessInquiryForms,
        eq(inquiries.businessInquiryFormId, businessInquiryForms.id),
      )
      .where(
        and(
          eq(businessInquiryForms.businessId, businessId),
          eq(businessInquiryForms.slug, formSlug),
        ),
      ),
  ]);

  const businessRow = row[0];

  if (!businessRow) {
    return null;
  }

  const businessType = normalizeBusinessType(businessRow.businessType);

  return {
    id: businessRow.id,
    name: businessRow.name,
    slug: businessRow.slug,
    plan: businessRow.plan,
    shortDescription: businessRow.shortDescription,
    logoStoragePath: businessRow.logoStoragePath,
    formId: businessRow.formId,
    formName: businessRow.formName,
    formSlug: businessRow.formSlug,
    businessType,
    publicInquiryEnabled: businessRow.publicInquiryEnabled,
    isDefault: businessRow.isDefault,
    inquiryFormConfig: getNormalizedInquiryFormConfig(businessRow.inquiryFormConfig, {
      businessType,
    }),
    inquiryPageConfig: getNormalizedInquiryPageConfig(businessRow.inquiryPageConfig, {
      businessName: businessRow.name,
      businessShortDescription: businessRow.shortDescription,
      legacyInquiryHeadline: businessRow.inquiryHeadline,
      businessType,
    }),
    updatedAt: businessRow.updatedAt,
    activeFormCount: activeFormRows.length,
    submittedInquiryCount: inquiryRows.length,
  };
}

export async function getDefaultBusinessInquiryFormForBusiness(
  businessId: string,
) {
  "use cache";

  cacheLife(settingsBusinessCacheLife);
  cacheTag(...getBusinessInquiryFormsCacheTags(businessId));

  const [form] = await db
    .select({
      id: businessInquiryForms.id,
      slug: businessInquiryForms.slug,
    })
    .from(businessInquiryForms)
    .where(
      and(
        eq(businessInquiryForms.businessId, businessId),
        eq(businessInquiryForms.isDefault, true),
        isNull(businessInquiryForms.archivedAt),
      ),
    )
    .limit(1);

  return form ?? null;
}

export async function getBusinessLogoAssetForBusiness(businessId: string) {
  "use cache";

  cacheLife(settingsBusinessCacheLife);
  cacheTag(...getBusinessSettingsCacheTags(businessId));

  const [business] = await db
    .select({
      logoStoragePath: businesses.logoStoragePath,
      logoContentType: businesses.logoContentType,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  return business ?? null;
}
