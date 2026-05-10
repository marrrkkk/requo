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
  businessesHubPath,
  getBusinessDashboardPath,
} from "@/features/businesses/routes";
import {
  inquiryFormConfigSchema,
  type InquiryFormConfig,
} from "@/features/inquiries/form-config";
import { completeOnboardingForUser } from "@/features/onboarding/mutations";
import { completeOnboardingSchema } from "@/features/onboarding/schemas";
import type { OnboardingActionState } from "@/features/onboarding/types";

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
    businessName: formData.get("businessName"),
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

  let dashboardPath: string | null = null;

  try {
    const business = await completeOnboardingForUser({
      user,
      jobTitle: validationResult.data.jobTitle,
      companySize: validationResult.data.companySize,
      referralSource: validationResult.data.referralSource,
      businessName: validationResult.data.businessName,
      businessType: validationResult.data.businessType,
      countryCode: validationResult.data.countryCode,
      defaultCurrency: validationResult.data.defaultCurrency,
      customerContactChannel: validationResult.data.customerContactChannel,
      starterTemplateBusinessType:
        validationResult.data.starterTemplateBusinessType,
      inquiryFormConfigOverride,
    });

    updateOnboardingCacheTags({
      userId: user.id,
      businessSlug: business.slug,
    });
    revalidatePath(businessesHubPath);
    dashboardPath = getBusinessDashboardPath(business.slug);
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

  if (dashboardPath) {
    redirect(dashboardPath);
  }

  return {
    error: "We couldn't finish setting up your business right now.",
  };
}
