"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { getValidationActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { uniqueCacheTags } from "@/lib/cache/business-tags";
import {
  getUserBusinessContextCacheTags,
  getUserMembershipsCacheTags,
  getUserProfileCacheTags,
} from "@/lib/cache/shell-tags";
import {
  getBusinessQuotaExceededMessage,
  isBusinessQuotaExceededError,
} from "@/features/businesses/quota";
import {
  dashboardPath,
  getBusinessDashboardPath,
} from "@/features/businesses/routes";
import {
  inquiryFormConfigSchema,
  type InquiryFormConfig,
} from "@/features/inquiries/form-config";
import { completeOnboardingForUser } from "@/features/onboarding/mutations";
import { completeOnboardingSchema } from "@/features/onboarding/schemas";
import type { OnboardingActionState } from "@/features/onboarding/types";
import {
  profileAvatarBucket,
  profileAvatarExtensionToMimeType,
  profileAvatarAllowedExtensions,
  profileAvatarAllowedMimeTypes,
  profileAvatarMaxSize,
  sanitizeProfileAvatarFileName,
} from "@/features/account/utils";
import { isAcceptedFileType, resolveSafeContentType } from "@/lib/files";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const initialState: OnboardingActionState = {};

function parseInquiryFormConfigOverride(
  raw: FormDataEntryValue | null,
): InquiryFormConfig | undefined {
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw);
    const result = inquiryFormConfigSchema.safeParse(parsed);

    return result.success ? (result.data as InquiryFormConfig) : undefined;
  } catch {
    return undefined;
  }
}

function updateOnboardingCacheTags({
  userId,
  businessSlug,
}: {
  userId: string;
  businessSlug: string;
}) {
  for (const tag of uniqueCacheTags([
    ...getUserProfileCacheTags(userId),
    ...getUserMembershipsCacheTags(userId),
    ...getUserBusinessContextCacheTags(userId, businessSlug),
  ])) {
    updateTag(tag);
  }
}

export async function completeOnboardingAction(
  prevState: OnboardingActionState = initialState,
  formData: FormData,
): Promise<OnboardingActionState> {
  void prevState;

  const user = await requireUser();
  const validationResult = completeOnboardingSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    businessName: formData.get("businessName"),
    businessSlug: formData.get("businessSlug"),
    businessType: formData.get("businessType"),
    countryCode: formData.get("countryCode"),
    defaultCurrency: formData.get("defaultCurrency"),
    customerContactChannel: formData.get("customerContactChannel"),
    starterTemplateBusinessType: formData.get("starterTemplateBusinessType"),
    jobTitle: formData.get("jobTitle"),
    companySize: formData.get("companySize"),
    referralSource: formData.get("referralSource"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the highlighted details and try again.",
    );
  }

  const inquiryFormConfigOverride = parseInquiryFormConfigOverride(
    formData.get("inquiryFormConfigOverride"),
  );

  // Handle avatar upload
  const avatarFile = formData.get("avatar");
  let avatarUpload: { storagePath: string; contentType: string } | null = null;

  if (avatarFile instanceof File && avatarFile.size > 0 && avatarFile.name.trim()) {
    if (avatarFile.size > profileAvatarMaxSize) {
      return { error: "Profile photo must be under 2 MB." };
    }

    if (
      !isAcceptedFileType(avatarFile, {
        allowedExtensions: profileAvatarAllowedExtensions,
        allowedMimeTypes: profileAvatarAllowedMimeTypes,
      })
    ) {
      return { error: "Upload a JPG, PNG, or WEBP profile photo." };
    }

    const contentType = resolveSafeContentType(avatarFile, {
      extensionToMimeType: profileAvatarExtensionToMimeType,
      fallback: "application/octet-stream",
    });
    const storagePath = `${user.id}/avatar/onboarding-${crypto.randomUUID()}-${sanitizeProfileAvatarFileName(avatarFile.name)}`;
    const storageClient = createSupabaseAdminClient();

    const { error: uploadError } = await storageClient.storage
      .from(profileAvatarBucket)
      .upload(storagePath, avatarFile, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Failed to upload onboarding avatar.", uploadError);
      return { error: "We couldn't upload your profile photo right now." };
    }

    avatarUpload = { storagePath, contentType };
  }

  let redirectPath: string | null = null;

  try {
    const business = await completeOnboardingForUser({
      user,
      firstName: validationResult.data.firstName,
      lastName: validationResult.data.lastName,
      jobTitle: validationResult.data.jobTitle,
      companySize: validationResult.data.companySize,
      referralSource: validationResult.data.referralSource,
      businessName: validationResult.data.businessName,
      businessSlug: validationResult.data.businessSlug,
      businessType: validationResult.data.businessType,
      countryCode: validationResult.data.countryCode,
      defaultCurrency: validationResult.data.defaultCurrency,
      customerContactChannel: validationResult.data.customerContactChannel,
      starterTemplateBusinessType:
        validationResult.data.starterTemplateBusinessType,
      inquiryFormConfigOverride,
      avatarUpload,
    });

    updateOnboardingCacheTags({
      userId: user.id,
      businessSlug: business.slug,
    });
    revalidatePath(dashboardPath);
    redirectPath = getBusinessDashboardPath(business.slug);
  } catch (error) {
    if (isBusinessQuotaExceededError(error)) {
      return {
        error: getBusinessQuotaExceededMessage(error.quota),
      };
    }

    console.error("Failed to complete onboarding.", error);

    return {
      error: "We couldn't finish setting up your business right now.",
    };
  }

  if (redirectPath) {
    redirect(redirectPath);
  }

  return {
    error: "We couldn't finish setting up your business right now.",
  };
}
