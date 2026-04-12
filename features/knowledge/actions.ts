"use server";

import { updateTag } from "next/cache";

import {
  getUserSafeErrorMessage,
  getValidationActionState,
} from "@/lib/action-state";
import {
  getBusinessKnowledgeCacheTags,
  uniqueCacheTags,
} from "@/lib/cache/business-tags";
import { getOperationalBusinessActionContext } from "@/lib/db/business-access";
import {
  createKnowledgeFaqForBusiness,
  deleteKnowledgeFaqForBusiness,
  deleteKnowledgeFileForBusiness,
  updateKnowledgeFaqForBusiness,
  uploadKnowledgeFileForBusiness,
} from "@/features/knowledge/mutations";
import {
  knowledgeFaqIdSchema,
  knowledgeFaqSchema,
  knowledgeFileIdSchema,
  knowledgeFileUploadSchema,
} from "@/features/knowledge/schemas";
import type {
  KnowledgeFaqActionState,
  KnowledgeFaqDeleteActionState,
  KnowledgeFileActionState,
  KnowledgeFileDeleteActionState,
} from "@/features/knowledge/types";

const initialKnowledgeFileState: KnowledgeFileActionState = {};
const initialKnowledgeFileDeleteState: KnowledgeFileDeleteActionState = {};
const initialKnowledgeFaqState: KnowledgeFaqActionState = {};
const initialKnowledgeFaqDeleteState: KnowledgeFaqDeleteActionState = {};

function updateCacheTags(tags: string[]) {
  for (const tag of uniqueCacheTags(tags)) {
    updateTag(tag);
  }
}

export async function uploadKnowledgeFileAction(
  prevState: KnowledgeFileActionState = initialKnowledgeFileState,
  formData: FormData,
): Promise<KnowledgeFileActionState> {
  void prevState;

  const ownerAccess = await getOperationalBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;
  const validationResult = knowledgeFileUploadSchema.safeParse({
    title: formData.get("title"),
    file: formData.get("file"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Check the highlighted fields and try again.");
  }

  try {
    await uploadKnowledgeFileForBusiness({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      knowledgeFile: validationResult.data,
    });

    updateCacheTags(getBusinessKnowledgeCacheTags(businessContext.business.id));
    return {
      success: "Knowledge file uploaded.",
    };
  } catch (error) {
    console.error("Failed to upload knowledge file.", error);

    return {
      error: getUserSafeErrorMessage(
        error,
        "We couldn't upload that knowledge file right now.",
      ),
    };
  }
}

export async function deleteKnowledgeFileAction(
  knowledgeFileId: string,
  prevState: KnowledgeFileDeleteActionState = initialKnowledgeFileDeleteState,
  formData: FormData,
): Promise<KnowledgeFileDeleteActionState> {
  void prevState;
  void formData;

  const parsedId = knowledgeFileIdSchema.safeParse(knowledgeFileId);

  if (!parsedId.success) {
    return {
      error: "That file could not be found.",
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
    const result = await deleteKnowledgeFileForBusiness({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      knowledgeFileId: parsedId.data,
    });

    if (!result) {
      return {
        error: "That file could not be found.",
      };
    }

    updateCacheTags(getBusinessKnowledgeCacheTags(businessContext.business.id));
    return {};
  } catch (error) {
    console.error("Failed to delete knowledge file.", error);

    return {
      error: "We couldn't delete that file right now.",
    };
  }
}

export async function createKnowledgeFaqAction(
  prevState: KnowledgeFaqActionState = initialKnowledgeFaqState,
  formData: FormData,
): Promise<KnowledgeFaqActionState> {
  void prevState;

  const ownerAccess = await getOperationalBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;
  const validationResult = knowledgeFaqSchema.safeParse({
    question: formData.get("question"),
    answer: formData.get("answer"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Check the FAQ entry and try again.");
  }

  try {
    await createKnowledgeFaqForBusiness({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      faq: validationResult.data,
    });

    updateCacheTags(getBusinessKnowledgeCacheTags(businessContext.business.id));
    return {
      success: "FAQ added.",
    };
  } catch (error) {
    console.error("Failed to create FAQ.", error);

    return {
      error: "We couldn't save that FAQ right now.",
    };
  }
}

export async function updateKnowledgeFaqAction(
  knowledgeFaqId: string,
  prevState: KnowledgeFaqActionState = initialKnowledgeFaqState,
  formData: FormData,
): Promise<KnowledgeFaqActionState> {
  void prevState;

  const parsedId = knowledgeFaqIdSchema.safeParse(knowledgeFaqId);

  if (!parsedId.success) {
    return {
      error: "That FAQ could not be found.",
    };
  }

  const ownerAccess = await getOperationalBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;
  const validationResult = knowledgeFaqSchema.safeParse({
    question: formData.get("question"),
    answer: formData.get("answer"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Check the FAQ entry and try again.");
  }

  try {
    const result = await updateKnowledgeFaqForBusiness({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      knowledgeFaqId: parsedId.data,
      faq: validationResult.data,
    });

    if (!result) {
      return {
        error: "That FAQ could not be found.",
      };
    }

    updateCacheTags(getBusinessKnowledgeCacheTags(businessContext.business.id));
    return {
      success: "FAQ updated.",
    };
  } catch (error) {
    console.error("Failed to update FAQ.", error);

    return {
      error: "We couldn't update that FAQ right now.",
    };
  }
}

export async function deleteKnowledgeFaqAction(
  knowledgeFaqId: string,
  prevState: KnowledgeFaqDeleteActionState = initialKnowledgeFaqDeleteState,
  formData: FormData,
): Promise<KnowledgeFaqDeleteActionState> {
  void prevState;
  void formData;

  const parsedId = knowledgeFaqIdSchema.safeParse(knowledgeFaqId);

  if (!parsedId.success) {
    return {
      error: "That FAQ could not be found.",
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
    const result = await deleteKnowledgeFaqForBusiness({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      knowledgeFaqId: parsedId.data,
    });

    if (!result) {
      return {
        error: "That FAQ could not be found.",
      };
    }

    updateCacheTags(getBusinessKnowledgeCacheTags(businessContext.business.id));
    return {};
  } catch (error) {
    console.error("Failed to delete FAQ.", error);

    return {
      error: "We couldn't delete that FAQ right now.",
    };
  }
}
