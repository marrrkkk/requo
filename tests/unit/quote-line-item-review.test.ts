import { describe, expect, it } from "vitest";

import {
  canSaveLineItemToPricingLibrary,
  getLineItemReviewBadgeLabel,
  isPricingLibrarySourcedReview,
  shouldShowLineItemReviewBadge,
} from "@/features/quotes/components/quote-editor/line-item-review";
import type { EditorLineItem } from "@/features/quotes/components/quote-editor/types";

const baseReview = {
  name: "Tarpaulin",
  confidence: "high" as const,
  reason: "From pricing library.",
};

describe("quote line item review helpers", () => {
  it("shows Matched only for pricing library sources", () => {
    const libraryReview = {
      ...baseReview,
      reviewStatus: "matched" as const,
      pricingSource: "pricing_library_block" as const,
      pricingSourceLabel: "Banner block",
    };

    expect(isPricingLibrarySourcedReview(libraryReview)).toBe(true);
    expect(getLineItemReviewBadgeLabel(libraryReview)).toBe("Matched");
    expect(shouldShowLineItemReviewBadge(libraryReview)).toBe(true);

    const ownerReview = {
      ...baseReview,
      reviewStatus: "matched" as const,
      pricingSource: "owner_brief" as const,
      pricingSourceLabel: "Owner-set price",
    };

    expect(isPricingLibrarySourcedReview(ownerReview)).toBe(false);
    expect(getLineItemReviewBadgeLabel(ownerReview)).toBeNull();
    expect(shouldShowLineItemReviewBadge(ownerReview)).toBe(false);
  });

  it("allows saving custom priced lines to the library", () => {
    const item: EditorLineItem = {
      id: "item_1",
      description: "Custom tarpaulin",
      quantity: "1",
      unitPrice: "10",
      aiReview: {
        ...baseReview,
        reviewStatus: "no_pricing_found",
        pricingSource: "none",
        pricingSourceLabel: null,
      },
    };

    expect(
      canSaveLineItemToPricingLibrary({ item, unitPriceInCents: 1000 }),
    ).toBe(true);

    expect(
      canSaveLineItemToPricingLibrary({
        item: {
          ...item,
          aiReview: {
            ...baseReview,
            reviewStatus: "matched",
            pricingSource: "pricing_library_block",
            pricingSourceLabel: "Banner block",
          },
        },
        unitPriceInCents: 1000,
      }),
    ).toBe(false);
  });
});
