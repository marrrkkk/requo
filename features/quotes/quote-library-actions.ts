"use server";

import { z } from "zod";
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

const saveQuoteLineItemToPricingSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Enter a line item description.")
    .max(400, "Line item descriptions must be 400 characters or fewer."),
  quantity: z.coerce.number().int().min(1).max(999_999),
  unitPriceInCents: z.coerce
    .number()
    .int()
    .min(1, "Set a unit price before saving to pricing."),
});

export type SaveQuoteLineItemToPricingResult =
  | { ok: true; entryName: string }
  | { ok: false; error: string };

export async function saveQuoteLineItemToPricingLibrary(
  input: z.infer<typeof saveQuoteLineItemToPricingSchema>,
): Promise<SaveQuoteLineItemToPricingResult> {
  const ownerAccess = await getOperationalBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      ok: false,
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;

  if (!hasFeatureAccess(businessContext.business.plan, "quoteLibrary")) {
    return {
      ok: false,
      error: "Upgrade to Pro to save pricing library entries.",
    };
  }

  const validationResult = saveQuoteLineItemToPricingSchema.safeParse(input);

  if (!validationResult.success) {
    return {
      ok: false,
      error:
        validationResult.error.issues[0]?.message ??
        "Check the line item and try again.",
    };
  }

  const { description, quantity, unitPriceInCents } = validationResult.data;
  const entryName =
    description.length > 120 ? `${description.slice(0, 117).trimEnd()}...` : description;

  try {
    await createQuoteLibraryEntryForBusiness({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      currency: businessContext.business.defaultCurrency,
      entry: {
        kind: "block",
        name: entryName,
        items: [
          {
            id: crypto.randomUUID(),
            description,
            quantity,
            unitPriceInCents,
          },
        ],
      },
    });

    updateCacheTags(getBusinessPricingCacheTags(businessContext.business.id));

    return {
      ok: true,
      entryName,
    };
  } catch (error) {
    console.error("Failed to save quote line item to pricing library.", error);

    return {
      ok: false,
      error: "We couldn't save that line item to pricing right now.",
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
