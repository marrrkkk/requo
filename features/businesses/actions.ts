"use server";

import { revalidatePath, updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getValidationActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import {
  getBusinessAnalyticsCacheTags,
  getBusinessInquiryFormsCacheTags,
  getBusinessInquiryListCacheTags,
  getBusinessMembersCacheTags,
  getBusinessOverviewCacheTags,
  getBusinessQuoteListCacheTags,
  getBusinessSettingsCacheTags,
  uniqueCacheTags,
} from "@/lib/cache/business-tags";
import { getBusinessActionContext } from "@/lib/db/business-access";
import { getBusinessMembershipsForUser } from "@/lib/db/business-access";
import {
  archiveBusiness,
  createBusinessForUser,
  restoreBusiness,
  trashBusiness,
  unarchiveBusiness,
} from "@/features/businesses/mutations";
import {
  getBusinessQuotaExceededMessage,
  getBusinessQuotaForUser,
  isBusinessQuotaExceededError,
} from "@/features/businesses/quota";
import { recordRecentlyOpenedBusiness } from "@/features/businesses/recently-opened";
import {
  createBusinessSchema,
  recentlyOpenedBusinessSchema,
} from "@/features/businesses/schemas";
import {
  activeBusinessSlugCookieName,
  businessesHubPath,
  getBusinessDashboardPath,
  getBusinessFormsPath,
  getBusinessPath,
  getBusinessSettingsPath,
} from "@/features/businesses/routes";
import type {
  BusinessRecordActionState,
  CreateBusinessActionState,
} from "@/features/businesses/types";
import type { BusinessPlan as plan } from "@/lib/plans/plans";

const initialCreateState: CreateBusinessActionState = {};
const initialBusinessRecordState: BusinessRecordActionState = {};

function updateBusinessCacheTags(businessId: string) {
  for (const tag of uniqueCacheTags([
    ...getBusinessSettingsCacheTags(businessId),
    ...getBusinessMembersCacheTags(businessId),
    ...getBusinessInquiryFormsCacheTags(businessId),
    ...getBusinessInquiryListCacheTags(businessId),
    ...getBusinessQuoteListCacheTags(businessId),
    ...getBusinessAnalyticsCacheTags(businessId),
    ...getBusinessOverviewCacheTags(businessId),
  ])) {
    updateTag(tag);
  }
}

function revalidateBusinessLifecyclePaths({
  businessSlug,
}: {
  businessSlug: string;
}) {
  revalidatePath(businessesHubPath);
  revalidatePath(getBusinessPath(businessSlug));
  revalidatePath(getBusinessSettingsPath(businessSlug));
  revalidatePath(getBusinessDashboardPath(businessSlug), "layout");
  revalidatePath(getBusinessSettingsPath(businessSlug));
  revalidatePath(getBusinessSettingsPath(businessSlug, "general"));
  revalidatePath(getBusinessFormsPath(businessSlug));
  revalidatePath(`/inquire/${businessSlug}`);
}

async function clearActiveBusinessCookieIfNeeded(businessSlug: string) {
  const cookieStore = await cookies();

  if (cookieStore.get(activeBusinessSlugCookieName)?.value === businessSlug) {
    cookieStore.delete(activeBusinessSlugCookieName);
  }
}

export async function recordRecentlyOpenedBusinessAction(
  businessSlug: string,
): Promise<{ ok: boolean }> {
  const validationResult = recentlyOpenedBusinessSchema.safeParse({
    businessSlug,
  });

  if (!validationResult.success) {
    return { ok: false };
  }

  const access = await getBusinessActionContext({
    businessSlug: validationResult.data.businessSlug,
    minimumRole: "staff",
  });

  if (!access.ok) {
    return { ok: false };
  }

  try {
    await recordRecentlyOpenedBusiness({
      businessId: access.businessContext.business.id,
      userId: access.user.id,
    });
    revalidatePath(businessesHubPath);

    return { ok: true };
  } catch (error) {
    console.error("Failed to record recently opened business.", error);

    return { ok: false };
  }
}

export async function createBusinessAction(
  prevState: CreateBusinessActionState = initialCreateState,
  formData: FormData,
): Promise<CreateBusinessActionState> {
  void prevState;

  const user = await requireUser();
  const validationResult = createBusinessSchema.safeParse({
    name: formData.get("name"),
    businessType: formData.get("businessType"),
    defaultCurrency: formData.get("defaultCurrency"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the highlighted fields and try again.",
    );
  }

  const businessAllowance = await getBusinessQuotaForUser({
    ownerUserId: user.id,
    plan: "free" as plan,
  });

  if (!businessAllowance.allowed) {
    return {
      error: getBusinessQuotaExceededMessage(businessAllowance),
    };
  }

  let dashboardPath: string | null = null;

  try {
    const business = await createBusinessForUser({
      user,
      businessId: `biz_${crypto.randomUUID().replace(/-/g, "")}`,
      defaultCurrency: validationResult.data.defaultCurrency,
      name: validationResult.data.name,
      businessType: validationResult.data.businessType,
      plan: "free" as plan,
    });

    dashboardPath = getBusinessDashboardPath(business.slug);
  } catch (error) {
    if (isBusinessQuotaExceededError(error)) {
      return {
        error: getBusinessQuotaExceededMessage(error.quota),
      };
    }

    console.error("Failed to create business.", error);

    return {
      error: "We couldn't create that business right now.",
    };
  }

  if (dashboardPath) {
    redirect(dashboardPath);
  }

  return {
    error: "We couldn't create that business right now.",
  };
}


export async function archiveBusinessAction(
  businessId: string,
  businessSlug: string,
  _prevState: BusinessRecordActionState = initialBusinessRecordState,
  _formData: FormData,
): Promise<BusinessRecordActionState> {
  void _prevState;
  void _formData;

  const ownerAccess = await getBusinessActionContext({
    businessSlug,
    minimumRole: "owner",
    unauthorizedMessage: "Only the business owner can do that.",
  });

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  return archiveScopedBusiness(
    ownerAccess.user.id,
    ownerAccess.businessContext.business.id,
    businessSlug,
  );
}

async function archiveScopedBusiness(
  actorUserId: string,
  scopedBusinessId: string,
  businessSlug: string,
): Promise<BusinessRecordActionState> {
  try {
    const result = await archiveBusiness({
      businessId: scopedBusinessId,
      actorUserId,
    });

    if (!result.ok) {
      if (result.reason === "trash-required") {
        return {
          error: "Restore this business from trash before archiving it again.",
        };
      }

      if (result.reason === "already-archived") {
        return {
          success: "Business archived.",
        };
      }

      return {
        error: "That business could not be found.",
      };
    }

    await clearActiveBusinessCookieIfNeeded(businessSlug);
    updateBusinessCacheTags(scopedBusinessId);
    revalidateBusinessLifecyclePaths({
      businessSlug: result.businessSlug,
    });

    return {
      success: "Business archived.",
    };
  } catch (error) {
    console.error("Failed to archive business.", error);

    return {
      error: "We couldn't archive the business right now.",
    };
  }
}

export async function unarchiveBusinessAction(
  businessId: string,
  businessSlug: string,
  _prevState: BusinessRecordActionState = initialBusinessRecordState,
  _formData: FormData,
): Promise<BusinessRecordActionState> {
  void _prevState;
  void _formData;

  const ownerAccess = await getBusinessActionContext({
    businessSlug,
    minimumRole: "owner",
    unauthorizedMessage: "Only the business owner can do that.",
  });

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  try {
    const result = await unarchiveBusiness({
      businessId,
      actorUserId: ownerAccess.user.id,
    });

    if (!result.ok) {
      if (result.reason === "already-active") {
        return {
          success: "Business restored to active.",
        };
      }

      if (result.reason === "trash-required") {
        return {
          error: "Use restore to bring this business back from trash.",
        };
      }

      return {
        error: "That business could not be found.",
      };
    }

    updateBusinessCacheTags(ownerAccess.businessContext.business.id);
    revalidateBusinessLifecyclePaths({
      businessSlug: result.businessSlug,
    });

    return {
      success: "Business restored to active.",
    };
  } catch (error) {
    console.error("Failed to restore archived business.", error);

    return {
      error: "We couldn't restore the business right now.",
    };
  }
}

export async function trashBusinessAction(
  businessId: string,
  businessSlug: string,
  _prevState: BusinessRecordActionState = initialBusinessRecordState,
  formData: FormData,
): Promise<BusinessRecordActionState> {
  void _prevState;

  const ownerAccess = await getBusinessActionContext({
    businessSlug,
    minimumRole: "owner",
    unauthorizedMessage: "Only the business owner can do that.",
  });

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const confirmationValue = formData.get("confirmation");
  const confirmation =
    typeof confirmationValue === "string" && confirmationValue.trim().length > 0
      ? confirmationValue
      : null;

  try {
    const result = await trashBusiness({
      businessId,
      actorUserId: ownerAccess.user.id,
      confirmation,
    });

    if (!result.ok) {
      if (result.reason === "confirmation-mismatch") {
        return {
          error: "Type the exact business name to move it to trash.",
          fieldErrors: {
            confirmation: ["This does not match the business name."],
          },
        };
      }

      if (result.reason === "already-trash") {
        return {
          success: "Business moved to trash.",
        };
      }

      if (result.reason === "last-active") {
        return {
          error: "Keep at least one active business.",
        };
      }

      return {
        error: "That business could not be found.",
      };
    }

    await clearActiveBusinessCookieIfNeeded(businessSlug);
    updateBusinessCacheTags(ownerAccess.businessContext.business.id);
    revalidateBusinessLifecyclePaths({
      businessSlug: result.businessSlug,
    });

    return {
      success: "Business moved to trash.",
    };
  } catch (error) {
    console.error("Failed to move business to trash.", error);

    return {
      error: "We couldn't move the business to trash right now.",
    };
  }
}

export async function restoreBusinessAction(
  businessId: string,
  businessSlug: string,
  _prevState: BusinessRecordActionState = initialBusinessRecordState,
  _formData: FormData,
): Promise<BusinessRecordActionState> {
  void _prevState;
  void _formData;

  const ownerAccess = await getBusinessActionContext({
    businessSlug,
    minimumRole: "owner",
    unauthorizedMessage: "Only the business owner can do that.",
  });

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  try {
    const result = await restoreBusiness({
      businessId,
      actorUserId: ownerAccess.user.id,
    });

    if (!result.ok) {
      if (result.reason === "already-active") {
        return {
          success: "Business restored.",
        };
      }

      return {
        error: "That business could not be found.",
      };
    }

    updateBusinessCacheTags(ownerAccess.businessContext.business.id);
    revalidateBusinessLifecyclePaths({
      businessSlug: result.businessSlug,
    });

    return {
      success: "Business restored.",
    };
  } catch (error) {
    console.error("Failed to restore business from trash.", error);

    return {
      error: "We couldn't restore the business right now.",
    };
  }
}
