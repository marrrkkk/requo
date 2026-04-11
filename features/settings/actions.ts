"use server";

import { revalidatePath, updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getValidationActionState } from "@/lib/action-state";
import {
  getBusinessInquiryFormCacheTags,
  getBusinessInquiryFormsCacheTags,
  getBusinessSettingsCacheTags,
  uniqueCacheTags,
} from "@/lib/cache/business-tags";
import {
  businessDeleteSchema,
  businessGeneralSettingsSchema,
  businessInquiryFormCreateSchema,
  businessInquiryFormPresetSchema,
  businessInquiryFormSettingsSchema,
  businessInquiryFormTargetSchema,
  businessInquiryPageSettingsSchema,
  businessNotificationSettingsSchema,
  businessQuoteSettingsSchema,
} from "@/features/settings/schemas";
import type {
  BusinessDeleteActionState,
  BusinessInquiryFormActionState,
  BusinessInquiryFormDangerActionState,
  BusinessInquiryFormsActionState,
  BusinessInquiryPageActionState,
  BusinessNotificationSettingsActionState,
  BusinessQuoteSettingsActionState,
  BusinessSettingsActionState,
} from "@/features/settings/types";
import {
  archiveBusinessInquiryForm,
  createBusinessInquiryForm,
  deleteBusiness,
  deleteBusinessInquiryForm,
  duplicateBusinessInquiryForm,
  setBusinessInquiryFormPublicState,
  applyBusinessInquiryFormPreset,
  setDefaultBusinessInquiryForm,
  updateBusinessInquiryFormSettings,
  updateBusinessInquiryPageSettings,
  updateBusinessNotificationSettings,
  updateBusinessQuoteSettings,
  updateBusinessSettings,
} from "@/features/settings/mutations";
import { getOwnerBusinessActionContext } from "@/lib/db/business-access";
import {
  activeBusinessSlugCookieName,
  getBusinessDashboardPath,
  getBusinessFormsPath,
  getBusinessInquiryFormEditorPath,
  getBusinessInquiryFormPreviewPath,
  getBusinessInquiryFormsPath,
  getBusinessInquiryPageEditorPath,
  getBusinessPath,
  getBusinessSettingsPath,
  businessesHubPath,
} from "@/features/businesses/routes";
import { getBusinessPublicInquiryUrl } from "@/features/settings/utils";
import { getBusinessInquiryFormsSettingsForBusiness } from "@/features/settings/queries";

function updateCacheTags(tags: string[]) {
  for (const tag of uniqueCacheTags(tags)) {
    updateTag(tag);
  }
}

function revalidateBusinessInquiryFormPaths(
  businessSlug: string,
  formSlug: string,
) {
  revalidatePath(getBusinessInquiryFormsPath(businessSlug));
  revalidatePath(getBusinessInquiryFormEditorPath(businessSlug, formSlug));
  revalidatePath(getBusinessInquiryPageEditorPath(businessSlug, formSlug));
  revalidatePath(getBusinessInquiryFormPreviewPath(businessSlug, formSlug));
  revalidatePath(getBusinessPublicInquiryUrl(businessSlug, formSlug));
}

function revalidateBusinessDefaultInquiryPaths(businessSlug: string) {
  revalidatePath(getBusinessPublicInquiryUrl(businessSlug));
  revalidatePath(`${getBusinessSettingsPath(businessSlug)}/inquiry-form`);
  revalidatePath(`${getBusinessSettingsPath(businessSlug)}/inquiry-page`);
  revalidatePath(`${getBusinessSettingsPath(businessSlug)}/inquiry-page/preview`);
  revalidatePath(`${getBusinessPath(businessSlug)}/preview/inquiry-page`);
}

export async function updateBusinessSettingsAction(
  _prevState: BusinessSettingsActionState,
  formData: FormData,
): Promise<BusinessSettingsActionState> {
  const ownerAccess = await getOwnerBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;

  const validationResult = businessGeneralSettingsSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    countryCode: formData.get("countryCode"),
    shortDescription: formData.get("shortDescription"),
    contactEmail: formData.get("contactEmail"),
    defaultCurrency: formData.get("defaultCurrency"),
    defaultEmailSignature: formData.get("defaultEmailSignature"),
    aiTonePreference: formData.get("aiTonePreference"),
    logo: formData.get("logo"),
    removeLogo: formData.get("removeLogo"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Check the highlighted settings and try again.");
  }

  let nextSettingsPath: string | null = null;

  try {
    const result = await updateBusinessSettings({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      values: validationResult.data,
    });

    if (!result.ok) {
      if (result.reason === "slug-taken") {
        return {
          error: "Choose a different public slug.",
          fieldErrors: {
            slug: ["This public slug is already in use."],
          },
        };
      }

      return {
        error: "That business could not be found.",
      };
    }

    revalidatePath(getBusinessDashboardPath(result.previousSlug), "layout");
    revalidatePath(getBusinessDashboardPath(result.nextSlug), "layout");
    revalidatePath(getBusinessSettingsPath(result.previousSlug));
    revalidatePath(getBusinessSettingsPath(result.nextSlug));
    revalidatePath(getBusinessSettingsPath(result.previousSlug, "general"));
    revalidatePath(getBusinessSettingsPath(result.nextSlug, "general"));
    revalidatePath(getBusinessSettingsPath(result.previousSlug, "notifications"));
    revalidatePath(getBusinessSettingsPath(result.nextSlug, "notifications"));
    revalidatePath(getBusinessSettingsPath(result.previousSlug, "security"));
    revalidatePath(getBusinessSettingsPath(result.nextSlug, "security"));
    revalidatePath(getBusinessSettingsPath(result.previousSlug, "replies"));
    revalidatePath(getBusinessSettingsPath(result.nextSlug, "replies"));
    revalidatePath(getBusinessSettingsPath(result.previousSlug, "quote"));
    revalidatePath(getBusinessSettingsPath(result.nextSlug, "quote"));
    revalidatePath(getBusinessSettingsPath(result.previousSlug, "pricing"));
    revalidatePath(getBusinessSettingsPath(result.nextSlug, "pricing"));
    revalidatePath(getBusinessSettingsPath(result.previousSlug, "knowledge"));
    revalidatePath(getBusinessSettingsPath(result.nextSlug, "knowledge"));
    revalidatePath(getBusinessFormsPath(result.previousSlug));
    revalidatePath(getBusinessFormsPath(result.nextSlug));
    revalidatePath(`/inquire/${result.previousSlug}`);
    revalidatePath(`/inquire/${result.nextSlug}`);
    revalidateBusinessDefaultInquiryPaths(result.previousSlug);
    revalidateBusinessDefaultInquiryPaths(result.nextSlug);

    const inquiryFormsSettings = await getBusinessInquiryFormsSettingsForBusiness(
      businessContext.business.id,
    );

    if (inquiryFormsSettings) {
      for (const form of inquiryFormsSettings.forms) {
        revalidateBusinessInquiryFormPaths(result.previousSlug, form.slug);
        revalidateBusinessInquiryFormPaths(result.nextSlug, form.slug);
      }
    }

    if (result.previousSlug !== result.nextSlug) {
      nextSettingsPath = getBusinessSettingsPath(result.nextSlug, "general");
    }

    updateCacheTags(getBusinessSettingsCacheTags(businessContext.business.id));
  } catch (error) {
    console.error("Failed to update business settings.", error);

    return {
      error: "We couldn't save those settings right now.",
    };
  }

  if (nextSettingsPath) {
    redirect(nextSettingsPath);
  }

  return {
    success: "Business settings saved.",
  };
}

export async function updateBusinessNotificationSettingsAction(
  _prevState: BusinessNotificationSettingsActionState,
  formData: FormData,
): Promise<BusinessNotificationSettingsActionState> {
  const ownerAccess = await getOwnerBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;
  const validationResult = businessNotificationSettingsSchema.safeParse({
    notifyOnNewInquiry: formData.get("notifyOnNewInquiry"),
    notifyOnQuoteSent: formData.get("notifyOnQuoteSent"),
    notifyOnQuoteResponse: formData.get("notifyOnQuoteResponse"),
    notifyInAppOnNewInquiry: formData.get("notifyInAppOnNewInquiry"),
    notifyInAppOnQuoteResponse: formData.get("notifyInAppOnQuoteResponse"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the notification settings and try again.",
    );
  }

  try {
    const result = await updateBusinessNotificationSettings({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      values: validationResult.data,
    });

    if (!result.ok) {
      return {
        error: "That business could not be found.",
      };
    }

    updateCacheTags(getBusinessSettingsCacheTags(businessContext.business.id));
  } catch (error) {
    console.error("Failed to update business notification settings.", error);

    return {
      error: "We couldn't save the notification settings right now.",
    };
  }

  return {
    success: "Notification settings saved.",
  };
}

export async function updateBusinessQuoteSettingsAction(
  _prevState: BusinessQuoteSettingsActionState,
  formData: FormData,
): Promise<BusinessQuoteSettingsActionState> {
  const ownerAccess = await getOwnerBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;
  const validationResult = businessQuoteSettingsSchema.safeParse({
    defaultQuoteNotes: formData.get("defaultQuoteNotes"),
    defaultQuoteValidityDays: formData.get("defaultQuoteValidityDays"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the quote settings and try again.",
    );
  }

  try {
    const result = await updateBusinessQuoteSettings({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      values: validationResult.data,
    });

    if (!result.ok) {
      return {
        error: "That business could not be found.",
      };
    }

    updateCacheTags(getBusinessSettingsCacheTags(businessContext.business.id));

    return {
      success: "Quote settings saved.",
    };
  } catch (error) {
    console.error("Failed to update business quote settings.", error);

    return {
      error: "We couldn't save the quote settings right now.",
    };
  }
}

export async function deleteBusinessAction(
  _prevState: BusinessDeleteActionState,
  formData: FormData,
): Promise<BusinessDeleteActionState> {
  const ownerAccess = await getOwnerBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;
  const validationResult = businessDeleteSchema.safeParse({
    confirmation: formData.get("confirmation"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Type the business name to continue.",
    );
  }

  let shouldRedirect = false;

  try {
    const result = await deleteBusiness({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      values: validationResult.data,
    });

    if (!result.ok) {
      if (result.reason === "confirmation-mismatch") {
        return {
          error: "Type the exact business name to delete it.",
          fieldErrors: {
            confirmation: ["This does not match the business name."],
          },
        };
      }

      return {
        error: "That business could not be found.",
      };
    }

    const cookieStore = await cookies();

    cookieStore.delete(activeBusinessSlugCookieName);

    revalidatePath(businessesHubPath);
    shouldRedirect = true;
  } catch (error) {
    console.error("Failed to delete business.", error);

    return {
      error: "We couldn't delete the business right now.",
    };
  }

  if (shouldRedirect) {
    redirect(businessesHubPath);
  }

  return {
    error: "We couldn't delete the business right now.",
  };
}

export async function updateBusinessInquiryPageAction(
  _formSlug: string,
  _prevState: BusinessInquiryPageActionState,
  formData: FormData,
): Promise<BusinessInquiryPageActionState> {
  const ownerAccess = await getOwnerBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;

  const validationResult = businessInquiryPageSettingsSchema.safeParse({
    formId: formData.get("formId"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    businessType: formData.get("businessType"),
    publicInquiryEnabled: formData.get("publicInquiryEnabled"),
    template: formData.get("template"),
    eyebrow: formData.get("eyebrow"),
    headline: formData.get("headline"),
    description: formData.get("description"),
    brandTagline: formData.get("brandTagline"),
    formTitle: formData.get("formTitle"),
    formDescription: formData.get("formDescription"),
    showcaseImageUrl: formData.get("showcaseImageUrl"),
    showcaseImageFrame: formData.get("showcaseImageFrame"),
    showcaseImageSize: formData.get("showcaseImageSize"),
    showcaseImageCropX: formData.get("showcaseImageCropX"),
    showcaseImageCropY: formData.get("showcaseImageCropY"),
    showcaseImageCropZoom: formData.get("showcaseImageCropZoom"),
    cards: formData.get("cards"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the inquiry page details and try again.",
    );
  }

  try {
    const result = await updateBusinessInquiryPageSettings({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      values: validationResult.data,
    });

    if (!result.ok) {
      if (result.reason === "slug-taken") {
        return {
          error: "Choose a different form slug.",
          fieldErrors: {
            slug: ["This form slug is already in use in this business."],
          },
        };
      }

      return {
        error: "That business could not be found.",
      };
    }

    updateCacheTags(
      uniqueCacheTags([
        ...getBusinessInquiryFormsCacheTags(businessContext.business.id),
        ...getBusinessInquiryFormCacheTags(
          businessContext.business.id,
          result.previousFormSlug,
        ),
        ...getBusinessInquiryFormCacheTags(
          businessContext.business.id,
          result.nextFormSlug,
        ),
      ]),
    );

    revalidateBusinessInquiryFormPaths(result.nextSlug, result.nextFormSlug);
    revalidateBusinessDefaultInquiryPaths(result.nextSlug);

    if (result.previousFormSlug !== result.nextFormSlug) {
      revalidateBusinessInquiryFormPaths(result.nextSlug, result.previousFormSlug);
      revalidateBusinessDefaultInquiryPaths(result.nextSlug);

      redirect(
        `${getBusinessInquiryPageEditorPath(
          result.nextSlug,
          result.nextFormSlug,
        )}?section=page`,
      );
    }

    return {
      success: "Inquiry page saved.",
    };
  } catch (error) {
    console.error("Failed to update business inquiry page settings.", error);

    return {
      error: "We couldn't save the inquiry page right now.",
    };
  }
}

export async function updateBusinessInquiryFormAction(
  _formSlug: string,
  _prevState: BusinessInquiryFormActionState,
  formData: FormData,
): Promise<BusinessInquiryFormActionState> {
  const ownerAccess = await getOwnerBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;

  const validationResult = businessInquiryFormSettingsSchema.safeParse({
    formId: formData.get("formId"),
    businessType: formData.get("businessType"),
    inquiryFormConfig: formData.get("inquiryFormConfig"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the inquiry form and try again.",
    );
  }

  let nextEditorPath: string | null = null;

  try {
    const result = await updateBusinessInquiryFormSettings({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      values: validationResult.data,
    });

    if (!result.ok) {
      return {
        error: "That business could not be found.",
      };
    }

    updateCacheTags(
      uniqueCacheTags([
        ...getBusinessInquiryFormsCacheTags(businessContext.business.id),
        ...getBusinessInquiryFormCacheTags(
          businessContext.business.id,
          result.previousFormSlug,
        ),
        ...getBusinessInquiryFormCacheTags(
          businessContext.business.id,
          result.nextFormSlug,
        ),
      ]),
    );

    // Always revalidate public + dashboard paths so changes
    // like group label edits reflect on the live form.
    revalidateBusinessInquiryFormPaths(result.nextSlug, result.nextFormSlug);
    revalidateBusinessDefaultInquiryPaths(result.nextSlug);

    if (result.previousFormSlug !== result.nextFormSlug) {
      revalidateBusinessInquiryFormPaths(result.nextSlug, result.previousFormSlug);
      revalidateBusinessInquiryFormPaths(result.nextSlug, result.nextFormSlug);
      revalidateBusinessDefaultInquiryPaths(result.nextSlug);
      nextEditorPath = getBusinessInquiryFormEditorPath(
        result.nextSlug,
        result.nextFormSlug,
      );
    }
  } catch (error) {
    console.error("Failed to update business inquiry form settings.", error);

    return {
      error: "We couldn't save the inquiry form right now.",
    };
  }

  if (nextEditorPath) {
    redirect(nextEditorPath);
  }

  return {
    success: "Inquiry form saved.",
  };
}

export async function applyBusinessInquiryFormPresetAction(
  formSlug: string,
  _prevState: BusinessInquiryFormActionState,
  formData: FormData,
): Promise<BusinessInquiryFormActionState> {
  const ownerAccess = await getOwnerBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;

  const validationResult = businessInquiryFormPresetSchema.safeParse({
    formId: formData.get("formId"),
    businessType: formData.get("businessType"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Choose a starter template and try again.",
    );
  }

  try {
    const result = await applyBusinessInquiryFormPreset({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      values: validationResult.data,
    });

    if (!result.ok) {
      return {
        error: "That business could not be found.",
      };
    }

    updateCacheTags(
      uniqueCacheTags([
        ...getBusinessInquiryFormsCacheTags(businessContext.business.id),
        ...getBusinessInquiryFormCacheTags(businessContext.business.id, formSlug),
      ]),
    );

    return {
      success: "Preset defaults applied.",
    };
  } catch (error) {
    console.error("Failed to apply business inquiry preset.", error);

    return {
      error: "We couldn't apply the preset right now.",
    };
  }
}

export async function createBusinessInquiryFormAction(
  _prevState: BusinessInquiryFormsActionState,
  formData: FormData,
): Promise<BusinessInquiryFormsActionState> {
  const ownerAccess = await getOwnerBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;
  const validationResult = businessInquiryFormCreateSchema.safeParse({
    name: formData.get("name"),
    businessType: formData.get("businessType"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the form details and try again.",
    );
  }

  let editorPath: string | null = null;

  try {
    const result = await createBusinessInquiryForm({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      values: validationResult.data,
    });

    if (!result.ok) {
      return {
        error: "That business could not be found.",
      };
    }

    updateCacheTags(
      uniqueCacheTags([
        ...getBusinessInquiryFormsCacheTags(businessContext.business.id),
        ...getBusinessInquiryFormCacheTags(
          businessContext.business.id,
          result.formSlug,
        ),
      ]),
    );
    revalidateBusinessInquiryFormPaths(result.businessSlug, result.formSlug);
    editorPath = getBusinessInquiryFormEditorPath(
      result.businessSlug,
      result.formSlug,
    );
  } catch (error) {
    console.error("Failed to create inquiry form.", error);

    return {
      error: "We couldn't create the inquiry form right now.",
    };
  }

  if (editorPath) {
    redirect(editorPath);
  }

  return {
    error: "We couldn't create the inquiry form right now.",
  };
}

export async function duplicateBusinessInquiryFormAction(
  _prevState: BusinessInquiryFormsActionState,
  formData: FormData,
): Promise<BusinessInquiryFormsActionState> {
  const ownerAccess = await getOwnerBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;
  const validationResult = businessInquiryFormTargetSchema.safeParse({
    targetFormId: formData.get("targetFormId"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Choose a form and try again.");
  }

  let editorPath: string | null = null;

  try {
    const result = await duplicateBusinessInquiryForm({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      targetFormId: validationResult.data.targetFormId,
    });

    if (!result.ok) {
      if (result.reason === "invalid-target") {
        return {
          error: "Default forms must stay published.",
        };
      }

      return {
        error: "That inquiry form could not be found.",
      };
    }

    updateCacheTags(
      uniqueCacheTags([
        ...getBusinessInquiryFormsCacheTags(businessContext.business.id),
        ...getBusinessInquiryFormCacheTags(
          businessContext.business.id,
          result.formSlug,
        ),
      ]),
    );
    revalidateBusinessInquiryFormPaths(result.businessSlug, result.formSlug);
    editorPath = getBusinessInquiryFormEditorPath(
      result.businessSlug,
      result.formSlug,
    );
  } catch (error) {
    console.error("Failed to duplicate inquiry form.", error);

    return {
      error: "We couldn't duplicate the inquiry form right now.",
    };
  }

  if (editorPath) {
    redirect(editorPath);
  }

  return {
    error: "We couldn't duplicate the inquiry form right now.",
  };
}

export async function setDefaultBusinessInquiryFormAction(
  _prevState: BusinessInquiryFormsActionState,
  formData: FormData,
): Promise<BusinessInquiryFormsActionState> {
  const ownerAccess = await getOwnerBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;
  const validationResult = businessInquiryFormTargetSchema.safeParse({
    targetFormId: formData.get("targetFormId"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Choose a form and try again.");
  }

  try {
    const result = await setDefaultBusinessInquiryForm({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      targetFormId: validationResult.data.targetFormId,
    });

    if (!result.ok) {
      return {
        error: "That inquiry form could not be found.",
      };
    }

    updateCacheTags(
      uniqueCacheTags([
        ...getBusinessInquiryFormsCacheTags(businessContext.business.id),
        ...getBusinessInquiryFormCacheTags(
          businessContext.business.id,
          result.formSlug,
        ),
      ]),
    );
    revalidateBusinessInquiryFormPaths(result.businessSlug, result.formSlug);
    revalidateBusinessDefaultInquiryPaths(result.businessSlug);

    return {
      success: "Default inquiry form updated.",
    };
  } catch (error) {
    console.error("Failed to set default inquiry form.", error);

    return {
      error: "We couldn't change the default inquiry form right now.",
    };
  }
}

export async function archiveBusinessInquiryFormAction(
  _prevState: BusinessInquiryFormsActionState,
  formData: FormData,
): Promise<BusinessInquiryFormsActionState> {
  const ownerAccess = await getOwnerBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;
  const validationResult = businessInquiryFormTargetSchema.safeParse({
    targetFormId: formData.get("targetFormId"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Choose a form and try again.");
  }

  try {
    const result = await archiveBusinessInquiryForm({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      targetFormId: validationResult.data.targetFormId,
    });

    if (!result.ok) {
      if (result.reason === "invalid-target") {
        return {
          error: "Set another form as default before archiving this one.",
        };
      }

      if (result.reason === "last-active") {
        return {
          error: "Keep at least one active inquiry form.",
        };
      }

      return {
        error: "That inquiry form could not be found.",
      };
    }

    updateCacheTags(
      uniqueCacheTags([
        ...getBusinessInquiryFormsCacheTags(businessContext.business.id),
        ...getBusinessInquiryFormCacheTags(
          businessContext.business.id,
          result.formSlug,
        ),
      ]),
    );
    revalidateBusinessInquiryFormPaths(result.businessSlug, result.formSlug);

    return {
      success: "Inquiry form archived.",
    };
  } catch (error) {
    console.error("Failed to archive inquiry form.", error);

    return {
      error: "We couldn't archive the inquiry form right now.",
    };
  }
}

export async function archiveBusinessInquiryFormFromDetailAction(
  _prevState: BusinessInquiryFormDangerActionState,
  formData: FormData,
): Promise<BusinessInquiryFormDangerActionState> {
  const ownerAccess = await getOwnerBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;
  const validationResult = businessInquiryFormTargetSchema.safeParse({
    targetFormId: formData.get("targetFormId"),
  });

  if (!validationResult.success) {
    return {
      error: "That inquiry form could not be found.",
    };
  }

  try {
    const result = await archiveBusinessInquiryForm({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      targetFormId: validationResult.data.targetFormId,
    });

    if (!result.ok) {
      if (result.reason === "invalid-target") {
        return {
          error: "Set another form as default before archiving this one.",
        };
      }

      if (result.reason === "last-active") {
        return {
          error: "Keep at least one active inquiry form.",
        };
      }

      return {
        error: "That inquiry form could not be found.",
      };
    }

    updateCacheTags(
      uniqueCacheTags([
        ...getBusinessInquiryFormsCacheTags(businessContext.business.id),
        ...getBusinessInquiryFormCacheTags(
          businessContext.business.id,
          result.formSlug,
        ),
      ]),
    );
    revalidateBusinessInquiryFormPaths(result.businessSlug, result.formSlug);

    return {
      success: "Inquiry form archived.",
    };
  } catch (error) {
    console.error("Failed to archive inquiry form.", error);

    return {
      error: "We couldn't archive the inquiry form right now.",
    };
  }
}

export async function deleteBusinessInquiryFormAction(
  _prevState: BusinessInquiryFormDangerActionState,
  formData: FormData,
): Promise<BusinessInquiryFormDangerActionState> {
  const ownerAccess = await getOwnerBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;
  const validationResult = businessInquiryFormTargetSchema.safeParse({
    targetFormId: formData.get("targetFormId"),
  });

  if (!validationResult.success) {
    return {
      error: "That inquiry form could not be found.",
    };
  }

  try {
    const result = await deleteBusinessInquiryForm({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      targetFormId: validationResult.data.targetFormId,
    });

    if (!result.ok) {
      if (result.reason === "invalid-target") {
        return {
          error: "Set another form as default before deleting this one.",
        };
      }

      if (result.reason === "last-active") {
        return {
          error: "Keep at least one active inquiry form.",
        };
      }

      if (result.reason === "has-inquiries") {
        return {
          error: "This form already has inquiries. Archive it instead.",
        };
      }

      return {
        error: "That inquiry form could not be found.",
      };
    }

    updateCacheTags(
      uniqueCacheTags([
        ...getBusinessInquiryFormsCacheTags(businessContext.business.id),
        ...getBusinessInquiryFormCacheTags(
          businessContext.business.id,
          result.formSlug,
        ),
      ]),
    );
    revalidateBusinessInquiryFormPaths(result.businessSlug, result.formSlug);

    return {
      success: "Inquiry form deleted.",
    };
  } catch (error) {
    console.error("Failed to delete inquiry form.", error);

    return {
      error: "We couldn't delete the inquiry form right now.",
    };
  }
}

export async function toggleBusinessInquiryFormPublicAction(
  _prevState: BusinessInquiryFormsActionState,
  formData: FormData,
): Promise<BusinessInquiryFormsActionState> {
  const ownerAccess = await getOwnerBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;
  const validationResult = businessInquiryFormTargetSchema.safeParse({
    targetFormId: formData.get("targetFormId"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Choose a form and try again.");
  }

  const publicInquiryEnabled = formData.get("publicInquiryEnabled") === "true";

  try {
    const result = await setBusinessInquiryFormPublicState({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      targetFormId: validationResult.data.targetFormId,
      publicInquiryEnabled,
    });

    if (!result.ok) {
      return {
        error: "That inquiry form could not be found.",
      };
    }

    updateCacheTags(
      uniqueCacheTags([
        ...getBusinessInquiryFormsCacheTags(businessContext.business.id),
        ...getBusinessInquiryFormCacheTags(
          businessContext.business.id,
          result.formSlug,
        ),
      ]),
    );
    revalidateBusinessInquiryFormPaths(result.businessSlug, result.formSlug);
    revalidateBusinessDefaultInquiryPaths(result.businessSlug);

    return {
      success: publicInquiryEnabled
        ? "Form published to the public page."
        : "Form unpublished from the public page.",
    };
  } catch (error) {
    console.error("Failed to toggle public inquiry form state.", error);

    return {
      error: "We couldn't update the form availability right now.",
    };
  }
}
