"use server";

import { redirect } from "next/navigation";

import { getValidationActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { createBusinessSchema } from "@/features/businesses/schemas";
import { createBusinessForUser } from "@/features/businesses/mutations";
import { getBusinessDashboardPath } from "@/features/businesses/routes";
import type { CreateBusinessActionState } from "@/features/businesses/types";

const initialState: CreateBusinessActionState = {};

export async function createBusinessAction(
  prevState: CreateBusinessActionState = initialState,
  formData: FormData,
): Promise<CreateBusinessActionState> {
  void prevState;

  const user = await requireUser();
  const validationResult = createBusinessSchema.safeParse({
    name: formData.get("name"),
    businessType: formData.get("businessType"),
    countryCode: formData.get("countryCode"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the highlighted fields and try again.",
    );
  }

  let dashboardPath: string | null = null;

  try {
    const business = await createBusinessForUser({
      user,
      countryCode: validationResult.data.countryCode,
      name: validationResult.data.name,
      businessType: validationResult.data.businessType,
    });

    dashboardPath = getBusinessDashboardPath(business.slug);
  } catch (error) {
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
