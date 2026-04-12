"use server";

import { updateTag } from "next/cache";

import { getValidationActionState } from "@/lib/action-state";
import {
  getBusinessReplySnippetsCacheTags,
  uniqueCacheTags,
} from "@/lib/cache/business-tags";
import { getOperationalBusinessActionContext } from "@/lib/db/business-access";
import {
  createReplySnippetForBusiness,
  deleteReplySnippetForBusiness,
  updateReplySnippetForBusiness,
} from "@/features/inquiries/reply-snippet-mutations";
import {
  replySnippetIdSchema,
  replySnippetSchema,
} from "@/features/inquiries/reply-snippet-schemas";
import type {
  ReplySnippetActionState,
  ReplySnippetDeleteActionState,
} from "@/features/inquiries/reply-snippet-types";

const initialReplySnippetState: ReplySnippetActionState = {};
const initialReplySnippetDeleteState: ReplySnippetDeleteActionState = {};

function updateCacheTags(tags: string[]) {
  for (const tag of uniqueCacheTags(tags)) {
    updateTag(tag);
  }
}

export async function createReplySnippetAction(
  prevState: ReplySnippetActionState = initialReplySnippetState,
  formData: FormData,
): Promise<ReplySnippetActionState> {
  void prevState;

  const ownerAccess = await getOperationalBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const validationResult = replySnippetSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the snippet and try again.",
    );
  }

  const { user, businessContext } = ownerAccess;

  try {
    await createReplySnippetForBusiness({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      snippet: validationResult.data,
    });

    updateCacheTags(
      getBusinessReplySnippetsCacheTags(businessContext.business.id),
    );

    return {
      success: "Reply snippet saved.",
    };
  } catch (error) {
    console.error("Failed to create reply snippet.", error);

    return {
      error: "We couldn't save that reply snippet right now.",
    };
  }
}

export async function updateReplySnippetAction(
  replySnippetId: string,
  prevState: ReplySnippetActionState = initialReplySnippetState,
  formData: FormData,
): Promise<ReplySnippetActionState> {
  void prevState;

  const parsedId = replySnippetIdSchema.safeParse(replySnippetId);

  if (!parsedId.success) {
    return {
      error: "That reply snippet could not be found.",
    };
  }

  const ownerAccess = await getOperationalBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const validationResult = replySnippetSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the snippet and try again.",
    );
  }

  const { user, businessContext } = ownerAccess;

  try {
    const result = await updateReplySnippetForBusiness({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      replySnippetId: parsedId.data,
      snippet: validationResult.data,
    });

    if (!result) {
      return {
        error: "That reply snippet could not be found.",
      };
    }

    updateCacheTags(
      getBusinessReplySnippetsCacheTags(businessContext.business.id),
    );

    return {
      success: "Reply snippet updated.",
    };
  } catch (error) {
    console.error("Failed to update reply snippet.", error);

    return {
      error: "We couldn't update that reply snippet right now.",
    };
  }
}

export async function deleteReplySnippetAction(
  replySnippetId: string,
  prevState: ReplySnippetDeleteActionState = initialReplySnippetDeleteState,
  formData: FormData,
): Promise<ReplySnippetDeleteActionState> {
  void prevState;
  void formData;

  const parsedId = replySnippetIdSchema.safeParse(replySnippetId);

  if (!parsedId.success) {
    return {
      error: "That reply snippet could not be found.",
    };
  }

  const ownerAccess = await getOperationalBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;

  try {
    const result = await deleteReplySnippetForBusiness({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      replySnippetId: parsedId.data,
    });

    if (!result) {
      return {
        error: "That reply snippet could not be found.",
      };
    }

    updateCacheTags(
      getBusinessReplySnippetsCacheTags(businessContext.business.id),
    );

    return {};
  } catch (error) {
    console.error("Failed to delete reply snippet.", error);

    return {
      error: "We couldn't delete that reply snippet right now.",
    };
  }
}
