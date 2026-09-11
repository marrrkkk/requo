import { z } from "zod";
import { invoiceStatusFilterValues, paymentMethods } from "@/features/invoices/types";
import { parseMoneyToCents } from "@/features/invoices/utils";

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

const optionalText = (max: number) => z.preprocess(
  (value) => typeof value === "string" && !value.trim() ? undefined : value,
  z.string().trim().max(max).optional(),
);

const dateValue = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

const money = (label: string) => z.preprocess(
  (value) => parseMoneyToCents(value),
  z.number().int().min(0, `${label} cannot be negative.`).max(2_000_000_000, `${label} is too large.`),
);

export const invoiceLineItemSchema = z.object({
  description: z.string().trim().min(1, "Description is required.").max(500),
  quantity: z.coerce.number().int().min(1).max(1_000_000),
  unitPriceInCents: money("Unit price"),
});

export const invoiceSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  customerName: z.string().trim().min(1, "Customer name is required.").max(200),
  customerEmail: optionalText(320),
  customerContactMethod: z.string().trim().min(1).max(40).default("email"),
  customerContactHandle: z.string().trim().max(320).default(""),
  issueDate: dateValue,
  dueDate: dateValue,
  discountInCents: money("Discount"),
  taxInCents: money("Tax"),
  taxLabel: optionalText(40),
  notes: optionalText(4000),
  paymentTerms: optionalText(2000),
  items: z.array(invoiceLineItemSchema).min(1, "Add at least one line item.").max(100),
}).superRefine((value, ctx) => {
  if (value.dueDate < value.issueDate) {
    ctx.addIssue({ code: "custom", path: ["dueDate"], message: "Due date cannot be before the issue date." });
  }
  const subtotal = value.items.reduce((sum, item) => sum + item.quantity * item.unitPriceInCents, 0);
  if (value.discountInCents > subtotal) {
    ctx.addIssue({ code: "custom", path: ["discountInCents"], message: "Discount cannot exceed the subtotal." });
  }
});

export const paymentSchema = z.object({
  amountInCents: z.preprocess(
    (value) => parseMoneyToCents(value),
    z.number().int().positive("Payment amount must be greater than zero.").max(2_000_000_000),
  ),
  paymentDate: dateValue,
  method: z.enum(paymentMethods),
  reference: optionalText(200),
  notes: optionalText(2000),
});

export const invoiceListFiltersSchema = z.object({
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
  status: z
    .preprocess(
      (value) => firstString(value) ?? "all",
      z.enum(invoiceStatusFilterValues),
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
