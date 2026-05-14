"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
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
import { hasFeatureAccess } from "@/lib/plans";
import { getplanByBusinessId } from "@/lib/plans/queries";
import { checkUsageAllowance } from "@/lib/plans/usage";
import { assertPublicActionRateLimit } from "@/lib/public-action-rate-limit";
import {
  addInquiryNoteForBusiness,
  archiveInquiryForBusiness,
  changeInquiryStatusForBusiness,
  createManualInquirySubmission,
  createPublicInquirySubmission,
  restoreInquiryFromTrashForBusiness,
  trashInquiryForBusiness,
  unarchiveInquiryForBusiness,
} from "@/features/inquiries/mutations";
import {
  getInquiryEditorFormForBusiness,
  getPublicInquiryBusinessByFormSlug,
  getPublicInquiryBusinessBySlug,
} from "@/features/inquiries/queries";
import {
  inquiryFormSelectionSchema,
  inquiryNoteSchema,
  inquiryStatusChangeSchema,
  validateManualQuickInquirySubmission,
  validatePublicInquirySubmission,
} from "@/features/inquiries/schemas";
import { getBusinessInquiryPath } from "@/features/businesses/routes";
import type {
  InquiryRecordActionState,
  InquiryNoteActionState,
  InquiryStatusActionState,
  ManualInquiryActionState,
  PublicInquiryFormState,
} from "@/features/inquiries/types";
import { getInquiryStatusLabel } from "@/features/inquiries/utils";
import {
  getPublicInquiryAttachmentMaxBytes,
  resolveInquiryFormConfigForPlan,
} from "@/features/inquiries/plan-rules";
import { getBusinessPublicInquiryUrl } from "@/features/settings/utils";

function getTextValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : null;
}

function updateCacheTags(tags: string[]) {
  for (const tag of uniqueCacheTags(tags)) {
    updateTag(tag);
  }
}

function getInquiryMutationCacheTags(businessId: string, inquiryId: string) {
  return uniqueCacheTags([
    ...getBusinessInquiryListCacheTags(businessId),
    ...getBusinessInquiryDetailCacheTags(businessId, inquiryId),
  ]);
}

const publicInquirySubmitRateLimit = {
  limit: 4,
  windowMs: 10 * 60 * 1000,
} as const;

function getSubmittedPublicInquiryUrl(business: {
  slug: string;
  form: { isDefault: boolean; slug: string };
}) {
  const pagePath = getBusinessPublicInquiryUrl(
    business.slug,
    business.form.isDefault ? undefined : business.form.slug,
  );

  return `${pagePath}?submitted=1`;
}

export async function submitPublicInquiryAction(
  slug: string,
  formSlug: string | null,
  _prevState: PublicInquiryFormState,
  formData: FormData,
): Promise<PublicInquiryFormState> {
  const honeypotValue = getTextValue(formData, "website")?.trim();

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

  if (honeypotValue) {
    redirect(getSubmittedPublicInquiryUrl(business));
  }

  const allowed = await assertPublicActionRateLimit({
    action: "public-inquiry-submit",
    scope: `${business.id}:${business.form.id}`,
    ...publicInquirySubmitRateLimit,
  });

  if (!allowed) {
    return {
      error: "Too many inquiry attempts. Please wait a few minutes before trying again.",
    };
  }

  const { plan: plan, businessId } = await getplanByBusinessId(business.id);
  const inquiryAllowance = await checkUsageAllowance(
    businessId,
    plan,
    "inquiriesPerMonth",
  );

  if (!inquiryAllowance.allowed) {
    return {
      error: "This business has reached its monthly inquiry limit. The owner has been notified.",
    };
  }

  const effectiveFormConfig = resolveInquiryFormConfigForPlan(
    business.inquiryFormConfig,
    plan,
  );
  const validationResult = validatePublicInquirySubmission(
    effectiveFormConfig,
    formData,
    {
      maxAttachmentSizeBytes:
        getPublicInquiryAttachmentMaxBytes(plan),
    },
  );

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Check the highlighted fields and try again.");
  }

  try {
    const createdInquiry = await createPublicInquirySubmission({
      business,
      submission: validationResult.data,
    });

    updateCacheTags([
      ...getInquiryMutationCacheTags(business.id, createdInquiry.inquiryId),
      ...getBusinessInquiryFormsCacheTags(business.id),
    ]);

    after(async () => {
      const businessSettings = await getBusinessMessagingSettings(business.id);

      // Push notification
      if (
        businessSettings?.notifyPushOnNewInquiry &&
        hasFeatureAccess(plan, "pushNotifications")
      ) {
        try {
          const { sendPushToBusinessSubscribers } = await import("@/lib/push/send");
          await sendPushToBusinessSubscribers(business.id, {
            title: "New inquiry received",
            body: `${validationResult.data.customerName} submitted an inquiry.`,
            url: getBusinessInquiryPath(slug, createdInquiry.inquiryId),
          });
        } catch (error) {
          console.error("Push notification failed for new inquiry.", error);
        }
      }
    });

  } catch (error) {
    console.error("Failed to submit public inquiry.", error);

    return {
      error: "We couldn't submit your inquiry right now. Please try again.",
    };
  }

  redirect(getSubmittedPublicInquiryUrl(business));
}

export async function createManualInquiryAction(
  _prevState: ManualInquiryActionState,
  formData: FormData,
): Promise<ManualInquiryActionState> {
  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;
  const formSelectionResult = inquiryFormSelectionSchema.safeParse({
    formSlug: formData.get("formSlug"),
  });

  if (!formSelectionResult.success) {
    return getValidationActionState(
      formSelectionResult.error,
      "Choose an inquiry form.",
    );
  }

  const selectedForm = await getInquiryEditorFormForBusiness({
    businessId: businessContext.business.id,
    formSlug: formSelectionResult.data.formSlug,
  });

  if (!selectedForm) {
    return {
      error: "That inquiry form is unavailable.",
      fieldErrors: {
        formSlug: ["Choose an active inquiry form."],
      },
    };
  }

  const inquiryAllowance = await checkUsageAllowance(
    businessContext.business.id,
    businessContext.business.plan,
    "inquiriesPerMonth",
  );

  if (!inquiryAllowance.allowed) {
    return {
      error: `You've reached your plan's limit of ${inquiryAllowance.limit} inquiries this month. Upgrade your plan for unlimited usage.`,
    };
  }

  const effectiveFormConfig = resolveInquiryFormConfigForPlan(
    selectedForm.inquiryFormConfig,
    businessContext.business.plan,
  );
  const validationResult = validateManualQuickInquirySubmission(
    effectiveFormConfig,
    formData,
    {
      maxAttachmentSizeBytes: getPublicInquiryAttachmentMaxBytes(
        businessContext.business.plan,
      ),
    },
  );

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the highlighted fields and try again.",
    );
  }

  let inquiryPath: string | null = null;

  try {
    const createdInquiry = await createManualInquirySubmission({
      business: {
        id: businessContext.business.id,
        name: businessContext.business.name,
        slug: businessContext.business.slug,
        form: {
          id: selectedForm.id,
          name: selectedForm.name,
          slug: selectedForm.slug,
          businessType: selectedForm.businessType,
          isDefault: selectedForm.isDefault,
          publicInquiryEnabled: selectedForm.publicInquiryEnabled,
        },
      },
      submission: validationResult.data,
      actorUserId: user.id,
    });

    updateCacheTags(
      getInquiryMutationCacheTags(
        businessContext.business.id,
        createdInquiry.inquiryId,
      ),
    );

    inquiryPath = getBusinessInquiryPath(
      businessContext.business.slug,
      createdInquiry.inquiryId,
    );
  } catch (error) {
    console.error("Failed to create manual inquiry.", error);

    return {
      error: "We couldn't create that inquiry right now.",
    };
  }

  if (inquiryPath) {
    redirect(inquiryPath);
  }

  return {
    error: "We couldn't create that inquiry right now.",
  };
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

    updateCacheTags(getInquiryMutationCacheTags(businessContext.business.id, inquiryId));
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

    updateCacheTags(getInquiryMutationCacheTags(businessContext.business.id, inquiryId));
    if (result.locked) {
      return {
        error:
          result.lockedReason === "trash"
            ? "Restore this inquiry from trash before updating its workflow status."
            : "Unarchive this inquiry before updating its workflow status.",
      };
    }

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

async function runInquiryRecordAction(
  inquiryId: string,
  mutation: (input: {
    businessId: string;
    inquiryId: string;
    actorUserId: string;
  }) => Promise<
    | {
        changed: boolean;
        locked?: boolean;
        lockedReason?: "archived" | "trash";
      }
    | null
  >,
  messages: {
    success: string;
    unchanged: string;
    missing?: string;
    archivedLocked?: string;
    trashLocked?: string;
    fallbackError: string;
  },
): Promise<InquiryRecordActionState> {
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
      inquiryId,
      actorUserId: user.id,
    });

    if (!result) {
      return {
        error: messages.missing ?? "That inquiry could not be found.",
      };
    }

    updateCacheTags(getInquiryMutationCacheTags(businessContext.business.id, inquiryId));

    if (result.locked) {
      return {
        error:
          result.lockedReason === "trash"
            ? messages.trashLocked ?? "Restore this inquiry from trash first."
            : messages.archivedLocked ?? "Unarchive this inquiry first.",
      };
    }

    return {
      success: result.changed ? messages.success : messages.unchanged,
    };
  } catch (error) {
    console.error(messages.fallbackError, error);

    return {
      error: "We couldn't update that inquiry right now.",
    };
  }
}

export async function archiveInquiryAction(
  inquiryId: string,
  _prevState: InquiryRecordActionState,
  _formData: FormData,
): Promise<InquiryRecordActionState> {
  void _prevState;
  void _formData;

  return runInquiryRecordAction(inquiryId, archiveInquiryForBusiness, {
    success: "Inquiry archived.",
    unchanged: "Inquiry is already archived.",
    trashLocked: "Restore this inquiry from trash before archiving it.",
    fallbackError: "Failed to archive inquiry.",
  });
}

export async function unarchiveInquiryAction(
  inquiryId: string,
  _prevState: InquiryRecordActionState,
  _formData: FormData,
): Promise<InquiryRecordActionState> {
  void _prevState;
  void _formData;

  return runInquiryRecordAction(inquiryId, unarchiveInquiryForBusiness, {
    success: "Inquiry restored to active.",
    unchanged: "Inquiry is already active.",
    trashLocked: "Restore this inquiry from trash instead.",
    fallbackError: "Failed to unarchive inquiry.",
  });
}

export async function trashInquiryAction(
  inquiryId: string,
  _prevState: InquiryRecordActionState,
  _formData: FormData,
): Promise<InquiryRecordActionState> {
  void _prevState;
  void _formData;

  return runInquiryRecordAction(inquiryId, trashInquiryForBusiness, {
    success: "Inquiry moved to trash.",
    unchanged: "Inquiry is already in trash.",
    fallbackError: "Failed to move inquiry to trash.",
  });
}

export async function restoreInquiryFromTrashAction(
  inquiryId: string,
  _prevState: InquiryRecordActionState,
  _formData: FormData,
): Promise<InquiryRecordActionState> {
  void _prevState;
  void _formData;

  return runInquiryRecordAction(inquiryId, restoreInquiryFromTrashForBusiness, {
    success: "Inquiry restored from trash.",
    unchanged: "Inquiry is already active.",
    fallbackError: "Failed to restore inquiry from trash.",
  });
}
