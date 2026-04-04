import "server-only";

import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { getNormalizedInquiryFormConfig } from "@/features/inquiries/form-config";
import { getNormalizedInquiryPageConfig } from "@/features/inquiries/page-config";
import type {
  WorkspaceInquiryFormsSettingsView,
  WorkspaceInquiryFormEditorView,
  WorkspaceInquiryFormSettingsView,
  WorkspaceInquiryPageSettingsView,
  WorkspaceSettingsView,
} from "@/features/settings/types";
import {
  getWorkspaceInquiryFormCacheTags,
  getWorkspaceInquiryFormsCacheTags,
  getWorkspaceSettingsCacheTags,
  settingsWorkspaceCacheLife,
} from "@/lib/cache/workspace-tags";
import { db } from "@/lib/db/client";
import { inquiries, workspaceInquiryForms, workspaces } from "@/lib/db/schema";

export async function getWorkspaceSettingsForWorkspace(
  workspaceId: string,
): Promise<WorkspaceSettingsView | null> {
  "use cache";

  cacheLife(settingsWorkspaceCacheLife);
  cacheTag(...getWorkspaceSettingsCacheTags(workspaceId));

  const [workspace] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      businessType: workspaces.businessType,
      shortDescription: workspaces.shortDescription,
      contactEmail: workspaces.contactEmail,
      logoStoragePath: workspaces.logoStoragePath,
      logoContentType: workspaces.logoContentType,
      defaultEmailSignature: workspaces.defaultEmailSignature,
      defaultQuoteNotes: workspaces.defaultQuoteNotes,
      defaultQuoteValidityDays: workspaces.defaultQuoteValidityDays,
      aiTonePreference: workspaces.aiTonePreference,
      notifyOnNewInquiry: workspaces.notifyOnNewInquiry,
      notifyOnQuoteSent: workspaces.notifyOnQuoteSent,
      defaultCurrency: workspaces.defaultCurrency,
      updatedAt: workspaces.updatedAt,
    })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  return workspace ?? null;
}

export async function getWorkspaceInquiryPageSettingsForWorkspace(
  workspaceId: string,
  formSlug?: string,
): Promise<WorkspaceInquiryPageSettingsView | null> {
  "use cache";

  cacheLife(settingsWorkspaceCacheLife);
  cacheTag(
    ...(
      formSlug
        ? getWorkspaceInquiryFormCacheTags(workspaceId, formSlug)
        : getWorkspaceInquiryFormsCacheTags(workspaceId)
    ),
  );

  const [row] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      shortDescription: workspaces.shortDescription,
      logoStoragePath: workspaces.logoStoragePath,
      updatedAt: workspaces.updatedAt,
      inquiryHeadline: workspaces.inquiryHeadline,
      formId: workspaceInquiryForms.id,
      formName: workspaceInquiryForms.name,
      formSlug: workspaceInquiryForms.slug,
      businessType: workspaceInquiryForms.businessType,
      publicInquiryEnabled: workspaceInquiryForms.publicInquiryEnabled,
      isDefault: workspaceInquiryForms.isDefault,
      inquiryFormConfig: workspaceInquiryForms.inquiryFormConfig,
      inquiryPageConfig: workspaceInquiryForms.inquiryPageConfig,
    })
    .from(workspaces)
    .innerJoin(
      workspaceInquiryForms,
      and(
        eq(workspaceInquiryForms.workspaceId, workspaces.id),
        formSlug
          ? eq(workspaceInquiryForms.slug, formSlug)
          : eq(workspaceInquiryForms.isDefault, true),
        isNull(workspaceInquiryForms.archivedAt),
      ),
    )
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.shortDescription,
    logoStoragePath: row.logoStoragePath,
    formId: row.formId,
    formName: row.formName,
    formSlug: row.formSlug,
    businessType: row.businessType,
    publicInquiryEnabled: row.publicInquiryEnabled,
    isDefault: row.isDefault,
    inquiryFormConfig: getNormalizedInquiryFormConfig(row.inquiryFormConfig, {
      businessType: row.businessType,
    }),
    inquiryPageConfig: getNormalizedInquiryPageConfig(row.inquiryPageConfig, {
      workspaceName: row.name,
      workspaceShortDescription: row.shortDescription,
      legacyInquiryHeadline: row.inquiryHeadline,
      businessType: row.businessType,
    }),
    updatedAt: row.updatedAt,
  };
}

export async function getWorkspaceInquiryFormSettingsForWorkspace(
  workspaceId: string,
  formSlug?: string,
): Promise<WorkspaceInquiryFormSettingsView | null> {
  "use cache";

  cacheLife(settingsWorkspaceCacheLife);
  cacheTag(
    ...(
      formSlug
        ? getWorkspaceInquiryFormCacheTags(workspaceId, formSlug)
        : getWorkspaceInquiryFormsCacheTags(workspaceId)
    ),
  );

  const [row] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      updatedAt: workspaces.updatedAt,
      inquiryHeadline: workspaces.inquiryHeadline,
      shortDescription: workspaces.shortDescription,
      formId: workspaceInquiryForms.id,
      formName: workspaceInquiryForms.name,
      formSlug: workspaceInquiryForms.slug,
      businessType: workspaceInquiryForms.businessType,
      publicInquiryEnabled: workspaceInquiryForms.publicInquiryEnabled,
      isDefault: workspaceInquiryForms.isDefault,
      inquiryFormConfig: workspaceInquiryForms.inquiryFormConfig,
      inquiryPageConfig: workspaceInquiryForms.inquiryPageConfig,
    })
    .from(workspaces)
    .innerJoin(
      workspaceInquiryForms,
      and(
        eq(workspaceInquiryForms.workspaceId, workspaces.id),
        formSlug
          ? eq(workspaceInquiryForms.slug, formSlug)
          : eq(workspaceInquiryForms.isDefault, true),
        isNull(workspaceInquiryForms.archivedAt),
      ),
    )
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    formId: row.formId,
    formName: row.formName,
    formSlug: row.formSlug,
    businessType: row.businessType,
    publicInquiryEnabled: row.publicInquiryEnabled,
    isDefault: row.isDefault,
    inquiryFormConfig: getNormalizedInquiryFormConfig(row.inquiryFormConfig, {
      businessType: row.businessType,
    }),
    inquiryPageConfig: getNormalizedInquiryPageConfig(row.inquiryPageConfig, {
      workspaceName: row.name,
      workspaceShortDescription: row.shortDescription,
      legacyInquiryHeadline: row.inquiryHeadline,
      businessType: row.businessType,
    }),
    updatedAt: row.updatedAt,
  };
}

export async function getWorkspaceInquiryFormsSettingsForWorkspace(
  workspaceId: string,
): Promise<WorkspaceInquiryFormsSettingsView | null> {
  "use cache";

  cacheLife(settingsWorkspaceCacheLife);
  cacheTag(...getWorkspaceInquiryFormsCacheTags(workspaceId));

  const submittedInquiryCountSelection = sql<number>`(
    select count(*)::int
    from ${inquiries}
    where ${inquiries.workspaceInquiryFormId} = ${workspaceInquiryForms.id}
  )`;

  const [workspace, forms] = await Promise.all([
    db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        businessType: workspaces.businessType,
      })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1),
    db
      .select({
        id: workspaceInquiryForms.id,
        name: workspaceInquiryForms.name,
        slug: workspaceInquiryForms.slug,
        businessType: workspaceInquiryForms.businessType,
        isDefault: workspaceInquiryForms.isDefault,
        publicInquiryEnabled: workspaceInquiryForms.publicInquiryEnabled,
        archivedAt: workspaceInquiryForms.archivedAt,
        createdAt: workspaceInquiryForms.createdAt,
        updatedAt: workspaceInquiryForms.updatedAt,
        submittedInquiryCount: submittedInquiryCountSelection,
        inquiryFormConfig: workspaceInquiryForms.inquiryFormConfig,
        inquiryPageConfig: workspaceInquiryForms.inquiryPageConfig,
      })
      .from(workspaceInquiryForms)
      .where(eq(workspaceInquiryForms.workspaceId, workspaceId))
      .orderBy(
        desc(workspaceInquiryForms.isDefault),
        asc(workspaceInquiryForms.archivedAt),
        asc(workspaceInquiryForms.name),
      ),
  ]);

  const workspaceRow = workspace[0];

  if (!workspaceRow) {
    return null;
  }

  return {
    id: workspaceRow.id,
    name: workspaceRow.name,
    slug: workspaceRow.slug,
    businessType: workspaceRow.businessType,
    forms: forms.map((form) => ({
      id: form.id,
      name: form.name,
      slug: form.slug,
      businessType: form.businessType,
      isDefault: form.isDefault,
      publicInquiryEnabled: form.publicInquiryEnabled,
      archivedAt: form.archivedAt,
      createdAt: form.createdAt,
      updatedAt: form.updatedAt,
      submittedInquiryCount: form.submittedInquiryCount,
      inquiryFormConfig: getNormalizedInquiryFormConfig(form.inquiryFormConfig, {
        businessType: form.businessType,
      }),
      inquiryPageConfig: getNormalizedInquiryPageConfig(form.inquiryPageConfig, {
        workspaceName: workspaceRow.name,
        businessType: form.businessType,
      }),
    })),
  };
}

export async function getWorkspaceInquiryFormEditorForWorkspace(
  workspaceId: string,
  formSlug: string,
): Promise<WorkspaceInquiryFormEditorView | null> {
  "use cache";

  cacheLife(settingsWorkspaceCacheLife);
  cacheTag(...getWorkspaceInquiryFormCacheTags(workspaceId, formSlug));

  const [row, activeFormRows, inquiryRows] = await Promise.all([
    db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        shortDescription: workspaces.shortDescription,
        logoStoragePath: workspaces.logoStoragePath,
        updatedAt: workspaces.updatedAt,
        inquiryHeadline: workspaces.inquiryHeadline,
        formId: workspaceInquiryForms.id,
        formName: workspaceInquiryForms.name,
        formSlug: workspaceInquiryForms.slug,
        businessType: workspaceInquiryForms.businessType,
        publicInquiryEnabled: workspaceInquiryForms.publicInquiryEnabled,
        isDefault: workspaceInquiryForms.isDefault,
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
      .where(eq(workspaces.id, workspaceId))
      .limit(1),
    db
      .select({
        id: workspaceInquiryForms.id,
      })
      .from(workspaceInquiryForms)
      .where(
        and(
          eq(workspaceInquiryForms.workspaceId, workspaceId),
          isNull(workspaceInquiryForms.archivedAt),
        ),
      ),
    db
      .select({
        id: inquiries.id,
      })
      .from(inquiries)
      .innerJoin(
        workspaceInquiryForms,
        eq(inquiries.workspaceInquiryFormId, workspaceInquiryForms.id),
      )
      .where(
        and(
          eq(workspaceInquiryForms.workspaceId, workspaceId),
          eq(workspaceInquiryForms.slug, formSlug),
        ),
      ),
  ]);

  const workspaceRow = row[0];

  if (!workspaceRow) {
    return null;
  }

  return {
    id: workspaceRow.id,
    name: workspaceRow.name,
    slug: workspaceRow.slug,
    shortDescription: workspaceRow.shortDescription,
    logoStoragePath: workspaceRow.logoStoragePath,
    formId: workspaceRow.formId,
    formName: workspaceRow.formName,
    formSlug: workspaceRow.formSlug,
    businessType: workspaceRow.businessType,
    publicInquiryEnabled: workspaceRow.publicInquiryEnabled,
    isDefault: workspaceRow.isDefault,
    inquiryFormConfig: getNormalizedInquiryFormConfig(workspaceRow.inquiryFormConfig, {
      businessType: workspaceRow.businessType,
    }),
    inquiryPageConfig: getNormalizedInquiryPageConfig(workspaceRow.inquiryPageConfig, {
      workspaceName: workspaceRow.name,
      workspaceShortDescription: workspaceRow.shortDescription,
      legacyInquiryHeadline: workspaceRow.inquiryHeadline,
      businessType: workspaceRow.businessType,
    }),
    updatedAt: workspaceRow.updatedAt,
    activeFormCount: activeFormRows.length,
    submittedInquiryCount: inquiryRows.length,
  };
}

export async function getDefaultWorkspaceInquiryFormForWorkspace(
  workspaceId: string,
) {
  "use cache";

  cacheLife(settingsWorkspaceCacheLife);
  cacheTag(...getWorkspaceInquiryFormsCacheTags(workspaceId));

  const [form] = await db
    .select({
      id: workspaceInquiryForms.id,
      slug: workspaceInquiryForms.slug,
    })
    .from(workspaceInquiryForms)
    .where(
      and(
        eq(workspaceInquiryForms.workspaceId, workspaceId),
        eq(workspaceInquiryForms.isDefault, true),
        isNull(workspaceInquiryForms.archivedAt),
      ),
    )
    .limit(1);

  return form ?? null;
}

export async function getWorkspaceLogoAssetForWorkspace(workspaceId: string) {
  "use cache";

  cacheLife(settingsWorkspaceCacheLife);
  cacheTag(...getWorkspaceSettingsCacheTags(workspaceId));

  const [workspace] = await db
    .select({
      logoStoragePath: workspaces.logoStoragePath,
      logoContentType: workspaces.logoContentType,
    })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  return workspace ?? null;
}
