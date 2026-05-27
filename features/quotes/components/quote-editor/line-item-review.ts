import type { AiQuoteLineItemReview } from "@/features/quotes/types";

import type { EditorLineItem } from "./types";

const PRICING_LIBRARY_SOURCES = new Set<AiQuoteLineItemReview["pricingSource"]>([
  "pricing_library_block",
  "pricing_library_package",
  "past_quote",
]);

export function isPricingLibrarySourcedReview(
  review: AiQuoteLineItemReview,
): boolean {
  return (
    (review.reviewStatus === "matched" ||
      review.reviewStatus === "calculated") &&
    PRICING_LIBRARY_SOURCES.has(review.pricingSource)
  );
}

export function shouldShowLineItemReviewBadge(
  review: AiQuoteLineItemReview | undefined,
): review is AiQuoteLineItemReview {
  return Boolean(review && isPricingLibrarySourcedReview(review));
}

export function canSaveLineItemToPricingLibrary({
  item,
  unitPriceInCents,
}: {
  item: EditorLineItem;
  unitPriceInCents: number;
}): boolean {
  if (!item.description.trim()) {
    return false;
  }

  if (unitPriceInCents <= 0) {
    return false;
  }

  if (item.aiReview && isPricingLibrarySourcedReview(item.aiReview)) {
    return false;
  }

  return true;
}

export function getLineItemReviewBadgeLabel(
  review: AiQuoteLineItemReview,
): string | null {
  if (!isPricingLibrarySourcedReview(review)) {
    return null;
  }

  if (review.reviewStatus === "calculated") {
    return "Calculated";
  }

  return "Matched";
}
