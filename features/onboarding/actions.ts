"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getValidationActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { auth } from "@/lib/auth/server";
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
    businessName: formData.get("businessName"),
    businessType: formData.get("businessType"),
    countryCode: formData.get("countryCode"),
    shortDescription: formData.get("shortDescription"),
    fullName: formData.get("fullName"),
    jobTitle: formData.get("jobTitle"),
    phone: formData.get("phone"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the highlighted details and try again.",
    );
  }

  let dashboardPath: string | null = null;

  try {
    await auth.api.updateUser({
      body: {
        name: validationResult.data.fullName,
      },
      headers: await headers(),
    });

    const business = await completeOnboardingForUser({
      user,
      businessName: validationResult.data.businessName,
      businessType: validationResult.data.businessType,
      countryCode: validationResult.data.countryCode,
      shortDescription: validationResult.data.shortDescription,
      fullName: validationResult.data.fullName,
      jobTitle: validationResult.data.jobTitle,
      phone: validationResult.data.phone,
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
