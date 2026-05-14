import { z } from "zod";

import {
  importerMaxKnowledgeItems,
  importerMaxPricingEntries,
  importerMaxPricingItemsPerEntry,
} from "@/features/importer/types";

export const importerCommitKnowledgeItemSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Every knowledge item needs a title.")
    .max(200, "Titles must be 200 characters or fewer."),
  content: z
    .string()
    .trim()
    .min(1, "Every knowledge item needs content.")
    .max(4000, "Content must be 4000 characters or fewer."),
});

export const importerCommitKnowledgeSchema = z.object({
  sourceName: z.string().trim().min(1).max(200),
  items: z
    .array(importerCommitKnowledgeItemSchema)
    .min(1, "Select at least one knowledge item to import.")
    .max(
      importerMaxKnowledgeItems,
      `You can import at most ${importerMaxKnowledgeItems} knowledge items at once.`,
    ),
});

export type ImporterCommitKnowledgeInput = z.infer<
  typeof importerCommitKnowledgeSchema
>;

export const importerCommitPricingLineItemSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Line items need a description.")
    .max(400, "Line item descriptions must be 400 characters or fewer."),
  quantity: z
    .number()
    .int("Quantity must be a whole number.")
    .min(1, "Quantity must be at least 1.")
    .max(100_000, "Quantity is too large."),
  unitPriceInCents: z
    .number()
    .int("Price must be a whole number of cents.")
    .min(0, "Price cannot be negative.")
    .max(100_000_000, "Price is too large."),
});

export const importerCommitPricingEntrySchema = z
  .object({
    kind: z.enum(["block", "package"]),
    name: z
      .string()
      .trim()
      .min(2, "Pricing entries need a name.")
      .max(120, "Names must be 120 characters or fewer."),
    description: z
      .string()
      .trim()
      .max(600, "Descriptions must be 600 characters or fewer.")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    items: z
      .array(importerCommitPricingLineItemSchema)
      .min(1, "Pricing entries need at least one line item.")
      .max(
        importerMaxPricingItemsPerEntry,
        `Pricing entries can include up to ${importerMaxPricingItemsPerEntry} line items.`,
      ),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "block" && value.items.length !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: "Pricing blocks must contain exactly one line item.",
      });
    }
  });

export const importerCommitPricingSchema = z.object({
  sourceName: z.string().trim().min(1).max(200),
  entries: z
    .array(importerCommitPricingEntrySchema)
    .min(1, "Select at least one pricing entry to import.")
    .max(
      importerMaxPricingEntries,
      `You can import at most ${importerMaxPricingEntries} pricing entries at once.`,
    ),
});

export type ImporterCommitPricingInput = z.infer<
  typeof importerCommitPricingSchema
>;
