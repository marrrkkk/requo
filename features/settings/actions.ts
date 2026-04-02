"use server";

import { revalidatePath } from "next/cache";

import { workspaceSettingsSchema } from "@/features/settings/schemas";
import type { WorkspaceSettingsActionState } from "@/features/settings/types";
import { updateWorkspaceSettings } from "@/features/settings/mutations";
import { requireOwnerWorkspaceContext } from "@/lib/db/workspace-access";

export async function updateWorkspaceSettingsAction(
  _prevState: WorkspaceSettingsActionState,
  formData: FormData,
): Promise<WorkspaceSettingsActionState> {
  const { user, workspaceContext } = await requireOwnerWorkspaceContext();

  const validationResult = workspaceSettingsSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    shortDescription: formData.get("shortDescription"),
    contactEmail: formData.get("contactEmail"),
    publicInquiryEnabled: formData.get("publicInquiryEnabled"),
    inquiryHeadline: formData.get("inquiryHeadline"),
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
    return {
      error: "Check the highlighted settings and try again.",
      fieldErrors: validationResult.error.flatten().fieldErrors,
    };
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

    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/settings");
    revalidatePath(`/inquire/${result.previousSlug}`);
    revalidatePath(`/inquire/${result.nextSlug}`);

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
