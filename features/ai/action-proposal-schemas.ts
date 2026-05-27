import { z } from "zod";

import {
  inquiryContactMethods,
  normalizeInquiryContactHandleSubmissionValue,
  type InquiryContactMethod,
} from "@/features/inquiries/form-config";

// ---------------------------------------------------------------------------
// Shared validation for AI assistant action proposals (draft_inquiry,
// draft_quote, schedule_follow_up, update_inquiry_status).
//
// Used by action tools (before returning a proposal), the action executor
// (on confirm), and the client confirmation card (preview + disable confirm).
// ---------------------------------------------------------------------------

export const aiActionTypes = [
  "create_inquiry",
  "create_quote",
  "create_follow_up",
  "update_inquiry_status",
] as const;

export type AiActionType = (typeof aiActionTypes)[number];

export const followUpChannels = [
  "email",
  "phone",
  "sms",
  "whatsapp",
  "messenger",
  "instagram",
  "other",
] as const;

export type FollowUpChannel = (typeof followUpChannels)[number];

export const inquiryWorkflowStatusesForAi = [
  "new",
  "waiting",
  "quoted",
  "won",
  "lost",
] as const;

function emptyToNull(value: unknown) {
  if (value == null) {
    return null;
  }

  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  return value;
}

function emptyToUndefined(value: unknown) {
  if (value == null) {
    return undefined;
  }

  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}

function isValidIsoDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

/** Normalize free-form dates (including ISO datetimes) to YYYY-MM-DD. */
export function normalizeIsoDateInput(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (isValidIsoDateString(trimmed)) {
    return trimmed;
  }

  const dateOnly = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateOnly && isValidIsoDateString(dateOnly[1])) {
    return dateOnly[1];
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const iso = parsed.toISOString().slice(0, 10);
  return isValidIsoDateString(iso) ? iso : null;
}

const CONTACT_METHOD_ALIASES: Record<string, InquiryContactMethod> = {
  e_mail: "email",
  mail: "email",
  telephone: "phone",
  mobile: "phone",
  cell: "phone",
  sms: "phone",
  text: "phone",
  fb: "facebook",
  messenger: "facebook",
  ig: "instagram",
  insta: "instagram",
  wa: "whatsapp",
  whats_app: "whatsapp",
};

export function normalizeInquiryContactMethod(
  value: unknown,
): InquiryContactMethod | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (!normalized) {
    return null;
  }

  const mapped = CONTACT_METHOD_ALIASES[normalized] ?? normalized;

  if (inquiryContactMethods.includes(mapped as InquiryContactMethod)) {
    return mapped as InquiryContactMethod;
  }

  return null;
}

const FOLLOW_UP_CHANNEL_ALIASES: Record<string, FollowUpChannel> = {
  e_mail: "email",
  mail: "email",
  telephone: "phone",
  mobile: "phone",
  cell: "phone",
  text: "sms",
  fb: "messenger",
  facebook: "messenger",
  ig: "instagram",
  insta: "instagram",
  wa: "whatsapp",
  whats_app: "whatsapp",
};

export function normalizeFollowUpChannel(value: unknown): FollowUpChannel | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (!normalized) {
    return null;
  }

  const mapped = FOLLOW_UP_CHANNEL_ALIASES[normalized] ?? normalized;

  if (followUpChannels.includes(mapped as FollowUpChannel)) {
    return mapped as FollowUpChannel;
  }

  return null;
}

function coerceWholeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return Number.NaN;
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }

  return Number.NaN;
}

/** Coerce AI/tool values that are already denominated in cents. */
function coercePriceCents(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }

  if (typeof value === "string") {
    const trimmed = value.trim().replace(/,/g, "").replace(/^\$/, "");
    if (!trimmed) {
      return 0;
    }

    if (/^\d+$/.test(trimmed)) {
      return Math.max(0, Number.parseInt(trimmed, 10));
    }

    if (/^\d+(\.\d{1,2})?$/.test(trimmed)) {
      return Math.max(0, Math.round(Number(trimmed) * 100));
    }
  }

  return Number.NaN;
}

const optionalEmailSchema = z.preprocess(
  emptyToNull,
  z.union([z.string().email(), z.null()]).optional(),
);

const isoDateSchema = z.preprocess(
  (value) => normalizeIsoDateInput(value) ?? value,
  z.string().refine(isValidIsoDateString, "Enter a valid date (YYYY-MM-DD)."),
);

const inquiryContactMethodSchema = z.preprocess(
  (value) => normalizeInquiryContactMethod(value) ?? value,
  z.enum(inquiryContactMethods, {
    message: "Select a supported contact method.",
  }),
);

const followUpChannelSchema = z.preprocess(
  (value) => normalizeFollowUpChannel(value) ?? value,
  z.enum(followUpChannels, {
    message: "Select a supported follow-up channel.",
  }),
);

const quoteLineItemSchema = z.object({
  description: z.string().trim().min(1, "Line items need a description."),
  quantity: z.preprocess(
    coerceWholeNumber,
    z.number().int().min(1, "Quantity must be at least 1."),
  ),
  unitPriceInCents: z.preprocess(
    coercePriceCents,
    z
      .number()
      .int()
      .min(0, "Unit price cannot be negative.")
      .max(100_000_000, "Unit price is too large."),
  ),
});

export const createInquiryPayloadSchema = z
  .object({
    customerName: z
      .string()
      .trim()
      .min(1, "Enter the customer name.")
      .max(120, "Customer name must be 120 characters or fewer."),
    customerEmail: optionalEmailSchema,
    customerContactMethod: inquiryContactMethodSchema,
    customerContactHandle: z
      .string()
      .trim()
      .min(1, "Enter the contact handle."),
    serviceCategory: z
      .string()
      .trim()
      .min(1, "Enter a service category.")
      .max(120, "Service category must be 120 characters or fewer."),
    details: z
      .string()
      .trim()
      .min(1, "Enter inquiry details.")
      .max(4000, "Details must be 4000 characters or fewer."),
    budgetText: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(120, "Budget must be 120 characters or fewer.").optional(),
    ),
    requestedDeadline: z.preprocess(
      (value) => {
        const normalized = normalizeIsoDateInput(value);
        return normalized ?? emptyToUndefined(value);
      },
      z
        .string()
        .refine(isValidIsoDateString, "Enter a valid deadline (YYYY-MM-DD).")
        .optional(),
    ),
  })
  .transform((data) => ({
    ...data,
    customerEmail: data.customerEmail ?? null,
    customerContactHandle: normalizeInquiryContactHandleSubmissionValue(
      data.customerContactMethod,
      data.customerContactHandle,
    ),
  }));

export const createQuotePayloadSchema = z
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
    customerEmail: optionalEmailSchema,
    customerContactMethod: inquiryContactMethodSchema,
    customerContactHandle: z
      .string()
      .trim()
      .min(1, "Enter the contact handle."),
    notes: z.preprocess(
      emptyToNull,
      z.string().trim().max(4000, "Notes must be 4000 characters or fewer.").nullable().optional(),
    ),
    validUntil: isoDateSchema,
    inquiryId: z.preprocess(emptyToNull, z.string().trim().min(1).nullable().optional()),
    items: z.array(quoteLineItemSchema).min(1, "Add at least one line item."),
    discountInCents: z.preprocess(
      (value) => coercePriceCents(value ?? 0),
      z.number().int().min(0, "Discount cannot be negative.").optional(),
    ),
  })
  .transform((data) => ({
    ...data,
    customerEmail: data.customerEmail ?? null,
    notes: data.notes ?? null,
    inquiryId: data.inquiryId ?? null,
    discountInCents: data.discountInCents ?? 0,
    customerContactHandle: normalizeInquiryContactHandleSubmissionValue(
      data.customerContactMethod,
      data.customerContactHandle,
    ),
  }));

export const createFollowUpPayloadSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Enter a follow-up title.")
    .max(160, "Title must be 160 characters or fewer."),
  reason: z
    .string()
    .trim()
    .min(2, "Enter a reason.")
    .max(500, "Reason must be 500 characters or fewer."),
  channel: followUpChannelSchema,
  dueDate: isoDateSchema,
  inquiryId: z.preprocess(emptyToNull, z.string().trim().min(1).nullable().optional()),
  quoteId: z.preprocess(emptyToNull, z.string().trim().min(1).nullable().optional()),
  recurrence: z
    .enum(["none", "daily", "every_3_days", "weekly", "biweekly", "monthly"])
    .optional(),
});

export const updateInquiryStatusPayloadSchema = z.object({
  inquiryId: z.string().trim().min(1, "Inquiry ID is required."),
  status: z.enum(inquiryWorkflowStatusesForAi, {
    message: "Select a valid inquiry status.",
  }),
  reason: z.preprocess(
    emptyToNull,
    z.string().trim().max(500, "Reason must be 500 characters or fewer.").nullable().optional(),
  ),
});

export const aiActionRequestSchema = z.object({
  businessSlug: z.string().min(1),
  action: z.enum(aiActionTypes),
  payload: z.record(z.string(), z.unknown()),
});

export type AiActionRequest = z.infer<typeof aiActionRequestSchema>;

export type CreateInquiryPayload = z.infer<typeof createInquiryPayloadSchema>;
export type CreateQuotePayload = z.infer<typeof createQuotePayloadSchema>;
export type CreateFollowUpPayload = z.infer<typeof createFollowUpPayloadSchema>;
export type UpdateInquiryStatusPayload = z.infer<typeof updateInquiryStatusPayloadSchema>;

export type ActionProposalValidationIssue = {
  field: string;
  message: string;
};

export type ActionProposalValidationResult =
  | {
      ok: true;
      action: AiActionType;
      payload: Record<string, unknown>;
    }
  | {
      ok: false;
      action: AiActionType;
      issues: ActionProposalValidationIssue[];
    };

function formatZodIssues(
  issues: z.ZodIssue[],
): ActionProposalValidationIssue[] {
  return issues.map((issue) => ({
    field: issue.path.length ? issue.path.join(".") : "payload",
    message: issue.message,
  }));
}

export function validateActionProposalPayload(
  action: AiActionType,
  payload: Record<string, unknown>,
): ActionProposalValidationResult {
  switch (action) {
    case "create_inquiry": {
      const parsed = createInquiryPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        return {
          ok: false,
          action,
          issues: formatZodIssues(parsed.error.issues),
        };
      }
      return { ok: true, action, payload: parsed.data };
    }
    case "create_quote": {
      const parsed = createQuotePayloadSchema.safeParse(payload);
      if (!parsed.success) {
        return {
          ok: false,
          action,
          issues: formatZodIssues(parsed.error.issues),
        };
      }
      return { ok: true, action, payload: parsed.data };
    }
    case "create_follow_up": {
      const parsed = createFollowUpPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        return {
          ok: false,
          action,
          issues: formatZodIssues(parsed.error.issues),
        };
      }
      if (!parsed.data.inquiryId && !parsed.data.quoteId) {
        return {
          ok: false,
          action,
          issues: [
            {
              field: "inquiryId",
              message: "Link the follow-up to an inquiry or quote.",
            },
          ],
        };
      }
      return {
        ok: true,
        action,
        payload: {
          ...parsed.data,
          recurrence: parsed.data.recurrence ?? "none",
        },
      };
    }
    case "update_inquiry_status": {
      const parsed = updateInquiryStatusPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        return {
          ok: false,
          action,
          issues: formatZodIssues(parsed.error.issues),
        };
      }
      return { ok: true, action, payload: parsed.data };
    }
    default:
      return {
        ok: false,
        action: "create_inquiry",
        issues: [{ field: "action", message: "Unknown action type." }],
      };
  }
}

export type AiActionProposalInput = {
  action: AiActionType;
  businessId: string;
  businessSlug: string;
  payload: Record<string, unknown>;
};

export function validateAiActionProposal(
  proposal: AiActionProposalInput,
): ActionProposalValidationResult & { businessId?: string; businessSlug?: string } {
  if (!aiActionTypes.includes(proposal.action)) {
    return {
      ok: false,
      action: "create_inquiry",
      issues: [{ field: "action", message: "Unknown action type." }],
    };
  }

  const result = validateActionProposalPayload(proposal.action, proposal.payload);

  if (!result.ok) {
    return result;
  }

  return {
    ...result,
    businessId: proposal.businessId,
    businessSlug: proposal.businessSlug,
  };
}

// ---------------------------------------------------------------------------
// Tool input schemas — aligned with executor validation + coercion
// ---------------------------------------------------------------------------

export const draftInquiryToolInputSchema = z.object({
  customerName: z.string().describe("Customer's full name."),
  customerEmail: z
    .string()
    .optional()
    .describe("Customer's email address (optional)."),
  customerContactMethod: z
    .string()
    .describe(
      "Preferred contact method: email, phone, facebook, instagram, whatsapp, or other.",
    ),
  customerContactHandle: z
    .string()
    .describe("The contact handle (email address, phone number, etc)."),
  serviceCategory: z.string().describe("Service category for the inquiry."),
  details: z.string().describe("Description of what the customer needs."),
  budgetText: z.string().optional().describe("Customer's budget if mentioned."),
  requestedDeadline: z
    .string()
    .optional()
    .describe("Requested deadline if mentioned (ISO date string)."),
});

export const draftQuoteLineItemToolInputSchema = z.object({
  description: z.string().describe("Line item description."),
  quantity: z.coerce
    .number()
    .int()
    .min(1)
    .describe("Quantity (whole number, at least 1)."),
  unitPriceInCents: z.coerce
    .number()
    .int()
    .min(0)
    .describe("Unit price in cents (e.g. 5000 = $50.00)."),
});

export const draftQuoteToolInputSchema = z.object({
  title: z.string().describe("Quote title (e.g. 'Kitchen renovation quote')."),
  customerName: z.string().describe("Customer's full name."),
  customerEmail: z
    .string()
    .optional()
    .describe("Customer's email address (optional)."),
  customerContactMethod: z.string().describe("Preferred contact method."),
  customerContactHandle: z
    .string()
    .describe("Contact handle (email, phone, etc)."),
  notes: z.string().optional().describe("Internal notes for this quote."),
  validUntil: z
    .string()
    .describe("Quote validity date as ISO date string (e.g. 2025-02-15)."),
  inquiryId: z
    .string()
    .optional()
    .describe("Link to an existing inquiry ID if this quote is for a specific inquiry."),
  items: z
    .array(draftQuoteLineItemToolInputSchema)
    .min(1)
    .describe("Quote line items."),
  discountInCents: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Total discount in cents (optional, default 0)."),
});

export const scheduleFollowUpToolInputSchema = z.object({
  title: z.string().describe("Short title for the follow-up."),
  reason: z.string().describe("Why this follow-up is needed."),
  channel: z
    .enum(followUpChannels)
    .describe("Communication channel for the follow-up."),
  dueDate: z.string().describe("Due date as ISO date string (e.g. 2025-02-15)."),
  inquiryId: z.string().optional().describe("Inquiry ID (inquiryId or quoteId required)."),
  quoteId: z.string().optional().describe("Quote ID (inquiryId or quoteId required)."),
  recurrence: z
    .enum(["none", "daily", "every_3_days", "weekly", "biweekly", "monthly"])
    .optional()
    .describe("Recurrence pattern (default: none)."),
});

export const updateInquiryStatusToolInputSchema = z.object({
  inquiryId: z.string().describe("The inquiry ID to update."),
  status: z
    .enum(inquiryWorkflowStatusesForAi)
    .describe("The new status to set."),
  reason: z.string().optional().describe("Optional reason for the status change."),
});
