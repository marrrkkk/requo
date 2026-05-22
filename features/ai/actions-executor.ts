import "server-only";

import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";

import { getBusinessActionContext } from "@/lib/db/business-access";
import { hasFeatureAccess } from "@/lib/plans";
import type { BusinessPlan } from "@/lib/plans/plans";
import { checkUsageAllowance } from "@/lib/plans/usage";
import { createManualInquirySubmission } from "@/features/inquiries/mutations";
import { createQuoteForBusiness } from "@/features/quotes/mutations";
import { createFollowUpForBusiness } from "@/features/follow-ups/mutations";
import { changeInquiryStatusForBusiness } from "@/features/inquiries/mutations";
import type { InquirySubmittedFieldSnapshot } from "@/features/inquiries/form-config";
import type { BusinessType } from "@/features/inquiries/business-types";
import { db } from "@/lib/db/client";
import { businesses, businessInquiryForms } from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// AI Action Executor
//
// Handles confirmed action proposals from the AI assistant. Every action
// re-checks authentication, business membership, and plan access before
// performing any write operation.
// ---------------------------------------------------------------------------

const createInquiryPayloadSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email().nullable().optional(),
  customerContactMethod: z.string().min(1),
  customerContactHandle: z.string().min(1),
  serviceCategory: z.string().min(1),
  details: z.string().min(1),
  budgetText: z.string().optional(),
  requestedDeadline: z.string().optional(),
});

const createQuotePayloadSchema = z.object({
  title: z.string().min(2).max(160),
  customerName: z.string().min(2).max(120),
  customerEmail: z.string().email().nullable().optional(),
  customerContactMethod: z.string().min(1),
  customerContactHandle: z.string().min(1),
  notes: z.string().max(4000).nullable().optional(),
  validUntil: z.string().min(1),
  inquiryId: z.string().nullable().optional(),
  items: z.array(
    z.object({
      description: z.string().min(1),
      quantity: z.number().int().min(1),
      unitPriceInCents: z.number().int().min(0),
    }),
  ).min(1),
  discountInCents: z.number().int().min(0).optional(),
});

const createFollowUpPayloadSchema = z.object({
  title: z.string().min(2).max(160),
  reason: z.string().min(2).max(500),
  channel: z.enum(["email", "phone", "sms", "whatsapp", "messenger", "instagram", "other"]),
  dueDate: z.string().min(1),
  inquiryId: z.string().nullable().optional(),
  quoteId: z.string().nullable().optional(),
  recurrence: z.enum(["none", "daily", "every_3_days", "weekly", "biweekly", "monthly"]).optional(),
});

const updateInquiryStatusPayloadSchema = z.object({
  inquiryId: z.string().min(1),
  status: z.enum(["new", "waiting", "quoted", "won", "lost"]),
  reason: z.string().nullable().optional(),
});

export const aiActionRequestSchema = z.object({
  businessSlug: z.string().min(1),
  action: z.enum(["create_inquiry", "create_quote", "create_follow_up", "update_inquiry_status"]),
  payload: z.record(z.string(), z.unknown()),
});

export type AiActionRequest = z.infer<typeof aiActionRequestSchema>;

export type AiActionResult = {
  ok: true;
  action: string;
  message: string;
  entityId?: string;
  entityUrl?: string;
} | {
  ok: false;
  error: string;
};

export async function executeAiAction(
  userId: string,
  request: AiActionRequest,
): Promise<AiActionResult> {
  // 1. Verify business access
  const actionContext = await getBusinessActionContext({
    businessSlug: request.businessSlug,
    minimumRole: "staff",
    requireActiveBusiness: true,
    unauthorizedMessage: "You do not have permission to perform this action.",
  });

  if (!actionContext.ok) {
    return { ok: false, error: actionContext.error };
  }

  const { user, businessContext } = actionContext;

  // Verify the calling user matches
  if (user.id !== userId) {
    return { ok: false, error: "Session mismatch. Please try again." };
  }

  // 2. Check AI feature access
  if (!hasFeatureAccess(businessContext.business.plan, "aiAssistant")) {
    return { ok: false, error: "Upgrade to Pro to use AI actions." };
  }

  // 3. Execute the specific action
  switch (request.action) {
    case "create_inquiry":
      return executeCreateInquiry(user.id, businessContext, request.payload);
    case "create_quote":
      return executeCreateQuote(user.id, businessContext, request.payload);
    case "create_follow_up":
      return executeCreateFollowUp(user.id, businessContext, request.payload);
    case "update_inquiry_status":
      return executeUpdateInquiryStatus(user.id, businessContext, request.payload);
    default:
      return { ok: false, error: "Unknown action type." };
  }
}

async function executeCreateInquiry(
  userId: string,
  businessContext: { business: { id: string; slug: string; plan: string; name: string } },
  rawPayload: Record<string, unknown>,
): Promise<AiActionResult> {
  const parsed = createInquiryPayloadSchema.safeParse(rawPayload);

  if (!parsed.success) {
    return { ok: false, error: `Invalid inquiry data: ${parsed.error.issues[0]?.message ?? "Check the fields."}` };
  }

  const payload = parsed.data;

  // Get the default inquiry form for this business
  const [defaultForm] = await db
    .select({
      id: businessInquiryForms.id,
      name: businessInquiryForms.name,
      slug: businessInquiryForms.slug,
      businessType: businessInquiryForms.businessType,
      isDefault: businessInquiryForms.isDefault,
      publicInquiryEnabled: businessInquiryForms.publicInquiryEnabled,
    })
    .from(businessInquiryForms)
    .where(
      and(
        eq(businessInquiryForms.businessId, businessContext.business.id),
        eq(businessInquiryForms.isDefault, true),
        isNull(businessInquiryForms.archivedAt),
      ),
    )
    .limit(1);

  if (!defaultForm) {
    return { ok: false, error: "No active inquiry form found for this business." };
  }

  // Build a minimal submitted field snapshot (the AI source doesn't have form config)
  const submittedFieldSnapshot: InquirySubmittedFieldSnapshot = {
    version: 1,
    businessType: (defaultForm.businessType ?? "general_project_services") as BusinessType,
    fields: [],
  };

  try {
    const result = await createManualInquirySubmission({
      business: {
        id: businessContext.business.id,
        slug: businessContext.business.slug,
        name: businessContext.business.name,
        form: {
          id: defaultForm.id,
          name: defaultForm.name,
          slug: defaultForm.slug,
          businessType: defaultForm.businessType,
          isDefault: defaultForm.isDefault,
          publicInquiryEnabled: defaultForm.publicInquiryEnabled,
        },
      },
      submission: {
        customerName: payload.customerName,
        customerEmail: payload.customerEmail ?? null,
        customerContactMethod: payload.customerContactMethod,
        customerContactHandle: payload.customerContactHandle,
        serviceCategory: payload.serviceCategory,
        details: payload.details,
        budgetText: payload.budgetText,
        requestedDeadline: payload.requestedDeadline,
        submittedFieldSnapshot,
      },
      actorUserId: userId,
      source: "ai",
    });

    if (!result.inquiryId) {
      return { ok: false, error: "Could not create the inquiry." };
    }

    return {
      ok: true,
      action: "create_inquiry",
      message: `Inquiry created for ${payload.customerName}.`,
      entityId: result.inquiryId,
      entityUrl: `/businesses/${businessContext.business.slug}/inquiries/${result.inquiryId}`,
    };
  } catch (error) {
    console.error("AI action: create inquiry failed.", error);
    return { ok: false, error: "Could not create the inquiry right now." };
  }
}

async function executeCreateQuote(
  userId: string,
  businessContext: { business: { id: string; slug: string; plan: string } },
  rawPayload: Record<string, unknown>,
): Promise<AiActionResult> {
  const parsed = createQuotePayloadSchema.safeParse(rawPayload);

  if (!parsed.success) {
    return { ok: false, error: `Invalid quote data: ${parsed.error.issues[0]?.message ?? "Check the fields."}` };
  }

  const payload = parsed.data;

  // Check usage allowance
  const quoteAllowance = await checkUsageAllowance(
    businessContext.business.id,
    businessContext.business.plan as BusinessPlan,
    "quotesPerMonth",
  );

  if (!quoteAllowance.allowed) {
    return {
      ok: false,
      error: `You've reached your plan's limit of ${quoteAllowance.limit} quotes this month. Upgrade for unlimited quotes.`,
    };
  }

  // Get business currency
  const [businessRow] = await db
    .select({ defaultCurrency: businesses.defaultCurrency })
    .from(businesses)
    .where(eq(businesses.id, businessContext.business.id))
    .limit(1);

  const currency = businessRow?.defaultCurrency ?? "USD";

  try {
    const createdQuote = await createQuoteForBusiness({
      businessId: businessContext.business.id,
      actorUserId: userId,
      currency,
      inquiryId: payload.inquiryId ?? null,
      quote: {
        title: payload.title,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail ?? null,
        customerContactMethod: payload.customerContactMethod,
        customerContactHandle: payload.customerContactHandle,
        notes: payload.notes ?? undefined,
        validUntil: payload.validUntil,
        discountInCents: payload.discountInCents ?? 0,
        taxInCents: 0,
        items: payload.items.map((item, index) => ({
          id: `ai-item-${index + 1}`,
          description: item.description,
          quantity: item.quantity,
          unitPriceInCents: item.unitPriceInCents,
        })),
      },
    });

    if (!createdQuote) {
      return { ok: false, error: "Could not create the quote. Check that any linked inquiry exists." };
    }

    return {
      ok: true,
      action: "create_quote",
      message: `Quote "${payload.title}" created for ${payload.customerName}.`,
      entityId: createdQuote.id,
      entityUrl: `/businesses/${businessContext.business.slug}/quotes/${createdQuote.id}`,
    };
  } catch (error) {
    console.error("AI action: create quote failed.", error);
    return { ok: false, error: "Could not create the quote right now." };
  }
}

async function executeCreateFollowUp(
  userId: string,
  businessContext: { business: { id: string; slug: string; plan: string } },
  rawPayload: Record<string, unknown>,
): Promise<AiActionResult> {
  const parsed = createFollowUpPayloadSchema.safeParse(rawPayload);

  if (!parsed.success) {
    return { ok: false, error: `Invalid follow-up data: ${parsed.error.issues[0]?.message ?? "Check the fields."}` };
  }

  const payload = parsed.data;

  if (!payload.inquiryId && !payload.quoteId) {
    return { ok: false, error: "A follow-up must be linked to an inquiry or quote." };
  }

  try {
    const result = await createFollowUpForBusiness({
      businessId: businessContext.business.id,
      inquiryId: payload.inquiryId ?? undefined,
      quoteId: payload.quoteId ?? undefined,
      actorUserId: userId,
      followUp: {
        title: payload.title,
        reason: payload.reason,
        channel: payload.channel,
        dueDate: payload.dueDate,
        recurrence: payload.recurrence ?? "none",
      },
    });

    if (!result) {
      return { ok: false, error: "Could not create the follow-up. Check that the linked inquiry or quote exists." };
    }

    return {
      ok: true,
      action: "create_follow_up",
      message: `Follow-up "${payload.title}" scheduled for ${payload.dueDate}.`,
      entityId: result.followUpId,
    };
  } catch (error) {
    console.error("AI action: create follow-up failed.", error);
    return { ok: false, error: "Could not create the follow-up right now." };
  }
}

async function executeUpdateInquiryStatus(
  userId: string,
  businessContext: { business: { id: string; slug: string; plan: string } },
  rawPayload: Record<string, unknown>,
): Promise<AiActionResult> {
  const parsed = updateInquiryStatusPayloadSchema.safeParse(rawPayload);

  if (!parsed.success) {
    return { ok: false, error: `Invalid status change: ${parsed.error.issues[0]?.message ?? "Check the fields."}` };
  }

  const payload = parsed.data;

  try {
    const result = await changeInquiryStatusForBusiness({
      businessId: businessContext.business.id,
      inquiryId: payload.inquiryId,
      nextStatus: payload.status,
      actorUserId: userId,
    });

    if (!result) {
      return { ok: false, error: "That inquiry could not be found." };
    }

    return {
      ok: true,
      action: "update_inquiry_status",
      message: `Inquiry status updated to "${payload.status}".`,
      entityId: payload.inquiryId,
      entityUrl: `/businesses/${businessContext.business.slug}/inquiries/${payload.inquiryId}`,
    };
  } catch (error) {
    console.error("AI action: update inquiry status failed.", error);
    return { ok: false, error: "Could not update the inquiry status right now." };
  }
}
