import { z } from "zod";

import {
  quotePostAcceptanceStatuses,
  quoteRecordViews,
  quoteStatusFilterValues,
} from "@/features/quotes/types";

function emptyToUndefined(value: unknown) {
  if (value == null) {
    return undefined;
  }

  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}

function firstString(value: unknown) {
  if (Array.isArray(value)) {
    return value[0];
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

function optionalText(maxLength: number) {
  return z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(maxLength, `Text must be ${maxLength} characters or fewer.`)
      .optional(),
  );
}

function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

const quoteFormLineItemSchema = z.object({
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

const quoteItemsFieldSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}, z.array(quoteFormLineItemSchema).min(1, "Add at least one line item.").max(50, "Quotes can include up to 50 line items."));

export const quoteIdSchema = z
  .string()
  .trim()
  .min(1, "Quote id is required.")
  .max(128, "Quote id is too long.");
export const quotePublicTokenSchema = z
  .string()
  .trim()
  .min(16, "Quote token is too short.")
  .max(128, "Quote token is too long.")
  .regex(/^[a-zA-Z0-9_-]+$/, "Enter a valid quote token.");

export const quoteRouteParamsSchema = z.object({
  id: quoteIdSchema,
});

export const quotePublicRouteParamsSchema = z.object({
  token: quotePublicTokenSchema,
});

export const quoteListFiltersSchema = z.object({
  q: z
    .preprocess(
      (value) => emptyToUndefined(firstString(value)),
      z
        .string()
        .trim()
        .max(120, "Search must be 120 characters or fewer.")
        .optional(),
    )
    .catch(undefined),
  view: z
    .preprocess(
      (value) => firstString(value) ?? "active",
      z.enum(quoteRecordViews),
    )
    .catch("active"),
  status: z
    .preprocess(
      (value) => firstString(value) ?? "all",
      z.enum(quoteStatusFilterValues),
    )
    .catch("all"),
  sort: z
    .preprocess(
      (value) => firstString(value) ?? "newest",
      z.enum(["newest", "oldest"]),
    )
    .catch("newest"),
  page: coercePositiveInteger("Page").catch(1),
});

export const quoteEditorSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Enter a quote title.")
      .max(160, "Quote titles must be 160 characters or fewer."),
    customerName: z
      .string()
      .trim()
      .min(2, "Enter the customer name.")
      .max(120, "Customer name must be 120 characters or fewer."),
    customerEmail: z
      .string()
      .trim()
      .email("Enter a valid customer email.")
      .nullable()
      .optional()
      .or(z.literal("")),
    customerContactMethod: z.string().trim().min(1, "Select a preferred contact method."),
    customerContactHandle: z.string().trim().min(1, "Enter the contact handle."),
    notes: optionalText(4000),
    validUntil: z
      .string()
      .trim()
      .refine(isValidDateInput, "Enter a valid validity date."),
    discountInCents: z.preprocess(
      (value) => {
        const normalized = emptyToUndefined(value);

        if (normalized === undefined) {
          return 0;
        }

        return currencyStringToCents(normalized);
      },
      z
        .number()
        .int()
        .min(0, "Discount cannot be negative.")
        .max(100_000_000, "Discount is too large."),
    ),
    items: quoteItemsFieldSchema,
  })
      .superRefine((value, ctx) => {
    const subtotalInCents = value.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPriceInCents,
      0,
    );

    if (value.discountInCents > subtotalInCents) {
      ctx.addIssue({
        code: "custom",
        path: ["discountInCents"],
        message: "Discount cannot be larger than the subtotal.",
      });
    }

    if (value.customerContactMethod.toLowerCase() === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value.customerContactHandle)) {
        ctx.addIssue({
          code: "custom",
          path: ["customerContactHandle"],
          message: "Enter a valid email address.",
        });
      }
    }
  });

export const quotePostAcceptanceStatusChangeSchema = z.object({
  postAcceptanceStatus: z.enum(quotePostAcceptanceStatuses, {
    error: () => "Choose a valid post-acceptance status.",
  }),
});

export const quoteCancellationReasons = [
  "customer_changed_mind",
  "price_too_high",
  "schedule_conflict",
  "scope_changed",
  "no_deposit_payment",
  "duplicate_mistake",
  "business_unavailable",
  "other",
] as const;

export const quoteCancellationSchema = z.object({
  cancellationReason: z.enum(quoteCancellationReasons, {
    error: () => "Choose a cancellation reason.",
  }),
  cancellationNote: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(1200, "Cancellation notes must be 1,200 characters or fewer.")
      .optional(),
  ),
});

export const publicQuoteResponseSchema = z.object({
  response: z.enum(["accepted", "rejected"], {
    error: () => "Choose whether to accept or decline this quote.",
  }),
  message: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(1200, "Customer response messages must be 1,200 characters or fewer.")
      .optional(),
  ),
});

export type QuoteEditorInput = z.infer<typeof quoteEditorSchema>;
export type PublicQuoteResponseInput = z.infer<typeof publicQuoteResponseSchema>;
