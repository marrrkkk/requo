"use server";

import { revalidatePath, updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getValidationActionState } from "@/lib/action-state";
import {
  getWorkspaceInquiryFormCacheTags,
  getWorkspaceInquiryFormsCacheTags,
  getWorkspaceSettingsCacheTags,
  uniqueCacheTags,
} from "@/lib/cache/workspace-tags";
import {
  workspaceDeleteSchema,
  workspaceGeneralSettingsSchema,
  workspaceInquiryFormCreateSchema,
  workspaceInquiryFormPresetSchema,
  workspaceInquiryFormSettingsSchema,
  workspaceInquiryFormTargetSchema,
  workspaceInquiryPageSettingsSchema,
  workspaceQuoteSettingsSchema,
} from "@/features/settings/schemas";
import type {
  WorkspaceDeleteActionState,
  WorkspaceInquiryFormActionState,
  WorkspaceInquiryFormDangerActionState,
  WorkspaceInquiryFormsActionState,
  WorkspaceInquiryPageActionState,
  WorkspaceQuoteSettingsActionState,
  WorkspaceSettingsActionState,
} from "@/features/settings/types";
import {
  archiveWorkspaceInquiryForm,
  createWorkspaceInquiryForm,
  deleteWorkspace,
  deleteWorkspaceInquiryForm,
  duplicateWorkspaceInquiryForm,
  applyWorkspaceInquiryFormPreset,
  setDefaultWorkspaceInquiryForm,
  updateWorkspaceInquiryFormSettings,
  updateWorkspaceInquiryPageSettings,
  updateWorkspaceQuoteSettings,
  updateWorkspaceSettings,
} from "@/features/settings/mutations";
import { getOwnerWorkspaceActionContext } from "@/lib/db/workspace-access";
import {
  activeWorkspaceSlugCookieName,
  getWorkspaceDashboardPath,
  getWorkspaceInquiryFormEditorPath,
  getWorkspaceInquiryFormPreviewPath,
  getWorkspaceInquiryFormsPath,
  getWorkspaceInquiryPageEditorPath,
  getWorkspacePath,
  getWorkspaceSettingsPath,
  workspaceHubPath,
} from "@/features/workspaces/routes";
import { getWorkspacePublicInquiryUrl } from "@/features/settings/utils";
import { getWorkspaceInquiryFormsSettingsForWorkspace } from "@/features/settings/queries";

function updateCacheTags(tags: string[]) {
  for (const tag of uniqueCacheTags(tags)) {
    updateTag(tag);
  }
}

function revalidateWorkspaceInquiryFormPaths(
  workspaceSlug: string,
  formSlug: string,
) {
  revalidatePath(getWorkspaceInquiryFormsPath(workspaceSlug));
  revalidatePath(getWorkspaceInquiryFormEditorPath(workspaceSlug, formSlug));
  revalidatePath(getWorkspaceInquiryPageEditorPath(workspaceSlug, formSlug));
  revalidatePath(getWorkspaceInquiryFormPreviewPath(workspaceSlug, formSlug));
  revalidatePath(getWorkspacePublicInquiryUrl(workspaceSlug, formSlug));
}

function revalidateWorkspaceDefaultInquiryPaths(workspaceSlug: string) {
  revalidatePath(getWorkspacePublicInquiryUrl(workspaceSlug));
  revalidatePath(`${getWorkspaceSettingsPath(workspaceSlug)}/inquiry-form`);
  revalidatePath(`${getWorkspaceSettingsPath(workspaceSlug)}/inquiry-page`);
  revalidatePath(`${getWorkspaceSettingsPath(workspaceSlug)}/inquiry-page/preview`);
  revalidatePath(`${getWorkspacePath(workspaceSlug)}/preview/inquiry-page`);
}

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

  const validationResult = workspaceGeneralSettingsSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    shortDescription: formData.get("shortDescription"),
    contactEmail: formData.get("contactEmail"),
    defaultEmailSignature: formData.get("defaultEmailSignature"),
    aiTonePreference: formData.get("aiTonePreference"),
    notifyOnNewInquiry: formData.get("notifyOnNewInquiry"),
    logo: formData.get("logo"),
    removeLogo: formData.get("removeLogo"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Check the highlighted settings and try again.");
  }

  let nextSettingsPath: string | null = null;

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
    revalidatePath(getWorkspaceSettingsPath(result.previousSlug, "quote"));
    revalidatePath(getWorkspaceSettingsPath(result.nextSlug, "quote"));
    revalidatePath(getWorkspaceSettingsPath(result.previousSlug, "pricing"));
    revalidatePath(getWorkspaceSettingsPath(result.nextSlug, "pricing"));
    revalidatePath(getWorkspaceSettingsPath(result.previousSlug, "knowledge"));
    revalidatePath(getWorkspaceSettingsPath(result.nextSlug, "knowledge"));
    revalidatePath(`/inquire/${result.previousSlug}`);
    revalidatePath(`/inquire/${result.nextSlug}`);
    revalidateWorkspaceDefaultInquiryPaths(result.previousSlug);
    revalidateWorkspaceDefaultInquiryPaths(result.nextSlug);

    const inquiryFormsSettings = await getWorkspaceInquiryFormsSettingsForWorkspace(
      workspaceContext.workspace.id,
    );

    if (inquiryFormsSettings) {
      for (const form of inquiryFormsSettings.forms) {
        revalidateWorkspaceInquiryFormPaths(result.previousSlug, form.slug);
        revalidateWorkspaceInquiryFormPaths(result.nextSlug, form.slug);
      }
    }

    if (result.previousSlug !== result.nextSlug) {
      nextSettingsPath = getWorkspaceSettingsPath(result.nextSlug, "general");
    }

    updateCacheTags(getWorkspaceSettingsCacheTags(workspaceContext.workspace.id));
  } catch (error) {
    console.error("Failed to update workspace settings.", error);

    return {
      error: "We couldn't save those settings right now.",
    };
  }

  if (nextSettingsPath) {
    redirect(nextSettingsPath);
  }

  return {
    success: "Workspace settings saved.",
  };
}

export async function updateWorkspaceQuoteSettingsAction(
  _prevState: WorkspaceQuoteSettingsActionState,
  formData: FormData,
): Promise<WorkspaceQuoteSettingsActionState> {
  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, workspaceContext } = ownerAccess;
  const validationResult = workspaceQuoteSettingsSchema.safeParse({
    defaultQuoteNotes: formData.get("defaultQuoteNotes"),
    defaultQuoteValidityDays: formData.get("defaultQuoteValidityDays"),
    notifyOnQuoteSent: formData.get("notifyOnQuoteSent"),
    defaultCurrency: formData.get("defaultCurrency"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the quote settings and try again.",
    );
  }

  try {
    const result = await updateWorkspaceQuoteSettings({
      workspaceId: workspaceContext.workspace.id,
      actorUserId: user.id,
      values: validationResult.data,
    });

    if (!result.ok) {
      return {
        error: "That workspace could not be found.",
      };
    }

    updateCacheTags(getWorkspaceSettingsCacheTags(workspaceContext.workspace.id));

    return {
      success: "Quote settings saved.",
    };
  } catch (error) {
    console.error("Failed to update workspace quote settings.", error);

    return {
      error: "We couldn't save the quote settings right now.",
    };
  }
}

export async function deleteWorkspaceAction(
  _prevState: WorkspaceDeleteActionState,
  formData: FormData,
): Promise<WorkspaceDeleteActionState> {
  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, workspaceContext } = ownerAccess;
  const validationResult = workspaceDeleteSchema.safeParse({
    confirmation: formData.get("confirmation"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Type the workspace name to continue.",
    );
  }

  let shouldRedirect = false;

  try {
    const result = await deleteWorkspace({
      workspaceId: workspaceContext.workspace.id,
      actorUserId: user.id,
      values: validationResult.data,
    });

    if (!result.ok) {
      if (result.reason === "confirmation-mismatch") {
        return {
          error: "Type the exact workspace name to delete it.",
          fieldErrors: {
            confirmation: ["This does not match the workspace name."],
          },
        };
      }

      return {
        error: "That workspace could not be found.",
      };
    }

    const cookieStore = await cookies();

    cookieStore.delete(activeWorkspaceSlugCookieName);

    revalidatePath(workspaceHubPath);
    shouldRedirect = true;
  } catch (error) {
    console.error("Failed to delete workspace.", error);

    return {
      error: "We couldn't delete the workspace right now.",
    };
  }

  if (shouldRedirect) {
    redirect(workspaceHubPath);
  }

  return {
    error: "We couldn't delete the workspace right now.",
  };
}

export async function updateWorkspaceInquiryPageAction(
  formSlug: string,
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
    formId: formData.get("formId"),
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

    updateCacheTags(
      getWorkspaceInquiryFormCacheTags(workspaceContext.workspace.id, formSlug),
    );

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

export async function updateWorkspaceInquiryFormAction(
  _formSlug: string,
  _prevState: WorkspaceInquiryFormActionState,
  formData: FormData,
): Promise<WorkspaceInquiryFormActionState> {
  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, workspaceContext } = ownerAccess;

  const validationResult = workspaceInquiryFormSettingsSchema.safeParse({
    formId: formData.get("formId"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    businessType: formData.get("businessType"),
    inquiryFormConfig: formData.get("inquiryFormConfig"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the inquiry form and try again.",
    );
  }

  let nextEditorPath: string | null = null;

  try {
    const result = await updateWorkspaceInquiryFormSettings({
      workspaceId: workspaceContext.workspace.id,
      actorUserId: user.id,
      values: validationResult.data,
    });

    if (!result.ok) {
      if (result.reason === "slug-taken") {
        return {
          error: "Choose a different form slug.",
          fieldErrors: {
            slug: ["This form slug is already in use in this workspace."],
          },
        };
      }

      return {
        error: "That workspace could not be found.",
      };
    }

    updateCacheTags(
      uniqueCacheTags([
        ...getWorkspaceInquiryFormsCacheTags(workspaceContext.workspace.id),
        ...getWorkspaceInquiryFormCacheTags(
          workspaceContext.workspace.id,
          result.previousFormSlug,
        ),
        ...getWorkspaceInquiryFormCacheTags(
          workspaceContext.workspace.id,
          result.nextFormSlug,
        ),
      ]),
    );

    if (result.previousFormSlug !== result.nextFormSlug) {
      revalidateWorkspaceInquiryFormPaths(result.nextSlug, result.previousFormSlug);
      revalidateWorkspaceInquiryFormPaths(result.nextSlug, result.nextFormSlug);
      revalidateWorkspaceDefaultInquiryPaths(result.nextSlug);
      nextEditorPath = getWorkspaceInquiryFormEditorPath(
        result.nextSlug,
        result.nextFormSlug,
      );
    }
  } catch (error) {
    console.error("Failed to update workspace inquiry form settings.", error);

    return {
      error: "We couldn't save the inquiry form right now.",
    };
  }

  if (nextEditorPath) {
    redirect(nextEditorPath);
  }

  return {
    success: "Inquiry form saved.",
  };
}

export async function applyWorkspaceInquiryFormPresetAction(
  formSlug: string,
  _prevState: WorkspaceInquiryFormActionState,
  formData: FormData,
): Promise<WorkspaceInquiryFormActionState> {
  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, workspaceContext } = ownerAccess;

  const validationResult = workspaceInquiryFormPresetSchema.safeParse({
    formId: formData.get("formId"),
    businessType: formData.get("businessType"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Choose a business type and try again.",
    );
  }

  try {
    const result = await applyWorkspaceInquiryFormPreset({
      workspaceId: workspaceContext.workspace.id,
      actorUserId: user.id,
      values: validationResult.data,
    });

    if (!result.ok) {
      return {
        error: "That workspace could not be found.",
      };
    }

    updateCacheTags(
      uniqueCacheTags([
        ...getWorkspaceInquiryFormsCacheTags(workspaceContext.workspace.id),
        ...getWorkspaceInquiryFormCacheTags(workspaceContext.workspace.id, formSlug),
      ]),
    );

    return {
      success: "Preset defaults applied.",
    };
  } catch (error) {
    console.error("Failed to apply workspace inquiry preset.", error);

    return {
      error: "We couldn't apply the preset right now.",
    };
  }
}

export async function createWorkspaceInquiryFormAction(
  _prevState: WorkspaceInquiryFormsActionState,
  formData: FormData,
): Promise<WorkspaceInquiryFormsActionState> {
  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, workspaceContext } = ownerAccess;
  const validationResult = workspaceInquiryFormCreateSchema.safeParse({
    name: formData.get("name"),
    businessType: formData.get("businessType"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the form details and try again.",
    );
  }

  let editorPath: string | null = null;

  try {
    const result = await createWorkspaceInquiryForm({
      workspaceId: workspaceContext.workspace.id,
      actorUserId: user.id,
      values: validationResult.data,
    });

    if (!result.ok) {
      return {
        error: "That workspace could not be found.",
      };
    }

    updateCacheTags(
      uniqueCacheTags([
        ...getWorkspaceInquiryFormsCacheTags(workspaceContext.workspace.id),
        ...getWorkspaceInquiryFormCacheTags(
          workspaceContext.workspace.id,
          result.formSlug,
        ),
      ]),
    );
    revalidateWorkspaceInquiryFormPaths(result.workspaceSlug, result.formSlug);
    editorPath = getWorkspaceInquiryFormEditorPath(
      result.workspaceSlug,
      result.formSlug,
    );
  } catch (error) {
    console.error("Failed to create inquiry form.", error);

    return {
      error: "We couldn't create the inquiry form right now.",
    };
  }

  if (editorPath) {
    redirect(editorPath);
  }

  return {
    error: "We couldn't create the inquiry form right now.",
  };
}

export async function duplicateWorkspaceInquiryFormAction(
  _prevState: WorkspaceInquiryFormsActionState,
  formData: FormData,
): Promise<WorkspaceInquiryFormsActionState> {
  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, workspaceContext } = ownerAccess;
  const validationResult = workspaceInquiryFormTargetSchema.safeParse({
    targetFormId: formData.get("targetFormId"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Choose a form and try again.");
  }

  let editorPath: string | null = null;

  try {
    const result = await duplicateWorkspaceInquiryForm({
      workspaceId: workspaceContext.workspace.id,
      actorUserId: user.id,
      targetFormId: validationResult.data.targetFormId,
    });

    if (!result.ok) {
      return {
        error: "That inquiry form could not be found.",
      };
    }

    updateCacheTags(
      uniqueCacheTags([
        ...getWorkspaceInquiryFormsCacheTags(workspaceContext.workspace.id),
        ...getWorkspaceInquiryFormCacheTags(
          workspaceContext.workspace.id,
          result.formSlug,
        ),
      ]),
    );
    revalidateWorkspaceInquiryFormPaths(result.workspaceSlug, result.formSlug);
    editorPath = getWorkspaceInquiryFormEditorPath(
      result.workspaceSlug,
      result.formSlug,
    );
  } catch (error) {
    console.error("Failed to duplicate inquiry form.", error);

    return {
      error: "We couldn't duplicate the inquiry form right now.",
    };
  }

  if (editorPath) {
    redirect(editorPath);
  }

  return {
    error: "We couldn't duplicate the inquiry form right now.",
  };
}

export async function setDefaultWorkspaceInquiryFormAction(
  _prevState: WorkspaceInquiryFormsActionState,
  formData: FormData,
): Promise<WorkspaceInquiryFormsActionState> {
  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, workspaceContext } = ownerAccess;
  const validationResult = workspaceInquiryFormTargetSchema.safeParse({
    targetFormId: formData.get("targetFormId"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Choose a form and try again.");
  }

  try {
    const result = await setDefaultWorkspaceInquiryForm({
      workspaceId: workspaceContext.workspace.id,
      actorUserId: user.id,
      targetFormId: validationResult.data.targetFormId,
    });

    if (!result.ok) {
      return {
        error: "That inquiry form could not be found.",
      };
    }

    updateCacheTags(
      uniqueCacheTags([
        ...getWorkspaceInquiryFormsCacheTags(workspaceContext.workspace.id),
        ...getWorkspaceInquiryFormCacheTags(
          workspaceContext.workspace.id,
          result.formSlug,
        ),
      ]),
    );
    revalidateWorkspaceInquiryFormPaths(result.workspaceSlug, result.formSlug);
    revalidateWorkspaceDefaultInquiryPaths(result.workspaceSlug);

    return {
      success: "Default inquiry form updated.",
    };
  } catch (error) {
    console.error("Failed to set default inquiry form.", error);

    return {
      error: "We couldn't change the default inquiry form right now.",
    };
  }
}

export async function archiveWorkspaceInquiryFormAction(
  _prevState: WorkspaceInquiryFormsActionState,
  formData: FormData,
): Promise<WorkspaceInquiryFormsActionState> {
  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, workspaceContext } = ownerAccess;
  const validationResult = workspaceInquiryFormTargetSchema.safeParse({
    targetFormId: formData.get("targetFormId"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Choose a form and try again.");
  }

  try {
    const result = await archiveWorkspaceInquiryForm({
      workspaceId: workspaceContext.workspace.id,
      actorUserId: user.id,
      targetFormId: validationResult.data.targetFormId,
    });

    if (!result.ok) {
      if (result.reason === "invalid-target") {
        return {
          error: "Set another form as default before archiving this one.",
        };
      }

      if (result.reason === "last-active") {
        return {
          error: "Keep at least one active inquiry form.",
        };
      }

      return {
        error: "That inquiry form could not be found.",
      };
    }

    updateCacheTags(
      uniqueCacheTags([
        ...getWorkspaceInquiryFormsCacheTags(workspaceContext.workspace.id),
        ...getWorkspaceInquiryFormCacheTags(
          workspaceContext.workspace.id,
          result.formSlug,
        ),
      ]),
    );
    revalidateWorkspaceInquiryFormPaths(result.workspaceSlug, result.formSlug);

    return {
      success: "Inquiry form archived.",
    };
  } catch (error) {
    console.error("Failed to archive inquiry form.", error);

    return {
      error: "We couldn't archive the inquiry form right now.",
    };
  }
}

export async function archiveWorkspaceInquiryFormFromDetailAction(
  _prevState: WorkspaceInquiryFormDangerActionState,
  formData: FormData,
): Promise<WorkspaceInquiryFormDangerActionState> {
  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, workspaceContext } = ownerAccess;
  const validationResult = workspaceInquiryFormTargetSchema.safeParse({
    targetFormId: formData.get("targetFormId"),
  });

  if (!validationResult.success) {
    return {
      error: "That inquiry form could not be found.",
    };
  }

  try {
    const result = await archiveWorkspaceInquiryForm({
      workspaceId: workspaceContext.workspace.id,
      actorUserId: user.id,
      targetFormId: validationResult.data.targetFormId,
    });

    if (!result.ok) {
      if (result.reason === "invalid-target") {
        return {
          error: "Set another form as default before archiving this one.",
        };
      }

      if (result.reason === "last-active") {
        return {
          error: "Keep at least one active inquiry form.",
        };
      }

      return {
        error: "That inquiry form could not be found.",
      };
    }

    updateCacheTags(
      uniqueCacheTags([
        ...getWorkspaceInquiryFormsCacheTags(workspaceContext.workspace.id),
        ...getWorkspaceInquiryFormCacheTags(
          workspaceContext.workspace.id,
          result.formSlug,
        ),
      ]),
    );
    revalidateWorkspaceInquiryFormPaths(result.workspaceSlug, result.formSlug);

    return {
      success: "Inquiry form archived.",
    };
  } catch (error) {
    console.error("Failed to archive inquiry form.", error);

    return {
      error: "We couldn't archive the inquiry form right now.",
    };
  }
}

export async function deleteWorkspaceInquiryFormAction(
  _prevState: WorkspaceInquiryFormDangerActionState,
  formData: FormData,
): Promise<WorkspaceInquiryFormDangerActionState> {
  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, workspaceContext } = ownerAccess;
  const validationResult = workspaceInquiryFormTargetSchema.safeParse({
    targetFormId: formData.get("targetFormId"),
  });

  if (!validationResult.success) {
    return {
      error: "That inquiry form could not be found.",
    };
  }

  try {
    const result = await deleteWorkspaceInquiryForm({
      workspaceId: workspaceContext.workspace.id,
      actorUserId: user.id,
      targetFormId: validationResult.data.targetFormId,
    });

    if (!result.ok) {
      if (result.reason === "invalid-target") {
        return {
          error: "Set another form as default before deleting this one.",
        };
      }

      if (result.reason === "last-active") {
        return {
          error: "Keep at least one active inquiry form.",
        };
      }

      if (result.reason === "has-inquiries") {
        return {
          error: "This form already has inquiries. Archive it instead.",
        };
      }

      return {
        error: "That inquiry form could not be found.",
      };
    }

    updateCacheTags(
      uniqueCacheTags([
        ...getWorkspaceInquiryFormsCacheTags(workspaceContext.workspace.id),
        ...getWorkspaceInquiryFormCacheTags(
          workspaceContext.workspace.id,
          result.formSlug,
        ),
      ]),
    );
    revalidateWorkspaceInquiryFormPaths(result.workspaceSlug, result.formSlug);

    return {
      success: "Inquiry form deleted.",
    };
  } catch (error) {
    console.error("Failed to delete inquiry form.", error);

    return {
      error: "We couldn't delete the inquiry form right now.",
    };
  }
}
