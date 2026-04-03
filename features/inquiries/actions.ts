"use server";

import { revalidatePath } from "next/cache";

import { getValidationActionState } from "@/lib/action-state";
import {
  getWorkspaceMessagingSettings,
  getOwnerWorkspaceActionContext,
} from "@/lib/db/workspace-access";
import { env } from "@/lib/env";
import { assertPublicActionRateLimit } from "@/lib/public-action-rate-limit";
import { sendPublicInquiryNotificationEmail } from "@/lib/resend/client";
import {
  addInquiryNoteForWorkspace,
  changeInquiryStatusForWorkspace,
  createPublicInquirySubmission,
} from "@/features/inquiries/mutations";
import {
  getPublicInquiryWorkspaceBySlug,
  getWorkspaceOwnerNotificationEmails,
} from "@/features/inquiries/queries";
import {
  inquiryNoteSchema,
  inquiryStatusChangeSchema,
  publicInquirySchema,
} from "@/features/inquiries/schemas";
import type {
  InquiryNoteActionState,
  InquiryStatusActionState,
  PublicInquiryFormState,
} from "@/features/inquiries/types";
import { getInquiryStatusLabel } from "@/features/inquiries/utils";

function getTextValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : null;
}

export async function submitPublicInquiryAction(
  slug: string,
  _prevState: PublicInquiryFormState,
  formData: FormData,
): Promise<PublicInquiryFormState> {
  const honeypotValue = getTextValue(formData, "website")?.trim();

  if (honeypotValue) {
    return {
      success: "Thanks. Your inquiry has been sent.",
    };
  }

  const workspace = await getPublicInquiryWorkspaceBySlug(slug);

  if (!workspace) {
    return {
      error: "This inquiry page is unavailable right now.",
    };
  }

  const validationResult = publicInquirySchema.safeParse({
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    customerPhone: formData.get("customerPhone"),
    serviceCategory: formData.get("serviceCategory"),
    deadline: formData.get("deadline"),
    budget: formData.get("budget"),
    details: formData.get("details"),
    attachment: formData.get("attachment"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Check the highlighted fields and try again.");
  }

  const allowed = await assertPublicActionRateLimit({
    action: "public-inquiry-submit",
    scope: workspace.id,
    limit: 6,
    windowMs: 15 * 60 * 1000,
  });

  if (!allowed) {
    return {
      error: "We couldn't submit your inquiry right now. Please try again.",
    };
  }

  try {
    const createdInquiry = await createPublicInquirySubmission({
      workspace,
      submission: validationResult.data,
    });

    const [recipients, workspaceSettings] = await Promise.all([
      getWorkspaceOwnerNotificationEmails(workspace.id),
      getWorkspaceMessagingSettings(workspace.id),
    ]);

    if (workspaceSettings?.notifyOnNewInquiry && recipients.length) {
      try {
        await sendPublicInquiryNotificationEmail({
          inquiryId: createdInquiry.inquiryId,
          recipients,
          workspaceName: workspaceSettings.name,
          dashboardUrl: new URL(
            `/dashboard/inquiries/${createdInquiry.inquiryId}`,
            env.BETTER_AUTH_URL,
          ).toString(),
          customerName: validationResult.data.customerName,
          customerEmail: validationResult.data.customerEmail,
          customerPhone: validationResult.data.customerPhone,
          serviceCategory: validationResult.data.serviceCategory,
          deadline: validationResult.data.deadline,
          budget: validationResult.data.budget,
          details: validationResult.data.details,
          attachmentName: createdInquiry.attachmentName,
        });
      } catch (error) {
        console.error(
          "The public inquiry was saved but the owner notification email failed to send.",
          error,
        );
      }
    }

    return {
      success: "Thanks. Your inquiry has been sent.",
      inquiryId: createdInquiry.inquiryId,
    };
  } catch (error) {
    console.error("Failed to submit public inquiry.", error);

    return {
      error: "We couldn't submit your inquiry right now. Please try again.",
    };
  }
}

export async function addInquiryNoteAction(
  inquiryId: string,
  _prevState: InquiryNoteActionState,
  formData: FormData,
): Promise<InquiryNoteActionState> {
  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, workspaceContext } = ownerAccess;

  const validationResult = inquiryNoteSchema.safeParse({
    body: formData.get("body"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Check the note and try again.");
  }

  try {
    const result = await addInquiryNoteForWorkspace({
      workspaceId: workspaceContext.workspace.id,
      inquiryId,
      authorUserId: user.id,
      body: validationResult.data.body,
    });

    if (!result) {
      return {
        error: "That inquiry could not be found.",
      };
    }

    revalidatePath("/dashboard/inquiries");
    revalidatePath(`/dashboard/inquiries/${inquiryId}`);

    return {
      success: "Internal note added.",
    };
  } catch (error) {
    console.error("Failed to add inquiry note.", error);

    return {
      error: "We couldn't save that note right now.",
    };
  }
}

export async function changeInquiryStatusAction(
  inquiryId: string,
  _prevState: InquiryStatusActionState,
  formData: FormData,
): Promise<InquiryStatusActionState> {
  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, workspaceContext } = ownerAccess;

  const validationResult = inquiryStatusChangeSchema.safeParse({
    status: formData.get("status"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Choose a valid status.");
  }

  try {
    const result = await changeInquiryStatusForWorkspace({
      workspaceId: workspaceContext.workspace.id,
      inquiryId,
      actorUserId: user.id,
      nextStatus: validationResult.data.status,
    });

    if (!result) {
      return {
        error: "That inquiry could not be found.",
      };
    }

    revalidatePath("/dashboard/inquiries");
    revalidatePath(`/dashboard/inquiries/${inquiryId}`);

    if (!result.changed) {
      return {
        success: `Inquiry is already ${getInquiryStatusLabel(result.nextStatus)}.`,
      };
    }

    return {
      success: `Inquiry moved to ${getInquiryStatusLabel(result.nextStatus)}.`,
    };
  } catch (error) {
    console.error("Failed to change inquiry status.", error);

    return {
      error: "We couldn't update the inquiry status right now.",
    };
  }
}
