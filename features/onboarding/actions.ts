"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getValidationActionState } from "@/lib/action-state";
import { getEffectivePlan } from "@/lib/billing/subscription-service";
import { requireUser } from "@/lib/auth/session";
import { auth } from "@/lib/auth/server";
import { getBusinessDashboardPath } from "@/features/businesses/routes";
import {
  completeOnboardingForUser,
  ensureWorkspaceForOnboarding,
  getFirstWorkspaceIdForUser,
  verifyOnboardingPaidPlanForUser,
} from "@/features/onboarding/mutations";
import {
  completeOnboardingSchema,
  onboardingWorkspaceSchema,
} from "@/features/onboarding/schemas";
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
    workspacePlan: formData.get("workspacePlan"),
    businessName: formData.get("businessName"),
    businessType: formData.get("businessType"),
    countryCode: formData.get("countryCode"),
    fullName: formData.get("fullName"),
    jobTitle: formData.get("jobTitle"),
    referralSource: formData.get("referralSource"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the highlighted details and try again.",
    );
  }

  const selectedPlan = validationResult.data.workspacePlan;
  if (selectedPlan === "pro" || selectedPlan === "business") {
    const workspaceId = await getFirstWorkspaceIdForUser(user.id);
    if (!workspaceId) {
      return {
        error:
          "Complete checkout for your selected plan before finishing setup.",
      };
    }

    const effective = await getEffectivePlan(workspaceId);
    if (effective !== selectedPlan) {
      return {
        error:
          "Complete payment for your selected plan before finishing setup.",
      };
    }
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
      workspaceName: validationResult.data.workspaceName,
      workspacePlan: validationResult.data.workspacePlan,
      businessName: validationResult.data.businessName,
      businessType: validationResult.data.businessType,
      countryCode: validationResult.data.countryCode,
      fullName: validationResult.data.fullName,
      jobTitle: validationResult.data.jobTitle,
      referralSource: validationResult.data.referralSource,
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

export async function ensureOnboardingWorkspaceAction(
  formData: FormData,
): Promise<
  | { ok: true; workspaceId: string; workspaceSlug: string }
  | { ok: false; error: string }
> {
  const user = await requireUser();
  const parsed = onboardingWorkspaceSchema.pick({ workspaceName: true }).safeParse({
    workspaceName: formData.get("workspaceName"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Enter a workspace name.",
    };
  }

  try {
    const result = await ensureWorkspaceForOnboarding(
      user,
      parsed.data.workspaceName,
    );
    return { ok: true, ...result };
  } catch (error) {
    console.error("Failed to ensure onboarding workspace.", error);
    return {
      ok: false,
      error: "We couldn't prepare your workspace. Try again.",
    };
  }
}

export async function verifyOnboardingPaidPlanAction(
  workspaceSlug: string,
  expectedPlan: "pro" | "business",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  return verifyOnboardingPaidPlanForUser(user.id, workspaceSlug, expectedPlan);
}
