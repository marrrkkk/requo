import { describe, expect, it } from "vitest";

import {
  publicQuoteResponseSchema,
  quoteEditorSchema,
  quotePublicTokenSchema,
} from "@/features/quotes/schemas";

function quoteInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    title: "Storefront sign package",
    customerName: "Alicia Cruz",
    customerEmail: "",
    customerContactMethod: "email",
    customerContactHandle: "alicia@example.com",
    notes: "Includes install and cleanup.",
    validUntil: "2026-05-31",
    discountInCents: "25.50",
    items: JSON.stringify([
      {
        id: "line-design",
        description: "Design and proofing",
        quantity: "2",
        unitPriceInCents: "150.25",
      },
      {
        id: "line-install",
        description: "Installation",
        quantity: "1",
        unitPriceInCents: "300",
      },
    ]),
    ...overrides,
  };
}

describe("quote validation schemas", () => {
  it("normalizes the quote editor payload that drives quote totals", () => {
    const parsed = quoteEditorSchema.safeParse(quoteInput());

    expect(parsed.success).toBe(true);
    expect(parsed.data?.discountInCents).toBe(2550);
    expect(parsed.data?.items).toEqual([
      expect.objectContaining({
        description: "Design and proofing",
        quantity: 2,
        unitPriceInCents: 15025,
      }),
      expect.objectContaining({
        description: "Installation",
        quantity: 1,
        unitPriceInCents: 30000,
      }),
    ]);
  });

  it("rejects discounts larger than the subtotal", () => {
    const parsed = quoteEditorSchema.safeParse(
      quoteInput({
        discountInCents: "1000",
        items: JSON.stringify([
          {
            id: "line-small",
            description: "Small service",
            quantity: "1",
            unitPriceInCents: "99",
          },
        ]),
      }),
    );

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["discountInCents"],
          message: "Discount cannot be larger than the subtotal.",
        }),
      ]),
    );
  });

  it("requires an email-shaped contact handle when email is selected", () => {
    const parsed = quoteEditorSchema.safeParse(
      quoteInput({
        customerContactMethod: "email",
        customerContactHandle: "not-an-email",
      }),
    );

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["customerContactHandle"],
          message: "Enter a valid email address.",
        }),
      ]),
    );
  });

  it("rejects empty or malformed line items", () => {
    const parsed = quoteEditorSchema.safeParse(
      quoteInput({
        items: JSON.stringify([
          {
            id: "line-empty",
            description: "",
            quantity: "0",
            unitPriceInCents: "-1",
          },
        ]),
      }),
    );

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((issue) => issue.path.join("."))).toEqual(
      expect.arrayContaining([
        "items.0.description",
        "items.0.quantity",
        "items.0.unitPriceInCents",
      ]),
    );
  });

  it("bounds public quote responses and tokens", () => {
    expect(
      publicQuoteResponseSchema.safeParse({
        response: "accepted",
        message: "a".repeat(1200),
      }).success,
    ).toBe(true);
    expect(
      publicQuoteResponseSchema.safeParse({
        response: "accepted",
        message: "a".repeat(1201),
      }).success,
    ).toBe(false);
    expect(quotePublicTokenSchema.safeParse("abc").success).toBe(false);
    expect(
      quotePublicTokenSchema.safeParse("public_token-123456").success,
    ).toBe(true);
    expect(quotePublicTokenSchema.safeParse("bad token value").success).toBe(
      false,
    );
  });
});
