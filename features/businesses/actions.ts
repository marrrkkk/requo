"use server";

import { redirect } from "next/navigation";

import { getValidationActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { getWorkspacesForUser } from "@/lib/db/workspace-access";
import { checkUsageAllowance } from "@/lib/plans/usage";
import { createBusinessSchema } from "@/features/businesses/schemas";
import { createBusinessForUser } from "@/features/businesses/mutations";
import { getBusinessDashboardPath } from "@/features/businesses/routes";
import type { CreateBusinessActionState } from "@/features/businesses/types";
import type { WorkspacePlan } from "@/lib/plans";

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
    defaultCurrency: formData.get("defaultCurrency"),
    workspaceId: formData.get("workspaceId"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the highlighted fields and try again.",
    );
  }

  // Resolve the user's workspace
  const userWorkspaces = await getWorkspacesForUser(user.id);
  const workspace = userWorkspaces.find((w) => w.id === validationResult.data.workspaceId);

  if (!workspace) {
    return {
      error: "Selected workspace not found. Please try again.",
    };
  }

  // Check workspace business count limit
  const businessAllowance = await checkUsageAllowance(
    workspace.id,
    workspace.plan as WorkspacePlan,
    "businessesPerWorkspace",
  );

  if (!businessAllowance.allowed) {
    return {
      error: `Your workspace's ${workspace.plan === "free" ? "Free" : "current"} plan supports ${businessAllowance.limit} business${businessAllowance.limit === 1 ? "" : "es"}. Upgrade your workspace to add more.`,
    };
  }

  let dashboardPath: string | null = null;

  try {
    const business = await createBusinessForUser({
      user,
      workspaceId: workspace.id,
      defaultCurrency: validationResult.data.defaultCurrency,
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
