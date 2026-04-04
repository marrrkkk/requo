"use server";

import { revalidatePath } from "next/cache";

import { getValidationActionState } from "@/lib/action-state";
import { getOwnerWorkspaceActionContext } from "@/lib/db/workspace-access";
import {
  createQuoteLibraryEntryForWorkspace,
  deleteQuoteLibraryEntryForWorkspace,
  updateQuoteLibraryEntryForWorkspace,
} from "@/features/quotes/quote-library-mutations";
import {
  quoteLibraryEntryIdSchema,
  quoteLibraryEntrySchema,
} from "@/features/quotes/quote-library-schemas";
import { getWorkspaceSettingsPath } from "@/features/workspaces/routes";
import type {
  QuoteLibraryActionState,
  QuoteLibraryDeleteActionState,
} from "@/features/quotes/types";

const initialQuoteLibraryState: QuoteLibraryActionState = {};
const initialQuoteLibraryDeleteState: QuoteLibraryDeleteActionState = {};

function mapQuoteLibraryFieldErrors(
  fieldErrors: Record<string, string[] | undefined>,
) {
  return {
    kind: fieldErrors.kind,
    name: fieldErrors.name,
    description: fieldErrors.description,
    items: fieldErrors.items,
  };
}

function revalidateQuoteLibraryPages(workspaceSlug: string) {
  revalidatePath(getWorkspaceSettingsPath(workspaceSlug));
  revalidatePath(getWorkspaceSettingsPath(workspaceSlug, "pricing-library"));
}

export async function createQuoteLibraryEntryAction(
  prevState: QuoteLibraryActionState = initialQuoteLibraryState,
  formData: FormData,
): Promise<QuoteLibraryActionState> {
  void prevState;

  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const validationResult = quoteLibraryEntrySchema.safeParse({
    kind: formData.get("kind"),
    name: formData.get("name"),
    description: formData.get("description"),
    items: formData.get("items"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the highlighted fields and try again.",
      mapQuoteLibraryFieldErrors,
    );
  }

  const { user, workspaceContext } = ownerAccess;

  try {
    await createQuoteLibraryEntryForWorkspace({
      workspaceId: workspaceContext.workspace.id,
      actorUserId: user.id,
      entry: validationResult.data,
    });

    revalidateQuoteLibraryPages(workspaceContext.workspace.slug);

    return {
      success:
        validationResult.data.kind === "block"
          ? "Pricing block saved."
          : "Service package saved.",
    };
  } catch (error) {
    console.error("Failed to create pricing library entry.", error);

    return {
      error: "We couldn't save that pricing entry right now.",
    };
  }
}

export async function updateQuoteLibraryEntryAction(
  entryId: string,
  prevState: QuoteLibraryActionState = initialQuoteLibraryState,
  formData: FormData,
): Promise<QuoteLibraryActionState> {
  void prevState;

  const parsedId = quoteLibraryEntryIdSchema.safeParse(entryId);

  if (!parsedId.success) {
    return {
      error: "That pricing entry could not be found.",
    };
  }

  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const validationResult = quoteLibraryEntrySchema.safeParse({
    kind: formData.get("kind"),
    name: formData.get("name"),
    description: formData.get("description"),
    items: formData.get("items"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the highlighted fields and try again.",
      mapQuoteLibraryFieldErrors,
    );
  }

  const { user, workspaceContext } = ownerAccess;

  try {
    const result = await updateQuoteLibraryEntryForWorkspace({
      workspaceId: workspaceContext.workspace.id,
      actorUserId: user.id,
      entryId: parsedId.data,
      entry: validationResult.data,
    });

    if (!result) {
      return {
        error: "That pricing entry could not be found.",
      };
    }

    revalidateQuoteLibraryPages(workspaceContext.workspace.slug);

    return {
      success:
        validationResult.data.kind === "block"
          ? "Pricing block updated."
          : "Service package updated.",
    };
  } catch (error) {
    console.error("Failed to update pricing library entry.", error);

    return {
      error: "We couldn't update that pricing entry right now.",
    };
  }
}

export async function deleteQuoteLibraryEntryAction(
  entryId: string,
  prevState: QuoteLibraryDeleteActionState = initialQuoteLibraryDeleteState,
  formData: FormData,
): Promise<QuoteLibraryDeleteActionState> {
  void prevState;
  void formData;

  const parsedId = quoteLibraryEntryIdSchema.safeParse(entryId);

  if (!parsedId.success) {
    return {
      error: "That pricing entry could not be found.",
    };
  }

  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, workspaceContext } = ownerAccess;

  try {
    const result = await deleteQuoteLibraryEntryForWorkspace({
      workspaceId: workspaceContext.workspace.id,
      actorUserId: user.id,
      entryId: parsedId.data,
    });

    if (!result) {
      return {
        error: "That pricing entry could not be found.",
      };
    }

    revalidateQuoteLibraryPages(workspaceContext.workspace.slug);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Failed to delete pricing library entry.", error);

    return {
      error: "We couldn't delete that pricing entry right now.",
    };
  }
}
