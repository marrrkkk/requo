"use server";

import { revalidateTag, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import {
  getValidationActionState,
} from "@/lib/action-state";
import {
  getWorkspaceInquiryDetailCacheTags,
  getWorkspaceQuoteDetailCacheTags,
  getWorkspaceQuoteListCacheTags,
  uniqueCacheTags,
} from "@/lib/cache/workspace-tags";
import {
  getWorkspaceMessagingSettings,
  getWorkspaceOwnerEmails,
  getOwnerWorkspaceActionContext,
} from "@/lib/db/workspace-access";
import { env, isResendConfigured } from "@/lib/env";
import { assertPublicActionRateLimit } from "@/lib/public-action-rate-limit";
import {
  getResendFromEmailConfigurationError,
  getResendSendFailureMessage,
  sendQuoteEmail,
  sendQuoteSentOwnerNotificationEmail,
} from "@/lib/resend/client";
import {
  changeQuoteStatusForWorkspace,
  createQuoteForWorkspace,
  markQuoteSentForWorkspace,
  respondToPublicQuoteByToken,
  updateQuotePostAcceptanceStatusForWorkspace,
  updateQuoteForWorkspace,
} from "@/features/quotes/mutations";
import { getQuoteDetailForWorkspace } from "@/features/quotes/queries";
import {
  publicQuoteResponseSchema,
  quoteEditorSchema,
  quotePostAcceptanceStatusChangeSchema,
  quoteStatusChangeSchema,
} from "@/features/quotes/schemas";
import {
  getWorkspaceQuotePath,
} from "@/features/workspaces/routes";
import type {
  PublicQuoteResponseActionState,
  QuoteEditorActionState,
  QuotePostAcceptanceActionState,
  QuoteSendActionState,
  QuoteStatusActionState,
} from "@/features/quotes/types";
import {
  getPublicQuoteUrl,
  getQuotePostAcceptanceStatusLabel,
  getQuoteStatusLabel,
} from "@/features/quotes/utils";

const initialEditorState: QuoteEditorActionState = {};
const initialStatusState: QuoteStatusActionState = {};
const initialPostAcceptanceState: QuotePostAcceptanceActionState = {};
const initialSendState: QuoteSendActionState = {};
const initialPublicQuoteResponseState: PublicQuoteResponseActionState = {};

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
  workspaceId: string,
  quoteId?: string | null,
  inquiryId?: string | null,
) {
  return uniqueCacheTags([
    ...getWorkspaceQuoteListCacheTags(workspaceId),
    ...(quoteId ? getWorkspaceQuoteDetailCacheTags(workspaceId, quoteId) : []),
    ...(inquiryId
      ? getWorkspaceInquiryDetailCacheTags(workspaceId, inquiryId)
      : []),
  ]);
}

function mapQuoteEditorFieldErrors(fieldErrors: Record<string, string[] | undefined>) {
  return {
    title: fieldErrors.title,
    customerName: fieldErrors.customerName,
    customerEmail: fieldErrors.customerEmail,
    notes: fieldErrors.notes,
    validUntil: fieldErrors.validUntil,
    discount: fieldErrors.discountInCents,
    items: fieldErrors.items,
  };
}

export async function createQuoteAction(
  inquiryId: string | null,
  prevState: QuoteEditorActionState = initialEditorState,
  formData: FormData,
): Promise<QuoteEditorActionState> {
  void prevState;

  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, workspaceContext } = ownerAccess;
  const validationResult = quoteEditorSchema.safeParse({
    title: formData.get("title"),
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    notes: formData.get("notes"),
    validUntil: formData.get("validUntil"),
    discountInCents: formData.get("discount"),
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
    const createdQuote = await createQuoteForWorkspace({
      workspaceId: workspaceContext.workspace.id,
      actorUserId: user.id,
      currency: workspaceContext.workspace.defaultCurrency,
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
        workspaceContext.workspace.id,
        createdQuote.id,
        inquiryId,
      ),
    );

    quotePath = getWorkspaceQuotePath(
      workspaceContext.workspace.slug,
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

  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, workspaceContext } = ownerAccess;
  const validationResult = quoteEditorSchema.safeParse({
    title: formData.get("title"),
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    notes: formData.get("notes"),
    validUntil: formData.get("validUntil"),
    discountInCents: formData.get("discount"),
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
    const result = await updateQuoteForWorkspace({
      workspaceId: workspaceContext.workspace.id,
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
      getQuoteMutationCacheTags(workspaceContext.workspace.id, quoteId),
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

export async function changeQuoteStatusAction(
  quoteId: string,
  prevState: QuoteStatusActionState = initialStatusState,
  formData: FormData,
): Promise<QuoteStatusActionState> {
  void prevState;

  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, workspaceContext } = ownerAccess;
  const validationResult = quoteStatusChangeSchema.safeParse({
    status: formData.get("status"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Choose a valid status.");
  }

  try {
    const result = await changeQuoteStatusForWorkspace({
      workspaceId: workspaceContext.workspace.id,
      quoteId,
      actorUserId: user.id,
      nextStatus: validationResult.data.status,
    });

    if (!result) {
      return {
        error: "That quote could not be found.",
      };
    }

    updateCacheTags(
      getQuoteMutationCacheTags(
        workspaceContext.workspace.id,
        quoteId,
        result.inquiryId,
      ),
    );

    if (!result.changed) {
      return {
        success: `Quote is already ${getQuoteStatusLabel(result.nextStatus)}.`,
      };
    }

    return {
      success: `Quote moved to ${getQuoteStatusLabel(result.nextStatus)}.`,
    };
  } catch (error) {
    console.error("Failed to change quote status.", error);

    return {
      error: "We couldn't update the quote status right now.",
    };
  }
}

export async function sendQuoteAction(
  quoteId: string,
  prevState: QuoteSendActionState = initialSendState,
  formData: FormData,
): Promise<QuoteSendActionState> {
  void prevState;
  void formData;

  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, workspaceContext } = ownerAccess;

  try {
    const quote = await getQuoteDetailForWorkspace({
      workspaceId: workspaceContext.workspace.id,
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

    const workspaceSettings = await getWorkspaceMessagingSettings(
      workspaceContext.workspace.id,
    );

    if (!workspaceSettings) {
      return {
        error: "This workspace could not be loaded.",
      };
    }

    const ownerEmails = await getWorkspaceOwnerEmails(workspaceContext.workspace.id);
    const publicQuoteUrl = new URL(
      getPublicQuoteUrl(quote.publicToken),
      env.BETTER_AUTH_URL,
    ).toString();

    if (!isResendConfigured) {
      return {
        error: "Quote email delivery is unavailable right now. Configure email and try again.",
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
      workspaceName: workspaceContext.workspace.name,
      customerName: quote.customerName,
      customerEmail: quote.customerEmail,
      quoteNumber: quote.quoteNumber,
      title: quote.title,
      publicQuoteUrl,
      currency: quote.currency,
      validUntil: quote.validUntil,
      subtotalInCents: quote.subtotalInCents,
      discountInCents: quote.discountInCents,
      totalInCents: quote.totalInCents,
      notes: quote.notes,
      emailSignature: workspaceSettings.defaultEmailSignature,
      items: quote.items,
      replyToEmail: workspaceSettings.contactEmail ?? ownerEmails[0],
    });

    const result = await markQuoteSentForWorkspace({
      workspaceId: workspaceContext.workspace.id,
      quoteId,
      actorUserId: user.id,
    });

    if (!result) {
      return {
        error: "That quote could not be found.",
      };
    }

    if (!result.changed) {
      return {
        error: "This quote is no longer in draft status.",
      };
    }

    if (workspaceSettings.notifyOnQuoteSent && ownerEmails.length) {
      try {
        await sendQuoteSentOwnerNotificationEmail({
          quoteId: quote.id,
          updatedAt: quote.updatedAt,
          recipients: ownerEmails,
          workspaceName: workspaceContext.workspace.name,
          customerName: quote.customerName,
          customerEmail: quote.customerEmail,
          quoteNumber: quote.quoteNumber,
          title: quote.title,
          dashboardUrl: new URL(
            getWorkspaceQuotePath(workspaceContext.workspace.slug, quote.id),
            env.BETTER_AUTH_URL,
          ).toString(),
          publicQuoteUrl,
        });
      } catch (error) {
        console.error(
          "The quote was sent but the owner notification email failed to send.",
          error,
        );
      }
    }

    updateCacheTags(
      getQuoteMutationCacheTags(
        workspaceContext.workspace.id,
        quoteId,
        result.inquiryId,
      ),
    );

    return {
      success: `Quote ${result.quoteNumber} sent to ${quote.customerEmail}.`,
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

export async function updateQuotePostAcceptanceStatusAction(
  quoteId: string,
  prevState: QuotePostAcceptanceActionState = initialPostAcceptanceState,
  formData: FormData,
): Promise<QuotePostAcceptanceActionState> {
  void prevState;

  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, workspaceContext } = ownerAccess;
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
    const result = await updateQuotePostAcceptanceStatusForWorkspace({
      workspaceId: workspaceContext.workspace.id,
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
        workspaceContext.workspace.id,
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
        result.workspaceId,
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

      return {
        error: "This quote is not accepting responses right now.",
      };
    }

    return {
      success:
        result.status === "accepted"
          ? `Quote ${result.quoteNumber} accepted. Your response has been recorded.`
          : `Quote ${result.quoteNumber} declined. Your response has been recorded.`,
    };
  } catch (error) {
    console.error("Failed to record public quote response.", error);

    return {
      error: "We couldn't save that response right now. Please try again.",
    };
  }
}
