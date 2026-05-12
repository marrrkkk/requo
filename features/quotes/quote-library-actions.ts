"use server";

import { updateTag } from "next/cache";

import { getValidationActionState } from "@/lib/action-state";
import {
  getBusinessPricingCacheTags,
  uniqueCacheTags,
} from "@/lib/cache/business-tags";
import { getOperationalBusinessActionContext } from "@/lib/db/business-access";
import {
  createQuoteLibraryEntryForBusiness,
  deleteQuoteLibraryEntryForBusiness,
  updateQuoteLibraryEntryForBusiness,
} from "@/features/quotes/quote-library-mutations";
import {
  quoteLibraryEntryIdSchema,
  quoteLibraryEntrySchema,
} from "@/features/quotes/quote-library-schemas";
import { hasFeatureAccess } from "@/lib/plans";
import type {
  QuoteLibraryActionState,
  QuoteLibraryDeleteActionState,
} from "@/features/quotes/types";

const initialQuoteLibraryState: QuoteLibraryActionState = {};
const initialQuoteLibraryDeleteState: QuoteLibraryDeleteActionState = {};

function updateCacheTags(tags: string[]) {
  for (const tag of uniqueCacheTags(tags)) {
    updateTag(tag);
  }
}

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

export async function createQuoteLibraryEntryAction(
  prevState: QuoteLibraryActionState = initialQuoteLibraryState,
  formData: FormData,
): Promise<QuoteLibraryActionState> {
  void prevState;

  const ownerAccess = await getOperationalBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;

  if (!hasFeatureAccess(businessContext.business.plan, "quoteLibrary")) {
    return {
      error: "Upgrade to Pro to save pricing library entries.",
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

  try {
    await createQuoteLibraryEntryForBusiness({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      currency: businessContext.business.defaultCurrency,
      entry: validationResult.data,
    });

    updateCacheTags(getBusinessPricingCacheTags(businessContext.business.id));
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

  const ownerAccess = await getOperationalBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;

  if (!hasFeatureAccess(businessContext.business.plan, "quoteLibrary")) {
    return {
      error: "Upgrade to Pro to update pricing library entries.",
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

  try {
    const result = await updateQuoteLibraryEntryForBusiness({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      entryId: parsedId.data,
      entry: validationResult.data,
    });

    if (!result) {
      return {
        error: "That pricing entry could not be found.",
      };
    }

    updateCacheTags(getBusinessPricingCacheTags(businessContext.business.id));
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

  const ownerAccess = await getOperationalBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;

  if (!hasFeatureAccess(businessContext.business.plan, "quoteLibrary")) {
    return {
      error: "Upgrade to Pro to delete pricing library entries.",
    };
  }

  try {
    const result = await deleteQuoteLibraryEntryForBusiness({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      entryId: parsedId.data,
    });

    if (!result) {
      return {
        error: "That pricing entry could not be found.",
      };
    }

    updateCacheTags(getBusinessPricingCacheTags(businessContext.business.id));
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
