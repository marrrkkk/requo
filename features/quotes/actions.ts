"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOwnerWorkspaceContext, getWorkspaceOwnerEmails } from "@/lib/db/workspace-access";
import { sendQuoteEmail } from "@/lib/resend/client";
import {
  changeQuoteStatusForWorkspace,
  createQuoteForWorkspace,
  markQuoteSentForWorkspace,
  updateQuoteForWorkspace,
} from "@/features/quotes/mutations";
import { getQuoteDetailForWorkspace } from "@/features/quotes/queries";
import {
  quoteEditorSchema,
  quoteStatusChangeSchema,
} from "@/features/quotes/schemas";
import type {
  QuoteEditorActionState,
  QuoteSendActionState,
  QuoteStatusActionState,
} from "@/features/quotes/types";
import { getQuoteStatusLabel } from "@/features/quotes/utils";

const initialEditorState: QuoteEditorActionState = {};
const initialStatusState: QuoteStatusActionState = {};
const initialSendState: QuoteSendActionState = {};

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

function revalidateQuotePaths(quoteId: string, inquiryId?: string | null) {
  revalidatePath("/dashboard/quotes");
  revalidatePath(`/dashboard/quotes/${quoteId}`);

  if (inquiryId) {
    revalidatePath("/dashboard/inquiries");
    revalidatePath(`/dashboard/inquiries/${inquiryId}`);
  }
}

export async function createQuoteAction(
  inquiryId: string | null,
  prevState: QuoteEditorActionState = initialEditorState,
  formData: FormData,
): Promise<QuoteEditorActionState> {
  void prevState;

  const { user, workspaceContext } = await requireOwnerWorkspaceContext();
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
    return {
      error: "Check the highlighted fields and try again.",
      fieldErrors: mapQuoteEditorFieldErrors(
        validationResult.error.flatten().fieldErrors,
      ),
    };
  }

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

    revalidateQuotePaths(createdQuote.id, inquiryId);

    redirect(`/dashboard/quotes/${createdQuote.id}`);
  } catch (error) {
    console.error("Failed to create quote.", error);

    return {
      error: "We couldn't create that quote right now.",
    };
  }
}

export async function updateQuoteAction(
  quoteId: string,
  prevState: QuoteEditorActionState = initialEditorState,
  formData: FormData,
): Promise<QuoteEditorActionState> {
  void prevState;

  const { user, workspaceContext } = await requireOwnerWorkspaceContext();
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
    return {
      error: "Check the highlighted fields and try again.",
      fieldErrors: mapQuoteEditorFieldErrors(
        validationResult.error.flatten().fieldErrors,
      ),
    };
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

    revalidateQuotePaths(quoteId);

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

  const { user, workspaceContext } = await requireOwnerWorkspaceContext();
  const validationResult = quoteStatusChangeSchema.safeParse({
    status: formData.get("status"),
  });

  if (!validationResult.success) {
    return {
      error: "Choose a valid status.",
      fieldErrors: validationResult.error.flatten().fieldErrors,
    };
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

    revalidateQuotePaths(quoteId, result.inquiryId);

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

  const { user, workspaceContext } = await requireOwnerWorkspaceContext();

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

    const ownerEmails = await getWorkspaceOwnerEmails(workspaceContext.workspace.id);

    await sendQuoteEmail({
      quoteId: quote.id,
      updatedAt: quote.updatedAt,
      workspaceName: workspaceContext.workspace.name,
      customerName: quote.customerName,
      customerEmail: quote.customerEmail,
      quoteNumber: quote.quoteNumber,
      title: quote.title,
      currency: quote.currency,
      validUntil: quote.validUntil,
      subtotalInCents: quote.subtotalInCents,
      discountInCents: quote.discountInCents,
      totalInCents: quote.totalInCents,
      notes: quote.notes,
      items: quote.items,
      replyToEmail: ownerEmails[0],
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

    revalidateQuotePaths(quoteId, result.inquiryId);

    if (!result.changed) {
      return {
        error: "This quote is no longer in draft status.",
      };
    }

    return {
      success: `Quote ${result.quoteNumber} sent to ${quote.customerEmail}.`,
    };
  } catch (error) {
    console.error("Failed to send quote email.", error);

    return {
      error:
        error instanceof Error
          ? error.message
          : "We couldn't send that quote right now.",
    };
  }
}
