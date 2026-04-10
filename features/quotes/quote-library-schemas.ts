import { z } from "zod";

import { quoteLibraryEntryKinds } from "@/features/quotes/types";

function emptyToUndefined(value: unknown) {
  if (value == null) {
    return undefined;
  }

  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}

function coercePositiveInteger(fieldLabel: string) {
  return z.preprocess((value) => {
    if (typeof value === "number") {
      return value;
    }

    if (typeof value !== "string") {
      return value;
    }

    const normalized = value.trim();

    if (!normalized) {
      return Number.NaN;
    }

    return Number(normalized);
  }, z.number().int(`${fieldLabel} must be a whole number.`).min(1, `${fieldLabel} must be at least 1.`));
}

function currencyStringToCents(value: unknown) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return value;
    }

    return Math.round(value * 100);
  }

  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim().replace(/,/g, "");

  if (!normalized) {
    return Number.NaN;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return Number.NaN;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return Number.NaN;
  }

  return Math.round(parsed * 100);
}

const quoteLibraryFormLineItemSchema = z.object({
  id: z.string().trim().min(1).max(128),
  description: z
    .string()
    .trim()
    .min(1, "Enter a line item description.")
    .max(400, "Line item descriptions must be 400 characters or fewer."),
  quantity: coercePositiveInteger("Quantity"),
  unitPriceInCents: z.preprocess(
    currencyStringToCents,
    z
      .number()
      .int()
      .min(0, "Unit price cannot be negative.")
      .max(100_000_000, "Unit price is too large."),
  ),
});

const quoteLibraryItemsFieldSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}, z.array(quoteLibraryFormLineItemSchema).min(1, "Add at least one line item.").max(25, "Saved entries can include up to 25 line items."));

export const quoteLibraryEntryIdSchema = z
  .string()
  .trim()
  .min(1, "Entry id is required.")
  .max(128, "Entry id is too long.");

export const quoteLibraryEntrySchema = z
  .object({
    kind: z.enum(quoteLibraryEntryKinds),
    name: z
      .string()
      .trim()
      .min(2, "Enter a name.")
      .max(120, "Names must be 120 characters or fewer."),
    description: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .max(600, "Descriptions must be 600 characters or fewer.")
        .optional(),
    ),
    items: quoteLibraryItemsFieldSchema,
  })
  .superRefine((value, ctx) => {
    if (value.kind === "block" && value.items.length !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: "Saved pricing blocks must contain exactly one line item.",
      });
    }
  });

export type QuoteLibraryEntryInput = z.infer<typeof quoteLibraryEntrySchema>;
