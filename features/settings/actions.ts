"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getValidationActionState } from "@/lib/action-state";
import {
  workspaceInquiryPageSettingsSchema,
  workspaceSettingsSchema,
} from "@/features/settings/schemas";
import type {
  WorkspaceInquiryPageActionState,
  WorkspaceSettingsActionState,
} from "@/features/settings/types";
import {
  updateWorkspaceInquiryPageSettings,
  updateWorkspaceSettings,
} from "@/features/settings/mutations";
import { getOwnerWorkspaceActionContext } from "@/lib/db/workspace-access";
import {
  getWorkspaceDashboardPath,
  getWorkspaceInquiryPagePreviewPath,
  getWorkspaceSettingsPath,
} from "@/features/workspaces/routes";

export async function updateWorkspaceSettingsAction(
  _prevState: WorkspaceSettingsActionState,
  formData: FormData,
): Promise<WorkspaceSettingsActionState> {
  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, workspaceContext } = ownerAccess;

  const validationResult = workspaceSettingsSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    shortDescription: formData.get("shortDescription"),
    contactEmail: formData.get("contactEmail"),
    defaultEmailSignature: formData.get("defaultEmailSignature"),
    defaultQuoteNotes: formData.get("defaultQuoteNotes"),
    aiTonePreference: formData.get("aiTonePreference"),
    notifyOnNewInquiry: formData.get("notifyOnNewInquiry"),
    notifyOnQuoteSent: formData.get("notifyOnQuoteSent"),
    defaultCurrency: formData.get("defaultCurrency"),
    logo: formData.get("logo"),
    removeLogo: formData.get("removeLogo"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Check the highlighted settings and try again.");
  }

  try {
    const result = await updateWorkspaceSettings({
      workspaceId: workspaceContext.workspace.id,
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
        error: "That workspace could not be found.",
      };
    }

    revalidatePath(getWorkspaceDashboardPath(result.previousSlug), "layout");
    revalidatePath(getWorkspaceDashboardPath(result.nextSlug), "layout");
    revalidatePath(getWorkspaceSettingsPath(result.previousSlug));
    revalidatePath(getWorkspaceSettingsPath(result.nextSlug));
    revalidatePath(getWorkspaceSettingsPath(result.previousSlug, "general"));
    revalidatePath(getWorkspaceSettingsPath(result.nextSlug, "general"));
    revalidatePath(
      getWorkspaceSettingsPath(result.previousSlug, "pricing-library"),
    );
    revalidatePath(getWorkspaceSettingsPath(result.nextSlug, "pricing-library"));
    revalidatePath(getWorkspaceSettingsPath(result.previousSlug, "inquiry-page"));
    revalidatePath(getWorkspaceSettingsPath(result.nextSlug, "inquiry-page"));
    revalidatePath(getWorkspaceInquiryPagePreviewPath(result.previousSlug));
    revalidatePath(getWorkspaceInquiryPagePreviewPath(result.nextSlug));
    revalidatePath(`/inquire/${result.previousSlug}`);
    revalidatePath(`/inquire/${result.nextSlug}`);

    if (result.previousSlug !== result.nextSlug) {
      redirect(getWorkspaceSettingsPath(result.nextSlug));
    }

    return {
      success: "Workspace settings saved.",
    };
  } catch (error) {
    console.error("Failed to update workspace settings.", error);

    return {
      error: "We couldn't save those settings right now.",
    };
  }
}

export async function updateWorkspaceInquiryPageAction(
  _prevState: WorkspaceInquiryPageActionState,
  formData: FormData,
): Promise<WorkspaceInquiryPageActionState> {
  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, workspaceContext } = ownerAccess;

  const validationResult = workspaceInquiryPageSettingsSchema.safeParse({
    publicInquiryEnabled: formData.get("publicInquiryEnabled"),
    template: formData.get("template"),
    eyebrow: formData.get("eyebrow"),
    headline: formData.get("headline"),
    description: formData.get("description"),
    brandTagline: formData.get("brandTagline"),
    formTitle: formData.get("formTitle"),
    formDescription: formData.get("formDescription"),
    cards: formData.get("cards"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the inquiry page details and try again.",
    );
  }

  try {
    const result = await updateWorkspaceInquiryPageSettings({
      workspaceId: workspaceContext.workspace.id,
      actorUserId: user.id,
      values: validationResult.data,
    });

    if (!result.ok) {
      return {
        error: "That workspace could not be found.",
      };
    }

    revalidatePath(getWorkspaceDashboardPath(result.previousSlug), "layout");
    revalidatePath(getWorkspaceDashboardPath(result.nextSlug), "layout");
    revalidatePath(getWorkspaceSettingsPath(result.nextSlug, "inquiry-page"));
    revalidatePath(getWorkspaceInquiryPagePreviewPath(result.nextSlug));
    revalidatePath(`/inquire/${result.nextSlug}`);

    return {
      success: "Inquiry page saved.",
    };
  } catch (error) {
    console.error("Failed to update workspace inquiry page settings.", error);

    return {
      error: "We couldn't save the inquiry page right now.",
    };
  }
}
