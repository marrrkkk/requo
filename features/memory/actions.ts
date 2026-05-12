"use server";

import { updateTag } from "next/cache";

import { getUserSafeErrorMessage, getValidationActionState } from "@/lib/action-state";
import { getBusinessMemoryCacheTags, uniqueCacheTags } from "@/lib/cache/business-tags";
import { getOperationalBusinessActionContext } from "@/lib/db/business-access";
import { getUsageLimit, hasFeatureAccess } from "@/lib/plans";
import {
  createMemoryForBusiness,
  deleteMemoryForBusiness,
  getMemoryCountForBusiness,
  updateMemoryForBusiness,
} from "@/features/memory/mutations";
import { memoryIdSchema, memorySchema } from "@/features/memory/schemas";
import type {
  MemoryActionState,
  MemoryDeleteActionState,
} from "@/features/memory/types";

const initialMemoryState: MemoryActionState = {};
const initialMemoryDeleteState: MemoryDeleteActionState = {};

function updateCacheTags(tags: string[]) {
  for (const tag of uniqueCacheTags(tags)) {
    updateTag(tag);
  }
}

export async function createMemoryAction(
  prevState: MemoryActionState = initialMemoryState,
  formData: FormData,
): Promise<MemoryActionState> {
  void prevState;

  const ownerAccess = await getOperationalBusinessActionContext();

  if (!ownerAccess.ok) {
    return { error: ownerAccess.error };
  }

  const { user, businessContext } = ownerAccess;
  const plan = businessContext.business.plan;

  if (!hasFeatureAccess(plan, "knowledgeBase")) {
    return { error: "Upgrade to Pro to save knowledge for the AI assistant." };
  }

  const memoryLimit = getUsageLimit(plan, "memoriesPerBusiness");

  if (memoryLimit !== null) {
    const currentCount = await getMemoryCountForBusiness(businessContext.business.id);
    if (currentCount >= memoryLimit) {
      return {
        error: `You have reached your knowledge limit (${memoryLimit}). Delete some knowledge items first.`,
      };
    }
  }

  const validationResult = memorySchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Check the highlighted fields and try again.");
  }

  try {
    await createMemoryForBusiness({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      memory: validationResult.data,
    });

    updateCacheTags(getBusinessMemoryCacheTags(businessContext.business.id));
    return { success: "Memory saved." };
  } catch (error) {
    console.error("Failed to create memory.", error);
    return {
      error: getUserSafeErrorMessage(error, "We couldn't save that memory right now."),
    };
  }
}

export async function updateMemoryAction(
  memoryId: string,
  prevState: MemoryActionState = initialMemoryState,
  formData: FormData,
): Promise<MemoryActionState> {
  void prevState;

  const parsedId = memoryIdSchema.safeParse(memoryId);

  if (!parsedId.success) {
    return { error: "That memory could not be found." };
  }

  const ownerAccess = await getOperationalBusinessActionContext();

  if (!ownerAccess.ok) {
    return { error: ownerAccess.error };
  }

  const { user, businessContext } = ownerAccess;

  if (!hasFeatureAccess(businessContext.business.plan, "knowledgeBase")) {
    return { error: "Upgrade to Pro to update knowledge." };
  }

  const validationResult = memorySchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
  });

  if (!validationResult.success) {
    return getValidationActionState(validationResult.error, "Check the highlighted fields and try again.");
  }

  try {
    const result = await updateMemoryForBusiness({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      memoryId: parsedId.data,
      memory: validationResult.data,
    });

    if (!result) {
      return { error: "That memory could not be found." };
    }

    updateCacheTags(getBusinessMemoryCacheTags(businessContext.business.id));
    return { success: "Memory updated." };
  } catch (error) {
    console.error("Failed to update memory.", error);
    return {
      error: getUserSafeErrorMessage(error, "We couldn't update that memory right now."),
    };
  }
}

export async function deleteMemoryAction(
  memoryId: string,
  prevState: MemoryDeleteActionState = initialMemoryDeleteState,
  formData: FormData,
): Promise<MemoryDeleteActionState> {
  void prevState;
  void formData;

  const parsedId = memoryIdSchema.safeParse(memoryId);

  if (!parsedId.success) {
    return { error: "That memory could not be found." };
  }

  const ownerAccess = await getOperationalBusinessActionContext();

  if (!ownerAccess.ok) {
    return { error: ownerAccess.error };
  }

  const { user, businessContext } = ownerAccess;

  if (!hasFeatureAccess(businessContext.business.plan, "knowledgeBase")) {
    return { error: "Upgrade to Pro to delete knowledge." };
  }

  try {
    const result = await deleteMemoryForBusiness({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      memoryId: parsedId.data,
    });

    if (!result) {
      return { error: "That memory could not be found." };
    }

    updateCacheTags(getBusinessMemoryCacheTags(businessContext.business.id));
    return {};
  } catch (error) {
    console.error("Failed to delete memory.", error);
    return { error: "We couldn't delete that memory right now." };
  }
}
