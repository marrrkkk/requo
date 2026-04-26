"use server";

import { updateTag } from "next/cache";

import { getValidationActionState } from "@/lib/action-state";
import {
  getBusinessFollowUpListCacheTags,
  getBusinessInquiryDetailCacheTags,
  getBusinessInquiryListCacheTags,
  getBusinessQuoteDetailCacheTags,
  getBusinessQuoteListCacheTags,
  uniqueCacheTags,
} from "@/lib/cache/business-tags";
import { getWorkspaceBusinessActionContext } from "@/lib/db/business-access";
import {
  completeFollowUpForBusiness,
  createFollowUpForBusiness,
  rescheduleFollowUpForBusiness,
  skipFollowUpForBusiness,
} from "@/features/follow-ups/mutations";
import {
  followUpCreateSchema,
  followUpRescheduleSchema,
} from "@/features/follow-ups/schemas";
import type {
  FollowUpCreateActionState,
  FollowUpCreateFieldErrors,
  FollowUpRecordActionState,
  FollowUpRescheduleActionState,
  FollowUpRescheduleFieldErrors,
} from "@/features/follow-ups/types";

function updateCacheTags(tags: string[]) {
  for (const tag of uniqueCacheTags(tags)) {
    updateTag(tag);
  }
}

function getFollowUpMutationCacheTags({
  businessId,
  inquiryId,
  quoteId,
}: {
  businessId: string;
  inquiryId?: string | null;
  quoteId?: string | null;
}) {
  return uniqueCacheTags([
    ...getBusinessFollowUpListCacheTags(businessId),
    ...getBusinessInquiryListCacheTags(businessId),
    ...getBusinessQuoteListCacheTags(businessId),
    ...(inquiryId ? getBusinessInquiryDetailCacheTags(businessId, inquiryId) : []),
    ...(quoteId ? getBusinessQuoteDetailCacheTags(businessId, quoteId) : []),
  ]);
}

function getCreateFieldErrors(
  fieldErrors: Record<string, string[] | undefined>,
): FollowUpCreateFieldErrors {
  return {
    title: fieldErrors.title,
    reason: fieldErrors.reason,
    channel: fieldErrors.channel,
    dueDate: fieldErrors.dueDate,
  };
}

function getRescheduleFieldErrors(
  fieldErrors: Record<string, string[] | undefined>,
): FollowUpRescheduleFieldErrors {
  return {
    dueDate: fieldErrors.dueDate,
  };
}

async function createFollowUpActionForRecord({
  inquiryId,
  quoteId,
  formData,
}: {
  inquiryId?: string | null;
  quoteId?: string | null;
  formData: FormData;
}): Promise<FollowUpCreateActionState> {
  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;
  const validationResult = followUpCreateSchema.safeParse({
    title: formData.get("title"),
    reason: formData.get("reason"),
    channel: formData.get("channel"),
    dueDate: formData.get("dueDate"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the follow-up details and try again.",
      getCreateFieldErrors,
    );
  }

  try {
    const result = await createFollowUpForBusiness({
      workspaceId: businessContext.business.workspaceId,
      businessId: businessContext.business.id,
      inquiryId,
      quoteId,
      actorUserId: user.id,
      assignedToUserId: user.id,
      followUp: validationResult.data,
    });

    if (!result) {
      return {
        error: "That inquiry or quote could not be found.",
      };
    }

    updateCacheTags(
      getFollowUpMutationCacheTags({
        businessId: businessContext.business.id,
        inquiryId: result.inquiryId,
        quoteId: result.quoteId,
      }),
    );

    return {
      success: "Follow-up created.",
      followUpId: result.followUpId,
    };
  } catch (error) {
    console.error("Failed to create follow-up.", error);

    return {
      error: "We couldn't create that follow-up right now.",
    };
  }
}

export async function createInquiryFollowUpAction(
  inquiryId: string,
  _prevState: FollowUpCreateActionState,
  formData: FormData,
): Promise<FollowUpCreateActionState> {
  return createFollowUpActionForRecord({
    inquiryId,
    formData,
  });
}

export async function createQuoteFollowUpAction(
  quoteId: string,
  _prevState: FollowUpCreateActionState,
  formData: FormData,
): Promise<FollowUpCreateActionState> {
  return createFollowUpActionForRecord({
    quoteId,
    formData,
  });
}

async function runFollowUpRecordAction(
  followUpId: string,
  mutation: (input: {
    businessId: string;
    followUpId: string;
    actorUserId: string;
  }) => Promise<
    | {
        changed: boolean;
        locked: boolean;
        inquiryId: string | null;
        quoteId: string | null;
        status: string;
      }
    | null
  >,
  messages: {
    success: string;
    unchanged: string;
    locked: string;
    fallbackError: string;
  },
): Promise<FollowUpRecordActionState> {
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
      followUpId,
      actorUserId: user.id,
    });

    if (!result) {
      return {
        error: "That follow-up could not be found.",
      };
    }

    updateCacheTags(
      getFollowUpMutationCacheTags({
        businessId: businessContext.business.id,
        inquiryId: result.inquiryId,
        quoteId: result.quoteId,
      }),
    );

    if (result.locked) {
      return {
        error: messages.locked,
      };
    }

    return {
      success: result.changed ? messages.success : messages.unchanged,
    };
  } catch (error) {
    console.error(messages.fallbackError, error);

    return {
      error: "We couldn't update that follow-up right now.",
    };
  }
}

export async function completeFollowUpAction(
  followUpId: string,
  _prevState: FollowUpRecordActionState,
  _formData: FormData,
): Promise<FollowUpRecordActionState> {
  void _prevState;
  void _formData;

  return runFollowUpRecordAction(followUpId, completeFollowUpForBusiness, {
    success: "Follow-up marked done.",
    unchanged: "Follow-up is already completed.",
    locked: "Only pending follow-ups can be completed.",
    fallbackError: "Failed to complete follow-up.",
  });
}

export async function skipFollowUpAction(
  followUpId: string,
  _prevState: FollowUpRecordActionState,
  _formData: FormData,
): Promise<FollowUpRecordActionState> {
  void _prevState;
  void _formData;

  return runFollowUpRecordAction(followUpId, skipFollowUpForBusiness, {
    success: "Follow-up skipped.",
    unchanged: "Follow-up is already skipped.",
    locked: "Only pending follow-ups can be skipped.",
    fallbackError: "Failed to skip follow-up.",
  });
}

export async function rescheduleFollowUpAction(
  followUpId: string,
  _prevState: FollowUpRescheduleActionState,
  formData: FormData,
): Promise<FollowUpRescheduleActionState> {
  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;
  const validationResult = followUpRescheduleSchema.safeParse({
    dueDate: formData.get("dueDate"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Choose a valid follow-up date.",
      getRescheduleFieldErrors,
    );
  }

  try {
    const result = await rescheduleFollowUpForBusiness({
      businessId: businessContext.business.id,
      followUpId,
      actorUserId: user.id,
      followUp: validationResult.data,
    });

    if (!result) {
      return {
        error: "That follow-up could not be found.",
      };
    }

    updateCacheTags(
      getFollowUpMutationCacheTags({
        businessId: businessContext.business.id,
        inquiryId: result.inquiryId,
        quoteId: result.quoteId,
      }),
    );

    if (result.locked) {
      return {
        error: "Only pending follow-ups can be rescheduled.",
      };
    }

    return {
      success: "Follow-up rescheduled.",
    };
  } catch (error) {
    console.error("Failed to reschedule follow-up.", error);

    return {
      error: "We couldn't reschedule that follow-up right now.",
    };
  }
}
