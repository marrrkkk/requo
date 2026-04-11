import "server-only";

import { and, eq, isNull, ne } from "drizzle-orm";

import {
  normalizeBusinessType,
  type BusinessType,
} from "@/features/inquiries/business-types";
import { normalizeInquiryFormSlug } from "@/features/inquiries/inquiry-forms";
import {
  createInquiryFormConfigDefaults,
  getNormalizedInquiryFormConfig,
} from "@/features/inquiries/form-config";
import {
  createInquiryPageConfigDefaults,
  getNormalizedInquiryPageConfig,
} from "@/features/inquiries/page-config";
import type {
  BusinessDeleteInput,
  BusinessGeneralSettingsInput,
  BusinessInquiryFormCreateInput,
  BusinessInquiryFormPresetInput,
  BusinessInquiryFormSettingsInput,
  BusinessInquiryPageSettingsInput,
  BusinessNotificationSettingsInput,
  BusinessQuoteSettingsInput,
} from "@/features/settings/schemas";
import { publicInquiryAttachmentBucket } from "@/features/inquiries/schemas";
import { knowledgeFilesBucket } from "@/features/knowledge/schemas";
import { resolveSafeContentType } from "@/lib/files";
import {
  sanitizeBusinessLogoFileName,
  businessLogoBucket,
  businessLogoExtensionToMimeType,
} from "@/features/settings/utils";
import { db } from "@/lib/db/client";
import {
  activityLogs,
  inquiries,
  inquiryAttachments,
  knowledgeFiles,
  businessInquiryForms,
  businesses,
} from "@/lib/db/schema";
import { appendRandomSlugSuffix } from "@/lib/slugs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type UpdateBusinessGeneralSettingsInput = {
  businessId: string;
  actorUserId: string;
  values: BusinessGeneralSettingsInput;
};

type UpdateBusinessQuoteSettingsInput = {
  businessId: string;
  actorUserId: string;
  values: BusinessQuoteSettingsInput;
};

type UpdateBusinessNotificationSettingsInput = {
  businessId: string;
  actorUserId: string;
  values: BusinessNotificationSettingsInput;
};

type DeleteBusinessInput = {
  businessId: string;
  actorUserId: string;
  values: BusinessDeleteInput;
};

type UpdateBusinessInquiryPageInput = {
  businessId: string;
  actorUserId: string;
  values: BusinessInquiryPageSettingsInput;
};

type UpdateBusinessInquiryFormInput = {
  businessId: string;
  actorUserId: string;
  values: BusinessInquiryFormSettingsInput;
};

type ApplyBusinessInquiryFormPresetInput = {
  businessId: string;
  actorUserId: string;
  values: BusinessInquiryFormPresetInput;
};

type CreateBusinessInquiryFormInput = {
  businessId: string;
  actorUserId: string;
  values: BusinessInquiryFormCreateInput;
};

type TargetBusinessInquiryFormInput = {
  businessId: string;
  actorUserId: string;
  targetFormId: string;
};
type SetBusinessInquiryFormPublicStateInput = TargetBusinessInquiryFormInput & {
  publicInquiryEnabled: boolean;
};

type UpdateBusinessSettingsResult =
  | { ok: true; previousSlug: string; nextSlug: string }
  | { ok: false; reason: "not-found" | "slug-taken" };

type DeleteBusinessResult =
  | { ok: true; businessSlug: string }
  | { ok: false; reason: "not-found" | "confirmation-mismatch" };

type UpdateBusinessInquiryFormSettingsResult =
  | {
      ok: true;
      previousSlug: string;
      nextSlug: string;
      previousFormSlug: string;
      nextFormSlug: string;
    }
  | { ok: false; reason: "not-found" | "slug-taken" };

type UpdateBusinessInquiryPageSettingsResult =
  | {
      ok: true;
      previousSlug: string;
      nextSlug: string;
      previousFormSlug: string;
      nextFormSlug: string;
    }
  | { ok: false; reason: "not-found" | "slug-taken" };

type BusinessInquiryFormMutationResult =
  | { ok: true; businessSlug: string; formSlug: string }
  | {
      ok: false;
      reason:
        | "not-found"
        | "invalid-target"
        | "last-active"
        | "has-inquiries";
    };

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function chunkPaths(paths: string[], size = 100) {
  const chunks: string[][] = [];

  for (let index = 0; index < paths.length; index += size) {
    chunks.push(paths.slice(index, index + size));
  }

  return chunks;
}

async function removeStoragePaths(
  bucket: string,
  paths: Array<string | null | undefined>,
) {
  const sanitizedPaths = paths.filter((path): path is string => Boolean(path));

  if (!sanitizedPaths.length) {
    return;
  }

  const storageClient = createSupabaseAdminClient();

  for (const chunk of chunkPaths(sanitizedPaths)) {
    const { error } = await storageClient.storage.from(bucket).remove(chunk);

    if (error) {
      console.error(`Failed to remove storage objects from ${bucket}.`, error);
    }
  }
}

async function getAvailableBusinessInquiryFormSlug({
  businessId,
  baseSlug,
  excludeFormId,
}: {
  businessId: string;
  baseSlug: string;
  excludeFormId?: string;
}) {
  const normalizedBaseSlug = normalizeInquiryFormSlug(baseSlug);
  let candidate = normalizedBaseSlug;

  while (true) {
    const conditions = [
      eq(businessInquiryForms.businessId, businessId),
      eq(businessInquiryForms.slug, candidate),
    ];

    if (excludeFormId) {
      conditions.push(ne(businessInquiryForms.id, excludeFormId));
    }

    const [existingForm] = await db
      .select({ id: businessInquiryForms.id })
      .from(businessInquiryForms)
      .where(and(...conditions))
      .limit(1);

    if (!existingForm) {
      return candidate;
    }

    candidate = appendRandomSlugSuffix(normalizedBaseSlug, {
      fallback: "inquiry",
    });
  }
}

function createDuplicateInquiryFormName(name: string) {
  const nextName = `${name} copy`.trim();

  return nextName.slice(0, 80).trim() || name;
}

function createInquiryFormSeedValues({
  businessType,
  name,
  businessName,
  businessShortDescription,
}: {
  businessType: BusinessType;
  name: string;
  businessName: string;
  businessShortDescription?: string | null;
}) {
  const inquiryFormConfig = createInquiryFormConfigDefaults({
    businessType,
  });
  const inquiryPageConfig = createInquiryPageConfigDefaults({
    businessName,
    businessShortDescription,
    businessType,
  });

  return {
    name,
    businessType,
    publicInquiryEnabled: true,
    inquiryFormConfig,
    inquiryPageConfig: {
      ...inquiryPageConfig,
      formTitle: name,
    },
  };
}

export async function updateBusinessSettings({
  businessId,
  actorUserId,
  values,
}: UpdateBusinessGeneralSettingsInput): Promise<UpdateBusinessSettingsResult> {
  const [currentBusiness] = await db
    .select({
      id: businesses.id,
      slug: businesses.slug,
      shortDescription: businesses.shortDescription,
      logoStoragePath: businesses.logoStoragePath,
      logoContentType: businesses.logoContentType,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!currentBusiness) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  const [conflictingBusiness] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(and(eq(businesses.slug, values.slug), ne(businesses.id, businessId)))
    .limit(1);

  if (conflictingBusiness) {
    return {
      ok: false,
      reason: "slug-taken",
    };
  }

  const now = new Date();
  const logoFile = values.logo;
  const storageClient = logoFile ? createSupabaseAdminClient() : null;
  const previousLogoStoragePath = currentBusiness.logoStoragePath;
  const nextLogoContentType = logoFile
    ? resolveSafeContentType(logoFile, {
        extensionToMimeType: businessLogoExtensionToMimeType,
        fallback: "application/octet-stream",
      })
    : null;
  const nextLogoStoragePath =
    logoFile && storageClient
      ? `${businessId}/logo/${createId("asset")}-${sanitizeBusinessLogoFileName(
          logoFile.name,
        )}`
      : null;

  if (nextLogoStoragePath && storageClient && logoFile) {
    const { error } = await storageClient.storage
      .from(businessLogoBucket)
      .upload(nextLogoStoragePath, logoFile, {
        contentType: nextLogoContentType ?? "application/octet-stream",
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload business logo: ${error.message}`);
    }
  }

  try {
    await db.transaction(async (tx) => {
      const previousShortDescription = currentBusiness.shortDescription?.trim() || undefined;
      const nextShortDescription = values.shortDescription?.trim() || undefined;

      await tx
        .update(businesses)
        .set({
          name: values.name,
          slug: values.slug,
          countryCode: values.countryCode ?? null,
          shortDescription: values.shortDescription ?? null,
          contactEmail: values.contactEmail ?? null,
          logoStoragePath: values.removeLogo
            ? nextLogoStoragePath
            : nextLogoStoragePath ?? previousLogoStoragePath ?? null,
          logoContentType: values.removeLogo
            ? nextLogoContentType
            : nextLogoContentType ?? currentBusiness.logoContentType ?? null,
          defaultCurrency: values.defaultCurrency,
          defaultEmailSignature: values.defaultEmailSignature ?? null,
          aiTonePreference: values.aiTonePreference,
          updatedAt: now,
        })
        .where(eq(businesses.id, businessId));

      const inquiryForms = await tx
        .select({
          id: businessInquiryForms.id,
          inquiryPageConfig: businessInquiryForms.inquiryPageConfig,
        })
        .from(businessInquiryForms)
        .where(
          and(
            eq(businessInquiryForms.businessId, businessId),
            isNull(businessInquiryForms.archivedAt),
          ),
        );

      for (const form of inquiryForms) {
        const currentBrandTagline =
          form.inquiryPageConfig?.brandTagline?.trim() || undefined;
        const shouldSyncBrandTagline =
          currentBrandTagline === previousShortDescription ||
          currentBrandTagline === undefined;

        if (!shouldSyncBrandTagline || currentBrandTagline === nextShortDescription) {
          continue;
        }

        await tx
          .update(businessInquiryForms)
          .set({
            inquiryPageConfig: {
              ...form.inquiryPageConfig,
              brandTagline: nextShortDescription,
            },
            updatedAt: now,
          })
          .where(eq(businessInquiryForms.id, form.id));
      }

      await tx.insert(activityLogs).values({
        id: createId("act"),
        businessId,
        actorUserId,
        type: "business.settings_updated",
        summary: "Business settings updated.",
        metadata: {
          slug: values.slug,
          countryCode: values.countryCode ?? null,
          defaultCurrency: values.defaultCurrency,
          hasLogo: Boolean(logoFile || previousLogoStoragePath) && !values.removeLogo,
          aiTonePreference: values.aiTonePreference,
        },
        createdAt: now,
        updatedAt: now,
      });
    });
  } catch (error) {
    if (nextLogoStoragePath && storageClient) {
      const { error: cleanupError } = await storageClient.storage
        .from(businessLogoBucket)
        .remove([nextLogoStoragePath]);

      if (cleanupError) {
        console.error(
          "Failed to clean up uploaded business logo after a database error.",
          cleanupError,
        );
      }
    }

    throw error;
  }

  const shouldRemovePreviousLogo =
    previousLogoStoragePath &&
    ((Boolean(nextLogoStoragePath) && nextLogoStoragePath !== previousLogoStoragePath) ||
      (values.removeLogo && !nextLogoStoragePath));

  if (shouldRemovePreviousLogo) {
    const storageClient = createSupabaseAdminClient();
    const { error } = await storageClient.storage
      .from(businessLogoBucket)
      .remove([previousLogoStoragePath]);

    if (error) {
      console.error("Failed to clean up the previous business logo.", error);
    }
  }

  return {
    ok: true,
    previousSlug: currentBusiness.slug,
    nextSlug: values.slug,
  };
}

export async function updateBusinessQuoteSettings({
  businessId,
  actorUserId,
  values,
}: UpdateBusinessQuoteSettingsInput): Promise<UpdateBusinessSettingsResult> {
  const [business] = await db
    .select({
      id: businesses.id,
      slug: businesses.slug,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!business) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(businesses)
      .set({
        defaultQuoteNotes: values.defaultQuoteNotes ?? null,
        defaultQuoteValidityDays: values.defaultQuoteValidityDays,
        updatedAt: now,
      })
      .where(eq(businesses.id, businessId));

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      actorUserId,
      type: "business.quote_settings_updated",
      summary: "Quote settings updated.",
      metadata: {
        defaultQuoteValidityDays: values.defaultQuoteValidityDays,
        hasDefaultQuoteNotes: Boolean(values.defaultQuoteNotes?.trim()),
      },
      createdAt: now,
      updatedAt: now,
    });
  });

  return {
    ok: true,
    previousSlug: business.slug,
    nextSlug: business.slug,
  };
}

export async function updateBusinessNotificationSettings({
  businessId,
  actorUserId,
  values,
}: UpdateBusinessNotificationSettingsInput): Promise<UpdateBusinessSettingsResult> {
  const [business] = await db
    .select({
      id: businesses.id,
      slug: businesses.slug,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!business) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(businesses)
      .set({
        notifyOnNewInquiry: values.notifyOnNewInquiry,
        notifyOnQuoteSent: values.notifyOnQuoteSent,
        notifyOnQuoteResponse: values.notifyOnQuoteResponse,
        notifyInAppOnNewInquiry: values.notifyInAppOnNewInquiry,
        notifyInAppOnQuoteResponse: values.notifyInAppOnQuoteResponse,
        updatedAt: now,
      })
      .where(eq(businesses.id, businessId));

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      actorUserId,
      type: "business.notification_settings_updated",
      summary: "Notification settings updated.",
      metadata: {
        notifyOnNewInquiry: values.notifyOnNewInquiry,
        notifyOnQuoteSent: values.notifyOnQuoteSent,
        notifyOnQuoteResponse: values.notifyOnQuoteResponse,
        notifyInAppOnNewInquiry: values.notifyInAppOnNewInquiry,
        notifyInAppOnQuoteResponse: values.notifyInAppOnQuoteResponse,
      },
      createdAt: now,
      updatedAt: now,
    });
  });

  return {
    ok: true,
    previousSlug: business.slug,
    nextSlug: business.slug,
  };
}

export async function deleteBusiness({
  businessId,
  actorUserId,
  values,
}: DeleteBusinessInput): Promise<DeleteBusinessResult> {
  void actorUserId;

  const [business] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      logoStoragePath: businesses.logoStoragePath,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!business) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  if (values.confirmation !== business.name) {
    return {
      ok: false,
      reason: "confirmation-mismatch",
    };
  }

  const [knowledgeFileRows, inquiryAttachmentRows] = await Promise.all([
    db
      .select({
        storagePath: knowledgeFiles.storagePath,
      })
      .from(knowledgeFiles)
      .where(eq(knowledgeFiles.businessId, businessId)),
    db
      .select({
        storagePath: inquiryAttachments.storagePath,
      })
      .from(inquiryAttachments)
      .where(eq(inquiryAttachments.businessId, businessId)),
  ]);

  await db.delete(businesses).where(eq(businesses.id, businessId));

  await Promise.all([
    removeStoragePaths(businessLogoBucket, [business.logoStoragePath]),
    removeStoragePaths(
      knowledgeFilesBucket,
      knowledgeFileRows.map((row) => row.storagePath),
    ),
    removeStoragePaths(
      publicInquiryAttachmentBucket,
      inquiryAttachmentRows.map((row) => row.storagePath),
    ),
  ]);

  return {
    ok: true,
    businessSlug: business.slug,
  };
}

export async function updateBusinessInquiryPageSettings({
  businessId,
  actorUserId,
  values,
}: UpdateBusinessInquiryPageInput): Promise<UpdateBusinessInquiryPageSettingsResult> {
  const [currentBusiness, currentForm] = await Promise.all([
    db
      .select({
        id: businesses.id,
        slug: businesses.slug,
        name: businesses.name,
        shortDescription: businesses.shortDescription,
      })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1),
    db
      .select({
        id: businessInquiryForms.id,
        slug: businessInquiryForms.slug,
        inquiryFormConfig: businessInquiryForms.inquiryFormConfig,
        inquiryPageConfig: businessInquiryForms.inquiryPageConfig,
      })
      .from(businessInquiryForms)
      .where(
        and(
          eq(businessInquiryForms.businessId, businessId),
          eq(businessInquiryForms.id, values.formId),
          isNull(businessInquiryForms.archivedAt),
        ),
      )
      .limit(1),
  ]);

  const business = currentBusiness[0];
  const form = currentForm[0];

  if (!business || !form) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  if (values.slug !== form.slug) {
    const [conflictingForm] = await db
      .select({ id: businessInquiryForms.id })
      .from(businessInquiryForms)
      .where(
        and(
          eq(businessInquiryForms.businessId, businessId),
          eq(businessInquiryForms.slug, values.slug),
          ne(businessInquiryForms.id, values.formId),
        ),
      )
      .limit(1);

    if (conflictingForm) {
      return {
        ok: false,
        reason: "slug-taken",
      };
    }
  }

  const now = new Date();
  const inquiryFormConfig = getNormalizedInquiryFormConfig(form.inquiryFormConfig, {
    businessType: values.businessType,
  });
  const inquiryPageConfig = getNormalizedInquiryPageConfig(
    {
      ...form.inquiryPageConfig,
      template: values.template,
      eyebrow: values.eyebrow,
      headline: values.headline,
      description: values.description,
      brandTagline: values.brandTagline,
      formTitle: values.formTitle,
      formDescription: values.formDescription,
      showcaseImage: values.showcaseImageUrl
        ? {
            url: values.showcaseImageUrl,
            frame: values.showcaseImageFrame,
            size: values.showcaseImageSize,
            crop: {
              x: values.showcaseImageCropX,
              y: values.showcaseImageCropY,
              zoom: values.showcaseImageCropZoom,
            },
          }
        : undefined,
      cards: values.cards,
    },
    {
      businessName: business.name,
      businessShortDescription: business.shortDescription,
      businessType: values.businessType,
    },
  );

  await db.transaction(async (tx) => {
    await tx
      .update(businessInquiryForms)
      .set({
        name: values.name,
        slug: values.slug,
        businessType: values.businessType,
        publicInquiryEnabled: values.publicInquiryEnabled,
        inquiryFormConfig,
        inquiryPageConfig,
        updatedAt: now,
      })
      .where(
        and(
          eq(businessInquiryForms.businessId, businessId),
          eq(businessInquiryForms.id, values.formId),
        ),
      );

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      actorUserId,
      type: "business.inquiry_form_page_updated",
      summary: `Inquiry page updated for ${values.slug}.`,
      metadata: {
        inquiryFormId: values.formId,
        inquiryFormSlug: values.slug,
        previousInquiryFormSlug: form.slug,
        businessType: values.businessType,
        publicInquiryEnabled: values.publicInquiryEnabled,
        template: values.template,
        cardCount: values.cards.length,
        hasShowcaseImage: Boolean(values.showcaseImageUrl),
      },
      createdAt: now,
      updatedAt: now,
    });
  });

  return {
    ok: true,
    previousSlug: business.slug,
    nextSlug: business.slug,
    previousFormSlug: form.slug,
    nextFormSlug: values.slug,
  };
}

export async function updateBusinessInquiryFormSettings({
  businessId,
  actorUserId,
  values,
}: UpdateBusinessInquiryFormInput): Promise<UpdateBusinessInquiryFormSettingsResult> {
  const [currentBusiness, currentForm] = await Promise.all([
    db
      .select({
        id: businesses.id,
        slug: businesses.slug,
      })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1),
    db
      .select({
        id: businessInquiryForms.id,
        slug: businessInquiryForms.slug,
        businessType: businessInquiryForms.businessType,
      })
      .from(businessInquiryForms)
      .where(
        and(
          eq(businessInquiryForms.businessId, businessId),
          eq(businessInquiryForms.id, values.formId),
          isNull(businessInquiryForms.archivedAt),
        ),
      )
      .limit(1),
  ]);

  const business = currentBusiness[0];
  const form = currentForm[0];

  if (!business || !form) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  const now = new Date();
  const inquiryFormConfig = getNormalizedInquiryFormConfig(
    values.inquiryFormConfig,
    {
      businessType: normalizeBusinessType(form.businessType),
    },
  );

  await db.transaction(async (tx) => {
    await tx
      .update(businessInquiryForms)
      .set({
        inquiryFormConfig,
        updatedAt: now,
      })
      .where(
        and(
          eq(businessInquiryForms.businessId, businessId),
          eq(businessInquiryForms.id, values.formId),
        ),
      );

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      actorUserId,
      type: "business.inquiry_form_updated",
      summary: `Inquiry form updated for ${form.slug}.`,
      metadata: {
        inquiryFormId: values.formId,
        inquiryFormSlug: form.slug,
        businessType: normalizeBusinessType(form.businessType),
        projectFieldCount: inquiryFormConfig.projectFields.length,
      },
      createdAt: now,
      updatedAt: now,
    });
  });

  return {
    ok: true,
    previousSlug: business.slug,
    nextSlug: business.slug,
    previousFormSlug: form.slug,
    nextFormSlug: form.slug,
  };
}

export async function applyBusinessInquiryFormPreset({
  businessId,
  actorUserId,
  values,
}: ApplyBusinessInquiryFormPresetInput): Promise<UpdateBusinessSettingsResult> {
  const [currentBusiness, currentForm] = await Promise.all([
    db
      .select({
        id: businesses.id,
        slug: businesses.slug,
        name: businesses.name,
        shortDescription: businesses.shortDescription,
        inquiryHeadline: businesses.inquiryHeadline,
      })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1),
    db
      .select({
        id: businessInquiryForms.id,
        slug: businessInquiryForms.slug,
        name: businessInquiryForms.name,
        publicInquiryEnabled: businessInquiryForms.publicInquiryEnabled,
      })
      .from(businessInquiryForms)
      .where(
        and(
          eq(businessInquiryForms.businessId, businessId),
          eq(businessInquiryForms.id, values.formId),
          isNull(businessInquiryForms.archivedAt),
        ),
      )
      .limit(1),
  ]);

  const business = currentBusiness[0];
  const form = currentForm[0];

  if (!business || !form) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(businessInquiryForms)
      .set({
        businessType: values.businessType,
        inquiryFormConfig: createInquiryFormConfigDefaults({
          businessType: values.businessType,
        }),
        inquiryPageConfig: {
          ...createInquiryPageConfigDefaults({
            businessName: business.name,
            businessShortDescription: business.shortDescription,
            legacyInquiryHeadline: business.inquiryHeadline,
            businessType: values.businessType,
          }),
          formTitle: form.name,
        },
        publicInquiryEnabled: form.publicInquiryEnabled,
        updatedAt: now,
      })
      .where(
        and(
          eq(businessInquiryForms.businessId, businessId),
          eq(businessInquiryForms.id, values.formId),
        ),
      );

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      actorUserId,
      type: "business.inquiry_form_preset_applied",
      summary: `Inquiry preset applied to ${form.slug}.`,
      metadata: {
        inquiryFormId: values.formId,
        inquiryFormSlug: form.slug,
        businessType: values.businessType,
      },
      createdAt: now,
      updatedAt: now,
    });
  });

  return {
    ok: true,
    previousSlug: business.slug,
    nextSlug: business.slug,
  };
}

export async function createBusinessInquiryForm({
  businessId,
  actorUserId,
  values,
}: CreateBusinessInquiryFormInput): Promise<BusinessInquiryFormMutationResult> {
  const [business] = await db
    .select({
      id: businesses.id,
      slug: businesses.slug,
      name: businesses.name,
      shortDescription: businesses.shortDescription,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!business) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  const now = new Date();
  const formId = createId("ifm");
  const formSeed = createInquiryFormSeedValues({
    businessType: values.businessType,
    name: values.name,
    businessName: business.name,
    businessShortDescription: business.shortDescription,
  });
  const formSlug = await getAvailableBusinessInquiryFormSlug({
    businessId,
    baseSlug: values.name,
  });

  await db.transaction(async (tx) => {
    await tx.insert(businessInquiryForms).values({
      id: formId,
      businessId,
      name: formSeed.name,
      slug: formSlug,
      businessType: formSeed.businessType,
      isDefault: false,
      publicInquiryEnabled: formSeed.publicInquiryEnabled,
      inquiryFormConfig: formSeed.inquiryFormConfig,
      inquiryPageConfig: formSeed.inquiryPageConfig,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      actorUserId,
      type: "business.inquiry_form_created",
      summary: `Inquiry form created: ${formSeed.name}.`,
      metadata: {
        inquiryFormId: formId,
        inquiryFormSlug: formSlug,
        businessType: formSeed.businessType,
      },
      createdAt: now,
      updatedAt: now,
    });
  });

  return {
    ok: true,
    businessSlug: business.slug,
    formSlug,
  };
}

export async function duplicateBusinessInquiryForm({
  businessId,
  actorUserId,
  targetFormId,
}: TargetBusinessInquiryFormInput): Promise<BusinessInquiryFormMutationResult> {
  const [businessRows, sourceFormRows] = await Promise.all([
    db
      .select({
        id: businesses.id,
        slug: businesses.slug,
      })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1),
    db
      .select({
        id: businessInquiryForms.id,
        name: businessInquiryForms.name,
        businessType: businessInquiryForms.businessType,
        publicInquiryEnabled: businessInquiryForms.publicInquiryEnabled,
        inquiryFormConfig: businessInquiryForms.inquiryFormConfig,
        inquiryPageConfig: businessInquiryForms.inquiryPageConfig,
      })
      .from(businessInquiryForms)
      .where(
        and(
          eq(businessInquiryForms.businessId, businessId),
          eq(businessInquiryForms.id, targetFormId),
          isNull(businessInquiryForms.archivedAt),
        ),
      )
      .limit(1),
  ]);

  const business = businessRows[0];
  const sourceForm = sourceFormRows[0];

  if (!business || !sourceForm) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  const now = new Date();
  const nextName = createDuplicateInquiryFormName(sourceForm.name);
  const formId = createId("ifm");
  const sourceFormBusinessType = normalizeBusinessType(sourceForm.businessType);
  const sourceInquiryFormConfig = getNormalizedInquiryFormConfig(
    sourceForm.inquiryFormConfig,
    {
      businessType: sourceFormBusinessType,
    },
  );
  const formSlug = await getAvailableBusinessInquiryFormSlug({
    businessId,
    baseSlug: nextName,
  });

  await db.transaction(async (tx) => {
    await tx.insert(businessInquiryForms).values({
      id: formId,
      businessId,
      name: nextName,
      slug: formSlug,
      businessType: sourceFormBusinessType,
      isDefault: false,
      publicInquiryEnabled: sourceForm.publicInquiryEnabled,
      inquiryFormConfig: sourceInquiryFormConfig,
      inquiryPageConfig: {
        ...sourceForm.inquiryPageConfig,
        formTitle: nextName,
      },
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      actorUserId,
      type: "business.inquiry_form_duplicated",
      summary: `Inquiry form duplicated: ${nextName}.`,
      metadata: {
        inquiryFormId: formId,
        inquiryFormSlug: formSlug,
        sourceInquiryFormId: targetFormId,
      },
      createdAt: now,
      updatedAt: now,
    });
  });

  return {
    ok: true,
    businessSlug: business.slug,
    formSlug,
  };
}

export async function setDefaultBusinessInquiryForm({
  businessId,
  actorUserId,
  targetFormId,
}: TargetBusinessInquiryFormInput): Promise<BusinessInquiryFormMutationResult> {
  const [businessRows, targetFormRows] = await Promise.all([
    db
      .select({
        id: businesses.id,
        slug: businesses.slug,
      })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1),
    db
      .select({
        id: businessInquiryForms.id,
        slug: businessInquiryForms.slug,
      })
      .from(businessInquiryForms)
      .where(
        and(
          eq(businessInquiryForms.businessId, businessId),
          eq(businessInquiryForms.id, targetFormId),
          isNull(businessInquiryForms.archivedAt),
        ),
      )
      .limit(1),
  ]);

  const business = businessRows[0];
  const targetForm = targetFormRows[0];

  if (!business || !targetForm) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(businessInquiryForms)
      .set({
        isDefault: false,
        updatedAt: now,
      })
      .where(eq(businessInquiryForms.businessId, businessId));

    await tx
      .update(businessInquiryForms)
      .set({
        isDefault: true,
        updatedAt: now,
      })
      .where(
        and(
          eq(businessInquiryForms.businessId, businessId),
          eq(businessInquiryForms.id, targetFormId),
        ),
      );

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      actorUserId,
      type: "business.inquiry_form_default_changed",
      summary: `Default inquiry form set to ${targetForm.slug}.`,
      metadata: {
        inquiryFormId: targetFormId,
        inquiryFormSlug: targetForm.slug,
      },
      createdAt: now,
      updatedAt: now,
    });
  });

  return {
    ok: true,
    businessSlug: business.slug,
    formSlug: targetForm.slug,
  };
}

export async function archiveBusinessInquiryForm({
  businessId,
  actorUserId,
  targetFormId,
}: TargetBusinessInquiryFormInput): Promise<BusinessInquiryFormMutationResult> {
  const [businessRows, targetFormRows, activeForms] = await Promise.all([
    db
      .select({
        id: businesses.id,
        slug: businesses.slug,
      })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1),
    db
      .select({
        id: businessInquiryForms.id,
        slug: businessInquiryForms.slug,
        isDefault: businessInquiryForms.isDefault,
      })
      .from(businessInquiryForms)
      .where(
        and(
          eq(businessInquiryForms.businessId, businessId),
          eq(businessInquiryForms.id, targetFormId),
          isNull(businessInquiryForms.archivedAt),
        ),
      )
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
  ]);

  const business = businessRows[0];
  const targetForm = targetFormRows[0];

  if (!business || !targetForm) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  if (targetForm.isDefault) {
    return {
      ok: false,
      reason: "invalid-target",
    };
  }

  if (activeForms.length <= 1) {
    return {
      ok: false,
      reason: "last-active",
    };
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(businessInquiryForms)
      .set({
        archivedAt: now,
        isDefault: false,
        updatedAt: now,
      })
      .where(
        and(
          eq(businessInquiryForms.businessId, businessId),
          eq(businessInquiryForms.id, targetFormId),
        ),
      );

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      actorUserId,
      type: "business.inquiry_form_archived",
      summary: `Inquiry form archived: ${targetForm.slug}.`,
      metadata: {
        inquiryFormId: targetFormId,
        inquiryFormSlug: targetForm.slug,
      },
      createdAt: now,
      updatedAt: now,
    });
  });

  return {
    ok: true,
    businessSlug: business.slug,
    formSlug: targetForm.slug,
  };
}

export async function deleteBusinessInquiryForm({
  businessId,
  actorUserId,
  targetFormId,
}: TargetBusinessInquiryFormInput): Promise<BusinessInquiryFormMutationResult> {
  const [businessRows, targetFormRows, activeForms, linkedInquiries] = await Promise.all([
    db
      .select({
        id: businesses.id,
        slug: businesses.slug,
      })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1),
    db
      .select({
        id: businessInquiryForms.id,
        slug: businessInquiryForms.slug,
        isDefault: businessInquiryForms.isDefault,
      })
      .from(businessInquiryForms)
      .where(
        and(
          eq(businessInquiryForms.businessId, businessId),
          eq(businessInquiryForms.id, targetFormId),
          isNull(businessInquiryForms.archivedAt),
        ),
      )
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
      .where(eq(inquiries.businessInquiryFormId, targetFormId))
      .limit(1),
  ]);

  const business = businessRows[0];
  const targetForm = targetFormRows[0];

  if (!business || !targetForm) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  if (targetForm.isDefault) {
    return {
      ok: false,
      reason: "invalid-target",
    };
  }

  if (activeForms.length <= 1) {
    return {
      ok: false,
      reason: "last-active",
    };
  }

  if (linkedInquiries.length) {
    return {
      ok: false,
      reason: "has-inquiries",
    };
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .delete(businessInquiryForms)
      .where(
        and(
          eq(businessInquiryForms.businessId, businessId),
          eq(businessInquiryForms.id, targetFormId),
        ),
      );

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      actorUserId,
      type: "business.inquiry_form_deleted",
      summary: `Inquiry form deleted: ${targetForm.slug}.`,
      metadata: {
        inquiryFormId: targetFormId,
        inquiryFormSlug: targetForm.slug,
      },
      createdAt: now,
      updatedAt: now,
    });
  });

  return {
    ok: true,
    businessSlug: business.slug,
    formSlug: targetForm.slug,
  };
}

export async function setBusinessInquiryFormPublicState({
  businessId,
  actorUserId,
  targetFormId,
  publicInquiryEnabled,
}: SetBusinessInquiryFormPublicStateInput): Promise<BusinessInquiryFormMutationResult> {
  const [businessRows, targetFormRows] = await Promise.all([
    db
      .select({
        id: businesses.id,
        slug: businesses.slug,
      })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1),
    db
      .select({
        id: businessInquiryForms.id,
        slug: businessInquiryForms.slug,
        isDefault: businessInquiryForms.isDefault,
      })
      .from(businessInquiryForms)
      .where(
        and(
          eq(businessInquiryForms.businessId, businessId),
          eq(businessInquiryForms.id, targetFormId),
          isNull(businessInquiryForms.archivedAt),
        ),
      )
      .limit(1),
  ]);

  const business = businessRows[0];
  const targetForm = targetFormRows[0];

  if (!business || !targetForm) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  if (!publicInquiryEnabled && targetForm.isDefault) {
    return {
      ok: false,
      reason: "invalid-target",
    };
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(businessInquiryForms)
      .set({
        publicInquiryEnabled,
        updatedAt: now,
      })
      .where(
        and(
          eq(businessInquiryForms.businessId, businessId),
          eq(businessInquiryForms.id, targetFormId),
        ),
      );

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      actorUserId,
      type: "business.inquiry_form_page_updated",
      summary: publicInquiryEnabled
        ? `Inquiry form published: ${targetForm.slug}.`
        : `Inquiry form unpublished: ${targetForm.slug}.`,
      metadata: {
        inquiryFormId: targetFormId,
        inquiryFormSlug: targetForm.slug,
        publicInquiryEnabled,
      },
      createdAt: now,
      updatedAt: now,
    });
  });

  return {
    ok: true,
    businessSlug: business.slug,
    formSlug: targetForm.slug,
  };
}
