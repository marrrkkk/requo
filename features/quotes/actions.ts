"use server";

import { revalidateTag, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { emitEvent } from "@/features/automations/dispatcher";
import {
  getValidationActionState,
} from "@/lib/action-state";
import {
  getBusinessInquiryDetailCacheTags,
  getBusinessQuoteDetailCacheTags,
  getBusinessQuoteListCacheTags,
  uniqueCacheTags,
} from "@/lib/cache/business-tags";
import {
  getBusinessMessagingSettings,
  getBusinessOwnerEmails,
  getWorkspaceBusinessActionContext,
} from "@/lib/db/business-access";
import { env, isEmailConfigured } from "@/lib/env";
import {
  sendEnableQuoteAutoFollowUpEvent,
  sendPushQuoteResponseEvent,
  sendPushQuoteSentEvent,
} from "@/lib/inngest/send";
import { getUsageLimit, hasFeatureAccess } from "@/lib/plans";
import { checkUsageAllowance } from "@/lib/plans/usage";
import { assertPublicActionRateLimit } from "@/lib/rate-limit/redis-rate-limiter";
import {
  getResendFromEmailConfigurationError,
  getResendSendFailureMessage,
  sendQuoteEmail,
} from "@/lib/resend/client";
import {
  archiveQuoteForBusiness,
  bulkArchiveQuotesForBusiness,
  bulkDeleteDraftQuotesForBusiness,
  bulkVoidQuotesForBusiness,
  cancelAcceptedQuoteForBusiness,
  completeAcceptedQuoteForBusiness,
  createPostWinChecklistItem,
  createQuoteForBusiness,
  deleteDraftQuoteForBusiness,
  logQuoteSendEvent,
  markQuoteSentForBusiness,
  respondToPublicQuoteByToken,
  restoreArchivedQuoteForBusiness,
  togglePostWinChecklistItem,
  updateQuotePostAcceptanceStatusForBusiness,
  updateQuoteForBusiness,
  voidQuoteForBusiness,
} from "@/features/quotes/mutations";
import { getQuoteSendPayloadForBusiness } from "@/features/quotes/queries";
import {
  publicQuoteResponseSchema,
  quoteCancellationSchema,
  quoteEditorSchema,
  quotePostAcceptanceStatusChangeSchema,
} from "@/features/quotes/schemas";
import {
  getBusinessQuotePath,
} from "@/features/businesses/routes";
import type {
  PublicQuoteResponseActionState,
  QuoteBulkActionState,
  QuoteCancellationActionState,
  QuoteCompletionActionState,
  QuoteDeliveryMethod,
  QuoteEditorActionState,
  QuotePostAcceptanceActionState,
  PostWinChecklistActionState,
  QuoteRecordActionState,
  QuoteSendActionState,
} from "@/features/quotes/types";
import {
  getPublicQuoteUrl,
  getQuotePostAcceptanceStatusLabel,
} from "@/features/quotes/utils";

const initialEditorState: QuoteEditorActionState = {};
const initialPostAcceptanceState: QuotePostAcceptanceActionState = {};
const initialSendState: QuoteSendActionState = {};
const initialPublicQuoteResponseState: PublicQuoteResponseActionState = {};
const freePlanRequoQuoteSendsPerDay =
  getUsageLimit("free", "requoQuoteEmailsPerDay") ?? 3;
const freePlanRequoQuoteSendsPerMonth =
  getUsageLimit("free", "requoQuoteEmailsPerMonth") ?? 30;

function updateCacheTags(tags: string[]) {
  for (const tag of uniqueCacheTags(tags)) {
    updateTag(tag);
  }
}

function revalidateCacheTags(tags: string[]) {
  for (const tag of uniqueCacheTags(tags)) {
    revalidateTag(tag, "max");
  }
}

function getQuoteMutationCacheTags(
  businessId: string,
  quoteId?: string | null,
  inquiryId?: string | null,
) {
  return uniqueCacheTags([
    ...getBusinessQuoteListCacheTags(businessId),
    ...(quoteId ? getBusinessQuoteDetailCacheTags(businessId, quoteId) : []),
    ...(inquiryId
      ? getBusinessInquiryDetailCacheTags(businessId, inquiryId)
      : []),
  ]);
}

function mapQuoteEditorFieldErrors(fieldErrors: Record<string, string[] | undefined>) {
  return {
    title: fieldErrors.title,
    customerName: fieldErrors.customerName,
    customerEmail: fieldErrors.customerEmail,
    customerContactMethod: fieldErrors.customerContactMethod,
    customerContactHandle: fieldErrors.customerContactHandle,
    notes: fieldErrors.notes,
    terms: fieldErrors.terms,
    validUntil: fieldErrors.validUntil,
    discount: fieldErrors.discountInCents,
    tax: fieldErrors.taxInCents,
    items: fieldErrors.items,
  };
}

export async function createQuoteAction(
  inquiryId: string | null,
  prevState: QuoteEditorActionState = initialEditorState,
  formData: FormData,
): Promise<QuoteEditorActionState> {
  void prevState;

  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;

  const quoteAllowance = await checkUsageAllowance(
    businessContext.business.id,
    businessContext.business.plan,
    "quotesPerMonth",
  );

  if (!quoteAllowance.allowed) {
    return {
      error: `You've reached your plan's limit of ${quoteAllowance.limit} quotes this month. Upgrade your plan for unlimited quotes.`,
    };
  }

  const validationResult = quoteEditorSchema.safeParse({
    title: formData.get("title"),
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    customerContactMethod: formData.get("customerContactMethod"),
    customerContactHandle: formData.get("customerContactHandle"),
    notes: formData.get("notes"),
    terms: formData.get("terms"),
    validUntil: formData.get("validUntil"),
    discountInCents: formData.get("discount"),
    taxInCents: formData.get("tax"),
    taxLabel: formData.get("taxLabel"),
    items: formData.get("items"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the highlighted fields and try again.",
      mapQuoteEditorFieldErrors,
    );
  }

  let quotePath: string | null = null;

  try {
    const createdQuote = await createQuoteForBusiness({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      currency: businessContext.business.defaultCurrency,
      inquiryId,
      quote: validationResult.data,
    });

    if (!createdQuote) {
      return {
        error: "That linked inquiry could not be found.",
      };
    }

    updateCacheTags(
      getQuoteMutationCacheTags(
        businessContext.business.id,
        createdQuote.id,
        inquiryId,
      ),
    );

    quotePath = getBusinessQuotePath(
      businessContext.business.slug,
      createdQuote.id,
    );
  } catch (error) {
    console.error("Failed to create quote.", error);

    return {
      error: "We couldn't create that quote right now.",
    };
  }

  if (quotePath) {
    redirect(quotePath);
  }

  return {
    error: "We couldn't create that quote right now.",
  };
}

export async function updateQuoteAction(
  quoteId: string,
  prevState: QuoteEditorActionState = initialEditorState,
  formData: FormData,
): Promise<QuoteEditorActionState> {
  void prevState;

  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;
  const validationResult = quoteEditorSchema.safeParse({
    title: formData.get("title"),
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    customerContactMethod: formData.get("customerContactMethod"),
    customerContactHandle: formData.get("customerContactHandle"),
    notes: formData.get("notes"),
    terms: formData.get("terms"),
    validUntil: formData.get("validUntil"),
    discountInCents: formData.get("discount"),
    taxInCents: formData.get("tax"),
    taxLabel: formData.get("taxLabel"),
    items: formData.get("items"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the highlighted fields and try again.",
      mapQuoteEditorFieldErrors,
    );
  }

  try {
    const result = await updateQuoteForBusiness({
      businessId: businessContext.business.id,
      quoteId,
      actorUserId: user.id,
      quote: validationResult.data,
    });

    if (!result) {
      return {
        error: "That quote could not be found.",
      };
    }

    if (result.locked) {
      return {
        error: "Only draft quotes can be edited.",
      };
    }

    updateCacheTags(
      getQuoteMutationCacheTags(businessContext.business.id, quoteId),
    );

    return {
      success: "Draft quote saved.",
    };
  } catch (error) {
    console.error("Failed to update quote.", error);

    return {
      error: "We couldn't save that quote right now.",
    };
  }
}

async function runQuoteRecordAction(
  quoteId: string,
  mutation: (input: {
    businessId: string;
    quoteId: string;
    actorUserId: string;
  }) => Promise<
    | {
        inquiryId: string | null;
        changed?: boolean;
        deleted?: boolean;
        locked?: boolean;
        lockedReason?: "archived" | "draft" | "lifecycle";
        quoteNumber: string;
        status: string;
      }
    | null
  >,
  messages: {
    success: string;
    unchanged: string;
    lockedDraft?: string;
    lockedArchived?: string;
    lockedLifecycle?: string;
    fallbackError: string;
    redirectHref?: string;
  },
): Promise<QuoteRecordActionState> {
  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;

  try {
    const result = await mutation({
      businessId: businessContext.business.id,
      quoteId,
      actorUserId: user.id,
    });

    if (!result) {
      return {
        error: "That quote could not be found.",
      };
    }

    updateCacheTags(
      getQuoteMutationCacheTags(
        businessContext.business.id,
        quoteId,
        result.inquiryId,
      ),
    );

    if (result.locked) {
      return {
        error:
          result.lockedReason === "draft"
            ? messages.lockedDraft ?? "Draft quotes use a different action."
            : result.lockedReason === "archived"
              ? messages.lockedArchived ?? "Restore this quote to active first."
              : messages.lockedLifecycle ?? "This quote can no longer be changed that way.",
      };
    }

    if (messages.redirectHref && (result.changed || result.deleted)) {
      redirect(messages.redirectHref);
    }

    return {
      success:
        result.changed || result.deleted ? messages.success : messages.unchanged,
    };
  } catch (error) {
    console.error(messages.fallbackError, error);

    return {
      error: "We couldn't update that quote right now.",
    };
  }
}

export async function deleteDraftQuoteAction(
  quoteId: string,
  _prevState?: QuoteRecordActionState,
  formData?: FormData,
): Promise<QuoteRecordActionState> {
  const redirectHref = formData ? formData.get("redirectHref") as string | null : null;

  return runQuoteRecordAction(quoteId, deleteDraftQuoteForBusiness, {
    success: "Draft quote deleted.",
    unchanged: "Draft quote is already deleted.",
    lockedArchived: "Restore this draft to active before deleting it.",
    lockedLifecycle:
      "Only draft quotes can be deleted. Use void or archive for quotes that were already sent.",
    fallbackError: "Failed to delete draft quote.",
    redirectHref: redirectHref || undefined,
  });
}

export async function archiveQuoteAction(
  quoteId: string,
  _prevState: QuoteRecordActionState,
  _formData: FormData,
): Promise<QuoteRecordActionState> {
  void _prevState;
  void _formData;

  return runQuoteRecordAction(quoteId, archiveQuoteForBusiness, {
    success: "Quote archived.",
    unchanged: "Quote is already archived.",
    lockedDraft: "Delete draft quotes instead of archiving them.",
    fallbackError: "Failed to archive quote.",
  });
}

export async function restoreArchivedQuoteAction(
  quoteId: string,
  _prevState: QuoteRecordActionState,
  _formData: FormData,
): Promise<QuoteRecordActionState> {
  void _prevState;
  void _formData;

  return runQuoteRecordAction(quoteId, restoreArchivedQuoteForBusiness, {
    success: "Quote restored to active.",
    unchanged: "Quote is already active.",
    fallbackError: "Failed to restore archived quote.",
  });
}

export async function voidQuoteAction(
  quoteId: string,
  _prevState: QuoteRecordActionState,
  _formData: FormData,
): Promise<QuoteRecordActionState> {
  void _prevState;
  void _formData;

  return runQuoteRecordAction(quoteId, voidQuoteForBusiness, {
    success: "Quote voided.",
    unchanged: "Quote is already voided.",
    lockedLifecycle: "Only sent quotes can be voided.",
    fallbackError: "Failed to void quote.",
  });
}

export async function sendQuoteAction(
  quoteId: string,
  prevState: QuoteSendActionState = initialSendState,
  formData: FormData,
): Promise<QuoteSendActionState> {
  void prevState;

  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;
  const deliveryMethod: QuoteDeliveryMethod =
    formData.get("deliveryMethod") === "manual" ? "manual" : "requo";

  try {
    const quote = await getQuoteSendPayloadForBusiness({
      businessId: businessContext.business.id,
      quoteId,
    });

    if (!quote) {
      return {
        error: "That quote could not be found.",
      };
    }

    if (quote.status !== "draft") {
      return {
        error: "Only draft quotes can be sent.",
      };
    }

    if (!quote.publicToken) {
      return {
        error:
          "This quote's customer link is unavailable right now, so it can't be sent.",
      };
    }

    const unpricedItems = quote.items.filter(
      (item) => item.unitPriceInCents <= 0,
    );

    if (unpricedItems.length > 0) {
      return {
        error:
          unpricedItems.length === 1
            ? "One line item still needs pricing review. Set a price before sending this quote."
            : `${unpricedItems.length} line items still need pricing review. Set a price for each one before sending this quote.`,
      };
    }

    if (
      deliveryMethod === "requo" &&
      businessContext.business.plan === "free"
    ) {
      const [dailyAllowance, monthlyAllowance] = await Promise.all([
        checkUsageAllowance(
          businessContext.business.id,
          businessContext.business.plan,
          "requoQuoteEmailsPerDay",
        ),
        checkUsageAllowance(
          businessContext.business.id,
          businessContext.business.plan,
          "requoQuoteEmailsPerMonth",
        ),
      ]);

      if (!dailyAllowance.allowed) {
        return {
          error: `Free plan includes ${freePlanRequoQuoteSendsPerDay} Requo sends per day and ${freePlanRequoQuoteSendsPerMonth} per month. You've hit today's send limit. Send this quote manually or upgrade to keep using Requo delivery.`,
        };
      }

      if (!monthlyAllowance.allowed) {
        return {
          error: `Free plan includes ${freePlanRequoQuoteSendsPerDay} Requo sends per day and ${freePlanRequoQuoteSendsPerMonth} per month. You've hit this month's send limit. Send this quote manually or upgrade to keep using Requo delivery.`,
        };
      }
    }

    const businessSettings = await getBusinessMessagingSettings(
      businessContext.business.id,
    );

    if (!businessSettings) {
      return {
        error: "This business could not be loaded.",
      };
    }

    const ownerEmails = await getBusinessOwnerEmails(businessContext.business.id);
    const publicQuoteUrl = new URL(
      getPublicQuoteUrl(quote.publicToken),
      env.BETTER_AUTH_URL,
    ).toString();

    if (deliveryMethod === "requo") {
      if (!isEmailConfigured) {
        return {
          error:
            "Quote email delivery is unavailable right now. Configure email and try again.",
        };
      }

      const resendSenderConfigurationError =
        getResendFromEmailConfigurationError();

      if (resendSenderConfigurationError) {
        return {
          error: resendSenderConfigurationError,
        };
      }

      await sendQuoteEmail({
        quoteId: quote.id,
        updatedAt: quote.updatedAt,
        businessName: businessContext.business.name,
        customerName: quote.customerName,
        customerEmail: quote.customerEmail,
        quoteNumber: quote.quoteNumber,
        title: quote.title,
        publicQuoteUrl,
        currency: quote.currency,
        validUntil: quote.validUntil,
        subtotalInCents: quote.subtotalInCents,
        discountInCents: quote.discountInCents,
        taxInCents: quote.taxInCents,
        taxLabel: quote.taxLabel,
        totalInCents: quote.totalInCents,
        notes: quote.notes,
        emailSignature: businessSettings.defaultEmailSignature,
        items: quote.items,
        templateOverrides: hasFeatureAccess(
          businessContext.business.plan,
          "emailTemplates",
        )
          ? businessSettings.quoteEmailTemplate
          : null,
        replyToEmail: businessSettings.contactEmail ?? ownerEmails[0],
        businessId: businessContext.business.id,
        userId: user.id,
      });
    }

    const result = await markQuoteSentForBusiness({
      businessId: businessContext.business.id,
      quoteId,
      actorUserId: user.id,
      sendMethod: deliveryMethod,
    });

    if (!result) {
      return {
        error: "That quote could not be found.",
      };
    }

    if (!result.changed) {
      return {
        error: "Only active draft quotes can be sent.",
      };
    }

    // Emit quote.sent automation event
    emitEvent(businessContext.business.id, "quote.sent", {
      quoteId,
      sentAt: new Date().toISOString(),
      recipientEmail: quote.customerEmail ?? "",
    });

    // Enable auto follow-up if requested and sent via Requo email
    if (
      deliveryMethod === "requo" &&
      formData.get("autoFollowUp") === "on" &&
      hasFeatureAccess(businessContext.business.plan, "autoFollowUps")
    ) {
      const delayDays = Math.max(1, Math.min(14, Number(formData.get("autoFollowUpDelay")) || 3));
      const maxAttempts = Math.max(1, Math.min(5, Number(formData.get("autoFollowUpMax")) || 2));

      void sendEnableQuoteAutoFollowUpEvent({
        quoteId,
        delayDays,
        maxAttempts,
      }).catch((error) => {
        console.error("Failed to queue auto follow-up for quote.", error);
      });
    }

    if (businessSettings.notifyPushOnQuoteSent) {
      void sendPushQuoteSentEvent({
        businessId: businessContext.business.id,
        businessSlug: businessContext.business.slug,
        quoteId: quote.id,
        quoteNumber: result.quoteNumber,
        customerName: quote.customerName,
      }).catch((error) => {
        console.error("Failed to queue push notification for quote sent.", error);
      });
    }

    updateCacheTags(
      getQuoteMutationCacheTags(
        businessContext.business.id,
        quoteId,
        result.inquiryId,
      ),
    );

    return {
      success:
        deliveryMethod === "manual"
          ? `Quote ${result.quoteNumber} marked as sent after manual delivery.`
          : `Quote ${result.quoteNumber} sent to ${quote.customerEmail}.`,
    };
  } catch (error) {
    console.error("Failed to send quote email.", error);

    return {
      error:
        getResendSendFailureMessage(error) ??
        "We couldn't send that quote right now.",
    };
  }
}

export async function logQuoteSendEventAction(
  quoteId: string,
  eventType: string,
  channel?: string,
): Promise<{ error?: string }> {
  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return { error: ownerAccess.error };
  }

  const { user, businessContext } = ownerAccess;

  try {
    await logQuoteSendEvent({
      businessId: businessContext.business.id,
      quoteId,
      inquiryId: null,
      actorUserId: user.id,
      eventType,
      channel,
    });

    updateCacheTags(
      getQuoteMutationCacheTags(businessContext.business.id, quoteId),
    );

    return {};
  } catch (error) {
    console.error("Failed to log quote send event.", error);

    return { error: "We couldn't log that action right now." };
  }
}

export async function stopAutoFollowUpAction(
  quoteId: string,
): Promise<{ error?: string; success?: string }> {
  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return { error: ownerAccess.error };
  }

  const { businessContext } = ownerAccess;

  try {
    const { stopAutoFollowUpForQuote } = await import(
      "@/features/quotes/mutations"
    );
    await stopAutoFollowUpForQuote(quoteId);

    updateCacheTags(
      getQuoteMutationCacheTags(businessContext.business.id, quoteId),
    );

    return { success: "Auto follow-up stopped." };
  } catch (error) {
    console.error("Failed to stop auto follow-up.", error);
    return { error: "Couldn't stop auto follow-up right now." };
  }
}

export async function updateQuotePostAcceptanceStatusAction(
  quoteId: string,
  prevState: QuotePostAcceptanceActionState = initialPostAcceptanceState,
  formData: FormData,
): Promise<QuotePostAcceptanceActionState> {
  void prevState;

  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;
  const validationResult = quotePostAcceptanceStatusChangeSchema.safeParse({
    postAcceptanceStatus: formData.get("postAcceptanceStatus"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Choose a valid post-acceptance status.",
    );
  }

  try {
    const result = await updateQuotePostAcceptanceStatusForBusiness({
      businessId: businessContext.business.id,
      quoteId,
      actorUserId: user.id,
      postAcceptanceStatus: validationResult.data.postAcceptanceStatus,
    });

    if (!result) {
      return {
        error: "That quote could not be found.",
      };
    }

    if (result.locked) {
      return {
        error: "Only accepted quotes can be marked as booked or scheduled.",
      };
    }

    updateCacheTags(
      getQuoteMutationCacheTags(
        businessContext.business.id,
        quoteId,
        result.inquiryId,
      ),
    );

    if (!result.updated) {
      return {
        success: `Quote is already marked ${getQuotePostAcceptanceStatusLabel(
          result.postAcceptanceStatus,
        ).toLowerCase()}.`,
      };
    }

    return {
      success:
        result.postAcceptanceStatus === "none"
          ? "Post-acceptance status cleared."
          : `Quote marked ${getQuotePostAcceptanceStatusLabel(
              result.postAcceptanceStatus,
            ).toLowerCase()}.`,
    };
  } catch (error) {
    console.error("Failed to update quote post-acceptance status.", error);

    return {
      error: "We couldn't update the post-acceptance status right now.",
    };
  }
}

export async function respondToPublicQuoteAction(
  token: string,
  prevState: PublicQuoteResponseActionState = initialPublicQuoteResponseState,
  formData: FormData,
): Promise<PublicQuoteResponseActionState> {
  void prevState;

  const validationResult = publicQuoteResponseSchema.safeParse({
    response: formData.get("response"),
    message: formData.get("message"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Check your response and try again.");
  }

  const allowed = await assertPublicActionRateLimit({
    action: "public-quote-respond",
    scope: token,
    limit: 6,
    windowMs: 15 * 60 * 1000,
  });

  if (!allowed) {
    return {
      error: "We couldn't process that response right now. Please try again.",
    };
  }

  try {
    const result = await respondToPublicQuoteByToken({
      token,
      response: validationResult.data.response,
      message: validationResult.data.message,
    });

    if (!result) {
      return {
        error: "This quote is unavailable.",
      };
    }

    revalidateCacheTags(
      getQuoteMutationCacheTags(
        result.businessId,
        result.quoteId,
        result.inquiryId,
      ),
    );

    if (!result.updated) {
      if (result.status === "accepted") {
        return {
          success: `Quote ${result.quoteNumber} has already been accepted.`,
        };
      }

      if (result.status === "rejected") {
        return {
          success: `Quote ${result.quoteNumber} has already been declined.`,
        };
      }

      if (result.status === "expired") {
        return {
          error: "This quote has expired and can no longer be accepted online.",
        };
      }

      if (result.status === "voided") {
        return {
          error: "This quote has been voided and can no longer be accepted online.",
        };
      }

      return {
        error: "This quote is not accepting responses right now.",
      };
    }

    // Emit quote.accepted or quote.rejected automation event
    if (result.status === "accepted") {
      emitEvent(result.businessId, "quote.accepted", {
        quoteId: result.quoteId,
        acceptedAt: new Date().toISOString(),
        amount: result.totalInCents ?? 0,
      });
    } else if (result.status === "rejected") {
      emitEvent(result.businessId, "quote.rejected", {
        quoteId: result.quoteId,
        rejectedAt: new Date().toISOString(),
        reason: result.customerResponseMessage ?? undefined,
      });
    }

    if (result.notifyPushOnQuoteResponse) {
      const responseLabel =
        result.status === "accepted" ? "accepted" : "declined";

      void sendPushQuoteResponseEvent({
        businessId: result.businessId,
        businessSlug: result.businessSlug,
        quoteId: result.quoteId,
        quoteNumber: result.quoteNumber,
        customerName: result.customerName,
        responseLabel,
      }).catch((error) => {
        console.error("Failed to queue push notification for quote response.", error);
      });
    }

    const respondedAt =
      "updatedAt" in result && result.updatedAt
        ? result.updatedAt
        : new Date();

    return {
      success:
        result.status === "accepted"
          ? `Quote ${result.quoteNumber} accepted. Your response has been recorded.`
          : `Quote ${result.quoteNumber} declined. Your response has been recorded.`,
      resolvedQuote: {
        status: result.status,
        customerRespondedAt: respondedAt.toISOString(),
        customerResponseMessage: result.customerResponseMessage ?? null,
      },
    };
  } catch (error) {
    console.error("Failed to record public quote response.", error);

    return {
      error: "We couldn't save that response right now. Please try again.",
    };
  }
}

export async function cancelAcceptedQuoteAction(
  quoteId: string,
  prevState: QuoteCancellationActionState,
  formData: FormData,
): Promise<QuoteCancellationActionState> {
  void prevState;

  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;
  const validationResult = quoteCancellationSchema.safeParse({
    cancellationReason: formData.get("cancellationReason"),
    cancellationNote: formData.get("cancellationNote"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the highlighted fields and try again.",
    );
  }

  try {
    const result = await cancelAcceptedQuoteForBusiness({
      businessId: businessContext.business.id,
      quoteId,
      actorUserId: user.id,
      cancellationReason: validationResult.data.cancellationReason,
      cancellationNote: validationResult.data.cancellationNote,
    });

    if (!result) {
      return {
        error: "That quote could not be found.",
      };
    }

    updateCacheTags(
      getQuoteMutationCacheTags(
        businessContext.business.id,
        quoteId,
        result.inquiryId,
      ),
    );

    if (!result.updated) {
      if (result.reason === "already_canceled") {
        return { success: "This quote has already been canceled." };
      }
      if (result.reason === "already_completed") {
        return { error: "Completed work cannot be canceled." };
      }
      return {
        error: "Only accepted quotes can be canceled.",
      };
    }

    return {
      success: `Quote ${result.quoteNumber} canceled.`,
    };
  } catch (error) {
    console.error("Failed to cancel accepted quote.", error);

    return {
      error: "We couldn't cancel that quote right now.",
    };
  }
}

export async function completeAcceptedQuoteAction(
  quoteId: string,
  prevState: QuoteCompletionActionState,
  _formData: FormData,
): Promise<QuoteCompletionActionState> {
  void prevState;
  void _formData;

  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;

  try {
    const result = await completeAcceptedQuoteForBusiness({
      businessId: businessContext.business.id,
      quoteId,
      actorUserId: user.id,
    });

    if (!result) {
      return {
        error: "That quote could not be found.",
      };
    }

    updateCacheTags(
      getQuoteMutationCacheTags(
        businessContext.business.id,
        quoteId,
        result.inquiryId,
      ),
    );

    if (!result.updated) {
      if (result.reason === "already_completed") {
        return { success: "This work is already marked completed." };
      }
      if (result.reason === "already_canceled") {
        return { error: "Canceled quotes cannot be completed." };
      }
      return {
        error: "Only accepted quotes can be marked completed.",
      };
    }

    return {
      success: `Work completed for quote ${result.quoteNumber}.`,
    };
  } catch (error) {
    console.error("Failed to complete accepted quote.", error);

    return {
      error: "We couldn't mark that work as completed right now.",
    };
  }
}

export async function togglePostWinChecklistItemAction(
  quoteId: string,
  checklistItemId: string,
): Promise<PostWinChecklistActionState> {
  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;

  try {
    const result = await togglePostWinChecklistItem({
      businessId: businessContext.business.id,
      quoteId,
      checklistItemId,
      actorUserId: user.id,
    });

    if (!result) {
      return {
        error: "That checklist item could not be found.",
      };
    }

    updateCacheTags(
      getQuoteMutationCacheTags(businessContext.business.id, quoteId),
    );

    return {
      success: result.isCompleted
        ? `"${result.label}" checked off.`
        : `"${result.label}" unchecked.`,
    };
  } catch (error) {
    console.error("Failed to toggle checklist item.", error);

    return {
      error: "We couldn't update that checklist item right now.",
    };
  }
}

export async function createPostWinChecklistItemAction(
  quoteId: string,
  label: string,
): Promise<PostWinChecklistActionState> {
  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;
  const trimmedLabel = label?.trim();

  if (!trimmedLabel || trimmedLabel.length > 200) {
    return {
      error: "Checklist item must be between 1 and 200 characters.",
    };
  }

  try {
    const result = await createPostWinChecklistItem({
      businessId: businessContext.business.id,
      quoteId,
      actorUserId: user.id,
      label: trimmedLabel,
    });

    if (!result) {
      return {
        error: "Items can only be added to accepted quotes.",
      };
    }

    updateCacheTags(
      getQuoteMutationCacheTags(businessContext.business.id, quoteId),
    );

    return {
      success: `"${result.label}" added to checklist.`,
    };
  } catch (error) {
    console.error("Failed to create checklist item.", error);

    return {
      error: "We couldn't add that checklist item right now.",
    };
  }
}

// ---------------------------------------------------------------------------
// Public: Request Revision
// ---------------------------------------------------------------------------

import {
  publicQuoteRevisionRequestSchema,
} from "@/features/quotes/schemas";
import {
  archiveQuoteVersionAndRevise,
  requestQuoteRevisionByToken,
} from "@/features/quotes/mutations";
import type { PublicQuoteRevisionRequestActionState } from "@/features/quotes/types";

const initialRevisionRequestState: PublicQuoteRevisionRequestActionState = {};

export async function requestQuoteRevisionAction(
  token: string,
  prevState: PublicQuoteRevisionRequestActionState = initialRevisionRequestState,
  formData: FormData,
): Promise<PublicQuoteRevisionRequestActionState> {
  void prevState;

  const validationResult = publicQuoteRevisionRequestSchema.safeParse({
    message: formData.get("message"),
    itemComments: formData.get("itemComments"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Check your request and try again.");
  }

  const allowed = await assertPublicActionRateLimit({
    action: "public-quote-revision",
    scope: token,
    limit: 4,
    windowMs: 15 * 60 * 1000,
  });

  if (!allowed) {
    return {
      error: "Too many revision requests. Please try again later.",
    };
  }

  try {
    const result = await requestQuoteRevisionByToken({
      token,
      message: validationResult.data.message,
      itemComments: validationResult.data.itemComments ?? [],
    });

    if (!result) {
      return {
        error: "This quote is unavailable.",
      };
    }

    if (!result.updated) {
      return {
        error: "This quote is not accepting revision requests right now.",
      };
    }

    revalidateCacheTags(
      getQuoteMutationCacheTags(
        result.businessId,
        result.quoteId,
        result.inquiryId,
      ),
    );

    if (result.notifyPushOnQuoteResponse) {
      void sendPushQuoteResponseEvent({
        businessId: result.businessId,
        businessSlug: result.businessSlug,
        quoteId: result.quoteId,
        quoteNumber: result.quoteNumber,
        customerName: result.customerName,
        responseLabel: "revision requested",
      }).catch((error) => {
        console.error("Failed to queue push notification for revision request.", error);
      });
    }

    return {
      success: "Your revision request has been sent. The business will review your feedback.",
    };
  } catch (error) {
    console.error("Failed to request quote revision.", error);

    return {
      error: "We couldn't submit that revision request right now. Please try again.",
    };
  }
}

// ---------------------------------------------------------------------------
// Dashboard: Revise Quote (archive current version and bump)
// ---------------------------------------------------------------------------

export async function reviseQuoteAction(
  quoteId: string,
  _prevState: QuoteRecordActionState,
  _formData: FormData,
): Promise<QuoteRecordActionState> {
  void _prevState;
  void _formData;

  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;

  try {
    const result = await archiveQuoteVersionAndRevise({
      businessId: businessContext.business.id,
      quoteId,
      actorUserId: user.id,
    });

    if (!result) {
      return {
        error: "That quote could not be found.",
      };
    }

    if (result.locked) {
      return {
        error: "This quote cannot be revised in its current state.",
      };
    }

    updateCacheTags(
      getQuoteMutationCacheTags(
        businessContext.business.id,
        quoteId,
        result.inquiryId,
      ),
    );

    return {
      success: `Quote moved to v${result.newVersion}. Edit and re-send when ready.`,
    };
  } catch (error) {
    console.error("Failed to revise quote.", error);

    return {
      error: "We couldn't create the new revision right now.",
    };
  }
}

// ---------------------------------------------------------------------------
// Bulk Action Server Actions
// ---------------------------------------------------------------------------

const quoteBulkActionSchema = z.object({
  quoteIds: z
    .array(z.string().min(1))
    .min(1, "Select at least one quote.")
    .max(50, "Cannot bulk-update more than 50 quotes at once."),
});

export async function bulkArchiveQuotesAction(
  _prevState: QuoteBulkActionState,
  formData: FormData,
): Promise<QuoteBulkActionState> {
  const ownerAccess = await getWorkspaceBusinessActionContext();
  if (!ownerAccess.ok) return { error: ownerAccess.error };

  const { user, businessContext } = ownerAccess;
  const rawIds = formData.get("quoteIds") as string;
  const parsed = quoteBulkActionSchema.safeParse({
    quoteIds: rawIds ? rawIds.split(",").filter(Boolean) : [],
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const result = await bulkArchiveQuotesForBusiness({
      businessId: businessContext.business.id,
      quoteIds: parsed.data.quoteIds,
      actorUserId: user.id,
    });

    updateCacheTags(getBusinessQuoteListCacheTags(businessContext.business.id));

    return {
      success: `${result.affected} quote${result.affected !== 1 ? "s" : ""} archived.`,
      affected: result.affected,
      skipped: result.skipped,
    };
  } catch (error) {
    console.error("Failed to bulk archive quotes.", error);
    return { error: "We couldn't archive those quotes right now." };
  }
}

export async function bulkVoidQuotesAction(
  _prevState: QuoteBulkActionState,
  formData: FormData,
): Promise<QuoteBulkActionState> {
  const ownerAccess = await getWorkspaceBusinessActionContext();
  if (!ownerAccess.ok) return { error: ownerAccess.error };

  const { user, businessContext } = ownerAccess;
  const rawIds = formData.get("quoteIds") as string;
  const parsed = quoteBulkActionSchema.safeParse({
    quoteIds: rawIds ? rawIds.split(",").filter(Boolean) : [],
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const result = await bulkVoidQuotesForBusiness({
      businessId: businessContext.business.id,
      quoteIds: parsed.data.quoteIds,
      actorUserId: user.id,
    });

    updateCacheTags(getBusinessQuoteListCacheTags(businessContext.business.id));

    return {
      success: `${result.affected} quote${result.affected !== 1 ? "s" : ""} voided.`,
      affected: result.affected,
      skipped: result.skipped,
    };
  } catch (error) {
    console.error("Failed to bulk void quotes.", error);
    return { error: "We couldn't void those quotes right now." };
  }
}

export async function bulkDeleteQuotesAction(
  _prevState: QuoteBulkActionState,
  formData: FormData,
): Promise<QuoteBulkActionState> {
  const ownerAccess = await getWorkspaceBusinessActionContext();
  if (!ownerAccess.ok) return { error: ownerAccess.error };

  const { user, businessContext } = ownerAccess;
  const rawIds = formData.get("quoteIds") as string;
  const confirmed = formData.get("confirmed") as string;

  if (confirmed !== "true") {
    return { error: "Deletion requires confirmation." };
  }

  const parsed = quoteBulkActionSchema.safeParse({
    quoteIds: rawIds ? rawIds.split(",").filter(Boolean) : [],
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const result = await bulkDeleteDraftQuotesForBusiness({
      businessId: businessContext.business.id,
      quoteIds: parsed.data.quoteIds,
      actorUserId: user.id,
    });

    revalidateCacheTags(getBusinessQuoteListCacheTags(businessContext.business.id));

    if (result.affected === 0) {
      return {
        error:
          result.skipped > 0
            ? "Only draft, non-archived quotes can be deleted. None of the selected quotes were eligible."
            : "No quotes were deleted.",
        affected: result.affected,
        skipped: result.skipped,
      };
    }

    return {
      success:
        result.skipped > 0
          ? `${result.affected} quote${result.affected !== 1 ? "s" : ""} deleted. ${result.skipped} could not be deleted.`
          : `${result.affected} quote${result.affected !== 1 ? "s" : ""} deleted.`,
      affected: result.affected,
      skipped: result.skipped,
    };
  } catch (error) {
    console.error("Failed to bulk delete quotes.", error);
    return { error: "We couldn't delete those quotes right now." };
  }
}
