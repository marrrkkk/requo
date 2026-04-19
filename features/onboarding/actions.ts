"use server";

import { redirect } from "next/navigation";

import { getValidationActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { getBusinessDashboardPath } from "@/features/businesses/routes";
import { completeOnboardingForUser } from "@/features/onboarding/mutations";
import { completeOnboardingSchema } from "@/features/onboarding/schemas";
import type { OnboardingActionState } from "@/features/onboarding/types";

const initialState: OnboardingActionState = {};

export async function completeOnboardingAction(
  prevState: OnboardingActionState = initialState,
  formData: FormData,
): Promise<OnboardingActionState> {
  void prevState;

  const user = await requireUser();
  const validationResult = completeOnboardingSchema.safeParse({
    workspaceName: formData.get("workspaceName"),
    businessName: formData.get("businessName"),
    businessType: formData.get("businessType"),
    countryCode: formData.get("countryCode"),
    defaultCurrency: formData.get("defaultCurrency"),
    starterTemplateBusinessType: formData.get("starterTemplateBusinessType"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the highlighted details and try again.",
    );
  }

  let dashboardPath: string | null = null;

  try {
    const business = await completeOnboardingForUser({
      user,
      workspaceName: validationResult.data.workspaceName,
      businessName: validationResult.data.businessName,
      businessType: validationResult.data.businessType,
      countryCode: validationResult.data.countryCode,
      defaultCurrency: validationResult.data.defaultCurrency,
      starterTemplateBusinessType:
        validationResult.data.starterTemplateBusinessType,
    });

    dashboardPath = getBusinessDashboardPath(business.slug);
  } catch (error) {
    console.error("Failed to complete onboarding.", error);

    return {
      error: "We couldn't finish setting up your workspace right now.",
    };
  }

  if (dashboardPath) {
    redirect(dashboardPath);
  }

  return {
    error: "We couldn't finish setting up your workspace right now.",
  };
}
