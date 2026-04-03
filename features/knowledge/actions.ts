"use server";

import { revalidatePath } from "next/cache";

import {
  getUserSafeErrorMessage,
  getValidationActionState,
} from "@/lib/action-state";
import { getOwnerWorkspaceActionContext } from "@/lib/db/workspace-access";
import {
  createKnowledgeFaqForWorkspace,
  deleteKnowledgeFaqForWorkspace,
  deleteKnowledgeFileForWorkspace,
  updateKnowledgeFaqForWorkspace,
  uploadKnowledgeFileForWorkspace,
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

function revalidateKnowledgePage() {
  revalidatePath("/dashboard/knowledge");
}

export async function uploadKnowledgeFileAction(
  prevState: KnowledgeFileActionState = initialKnowledgeFileState,
  formData: FormData,
): Promise<KnowledgeFileActionState> {
  void prevState;

  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, workspaceContext } = ownerAccess;
  const validationResult = knowledgeFileUploadSchema.safeParse({
    title: formData.get("title"),
    file: formData.get("file"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Check the highlighted fields and try again.");
  }

  try {
    await uploadKnowledgeFileForWorkspace({
      workspaceId: workspaceContext.workspace.id,
      actorUserId: user.id,
      knowledgeFile: validationResult.data,
    });

    revalidateKnowledgePage();

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

  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, workspaceContext } = ownerAccess;

  try {
    const result = await deleteKnowledgeFileForWorkspace({
      workspaceId: workspaceContext.workspace.id,
      actorUserId: user.id,
      knowledgeFileId: parsedId.data,
    });

    if (!result) {
      return {
        error: "That file could not be found.",
      };
    }

    revalidateKnowledgePage();

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

  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, workspaceContext } = ownerAccess;
  const validationResult = knowledgeFaqSchema.safeParse({
    question: formData.get("question"),
    answer: formData.get("answer"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Check the FAQ entry and try again.");
  }

  try {
    await createKnowledgeFaqForWorkspace({
      workspaceId: workspaceContext.workspace.id,
      actorUserId: user.id,
      faq: validationResult.data,
    });

    revalidateKnowledgePage();

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

  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, workspaceContext } = ownerAccess;
  const validationResult = knowledgeFaqSchema.safeParse({
    question: formData.get("question"),
    answer: formData.get("answer"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Check the FAQ entry and try again.");
  }

  try {
    const result = await updateKnowledgeFaqForWorkspace({
      workspaceId: workspaceContext.workspace.id,
      actorUserId: user.id,
      knowledgeFaqId: parsedId.data,
      faq: validationResult.data,
    });

    if (!result) {
      return {
        error: "That FAQ could not be found.",
      };
    }

    revalidateKnowledgePage();

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

  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, workspaceContext } = ownerAccess;

  try {
    const result = await deleteKnowledgeFaqForWorkspace({
      workspaceId: workspaceContext.workspace.id,
      actorUserId: user.id,
      knowledgeFaqId: parsedId.data,
    });

    if (!result) {
      return {
        error: "That FAQ could not be found.",
      };
    }

    revalidateKnowledgePage();

    return {};
  } catch (error) {
    console.error("Failed to delete FAQ.", error);

    return {
      error: "We couldn't delete that FAQ right now.",
    };
  }
}
