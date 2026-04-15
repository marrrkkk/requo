"use server";

import { revalidateTag, updateTag } from "next/cache";
import { after } from "next/server";

import { getValidationActionState } from "@/lib/action-state";
import {
  getBusinessInquiryDetailCacheTags,
  getBusinessInquiryFormsCacheTags,
  getBusinessInquiryListCacheTags,
  uniqueCacheTags,
} from "@/lib/cache/business-tags";
import {
  getBusinessMessagingSettings,
  getWorkspaceBusinessActionContext,
} from "@/lib/db/business-access";
import { env } from "@/lib/env";
import { getWorkspacePlanByBusinessId } from "@/lib/plans/queries";
import { checkUsageAllowance } from "@/lib/plans/usage";
import { assertPublicActionRateLimit } from "@/lib/public-action-rate-limit";
import { sendPublicInquiryNotificationEmail } from "@/lib/resend/client";
import { getAdditionalInquirySubmittedFields } from "@/features/inquiries/form-config";
import {
  addInquiryNoteForBusiness,
  changeInquiryStatusForBusiness,
  createPublicInquirySubmission,
} from "@/features/inquiries/mutations";
import {
  getPublicInquiryBusinessByFormSlug,
  getPublicInquiryBusinessBySlug,
  getBusinessOwnerNotificationEmails,
} from "@/features/inquiries/queries";
import {
  inquiryNoteSchema,
  inquiryStatusChangeSchema,
  validatePublicInquirySubmission,
} from "@/features/inquiries/schemas";
import { getBusinessInquiryPath } from "@/features/businesses/routes";
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

export async function submitPublicInquiryAction(
  slug: string,
  formSlug: string | null,
  _prevState: PublicInquiryFormState,
  formData: FormData,
): Promise<PublicInquiryFormState> {
  const honeypotValue = getTextValue(formData, "website")?.trim();

  if (honeypotValue) {
    return {
      success: "Thanks. Your inquiry has been sent.",
    };
  }

  const business = formSlug
    ? await getPublicInquiryBusinessByFormSlug({
        businessSlug: slug,
        formSlug,
      })
    : await getPublicInquiryBusinessBySlug(slug);

  if (!business) {
    return {
      error: "This inquiry page is unavailable right now.",
    };
  }

  const { plan: workspacePlan, workspaceId } = await getWorkspacePlanByBusinessId(business.id);
  const inquiryAllowance = await checkUsageAllowance(
    workspaceId,
    workspacePlan,
    "inquiriesPerMonth",
  );

  if (!inquiryAllowance.allowed) {
    return {
      error: "This business has reached its monthly inquiry limit. The owner has been notified.",
    };
  }

  const validationResult = validatePublicInquirySubmission(
    business.inquiryFormConfig,
    formData,
  );

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Check the highlighted fields and try again.");
  }

  const allowed = await assertPublicActionRateLimit({
    action: "public-inquiry-submit",
    scope: business.id,
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
      business,
      submission: validationResult.data,
    });

    revalidateCacheTags([
      ...getBusinessInquiryListCacheTags(business.id),
      ...getBusinessInquiryFormsCacheTags(business.id),
    ]);

    after(async () => {
      const [recipients, businessSettings] = await Promise.all([
        getBusinessOwnerNotificationEmails(business.id),
        getBusinessMessagingSettings(business.id),
      ]);

      if (!businessSettings?.notifyOnNewInquiry || !recipients.length) {
        return;
      }

      try {
        await sendPublicInquiryNotificationEmail({
          inquiryId: createdInquiry.inquiryId,
          recipients,
          businessName: businessSettings.name,
          dashboardUrl: new URL(
            getBusinessInquiryPath(slug, createdInquiry.inquiryId),
            env.BETTER_AUTH_URL,
          ).toString(),
          customerName: validationResult.data.customerName,
          customerEmail: validationResult.data.customerEmail,
          customerPhone: validationResult.data.customerPhone,
          companyName: validationResult.data.companyName,
          inquiryFormName: business.form.name,
          serviceCategory: validationResult.data.serviceCategory,
          deadline: validationResult.data.requestedDeadline,
          budget: validationResult.data.budgetText,
          details: validationResult.data.details,
          attachmentName: createdInquiry.attachmentName,
          additionalFields: getAdditionalInquirySubmittedFields(
            validationResult.data.submittedFieldSnapshot,
          ).map((field) => ({
            label: field.label,
            value: field.displayValue,
          })),
        });
      } catch (error) {
        console.error(
          "The public inquiry was saved but the owner notification email failed to send.",
          error,
        );
      }
    });

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
  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;

  const validationResult = inquiryNoteSchema.safeParse({
    body: formData.get("body"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Check the note and try again.");
  }

  try {
    const result = await addInquiryNoteForBusiness({
      businessId: businessContext.business.id,
      inquiryId,
      authorUserId: user.id,
      body: validationResult.data.body,
    });

    if (!result) {
      return {
        error: "That inquiry could not be found.",
      };
    }

    updateCacheTags(
      getBusinessInquiryDetailCacheTags(businessContext.business.id, inquiryId),
    );
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
  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;

  const validationResult = inquiryStatusChangeSchema.safeParse({
    status: formData.get("status"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Choose a valid status.");
  }

  try {
    const result = await changeInquiryStatusForBusiness({
      businessId: businessContext.business.id,
      inquiryId,
      actorUserId: user.id,
      nextStatus: validationResult.data.status,
    });

    if (!result) {
      return {
        error: "That inquiry could not be found.",
      };
    }

    updateCacheTags(
      getBusinessInquiryDetailCacheTags(businessContext.business.id, inquiryId),
    );
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
