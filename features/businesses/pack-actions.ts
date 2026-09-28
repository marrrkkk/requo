"use server";

import { revalidatePath } from "next/cache";

import { isBehaviorPackKey } from "@/features/businesses/behavior-packs";
import {
  resetBusinessPackForBusiness,
  switchBusinessPackForBusiness,
} from "@/features/businesses/pack-assignments";
import {
  activateRecipeVersionForBusiness,
  createRecipeVersionForBusiness,
} from "@/features/businesses/pack-recipes";
import type { PackRecipeKind } from "@/lib/db/schema/pack-recipes";
import { packRecipeKinds } from "@/lib/db/schema/pack-recipes";
import { getBusinessActionContext } from "@/lib/db/business-access";
import { getBusinessSettingsPath } from "@/features/businesses/routes";

export type PackActionState = {
  error?: string;
  success?: string;
};

function isRecipeKind(value: unknown): value is PackRecipeKind {
  return (
    typeof value === "string" &&
    (packRecipeKinds as readonly string[]).includes(value)
  );
}

/** Owner-only pack switch. Future-only: history and records untouched. */
export async function switchBehaviorPackAction(
  _prevState: PackActionState,
  formData: FormData,
): Promise<PackActionState> {
  const context = await getBusinessActionContext({
    minimumRole: "owner",
    unauthorizedMessage: "Only the business owner can change the behavior pack.",
  });

  if (!context.ok) {
    return { error: context.error };
  }

  const pack = formData.get("pack");

  if (pack !== null && pack !== "" && !isBehaviorPackKey(pack)) {
    return { error: "Unknown behavior pack." };
  }

  try {
    await switchBusinessPackForBusiness({
      businessId: context.businessContext.business.id,
      pack: pack === "" || pack === null ? null : pack,
      actorUserId: context.user.id,
      actorRole: context.businessContext.role,
      actorName: context.user.name,
      actorEmail: context.user.email,
      source: "switch",
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not switch packs." };
  }

  revalidatePath(getBusinessSettingsPath(context.businessContext.business.slug, "workflow"));

  return { success: "Behavior pack updated. New records use the new pack; history is unchanged." };
}

/** Owner-only reset to resolver defaults. Config tables only. */
export async function resetBehaviorPackAction(
  _prevState: PackActionState,
): Promise<PackActionState> {
  const context = await getBusinessActionContext({
    minimumRole: "owner",
    unauthorizedMessage: "Only the business owner can reset the behavior pack.",
  });

  if (!context.ok) {
    return { error: context.error };
  }

  try {
    await resetBusinessPackForBusiness({
      businessId: context.businessContext.business.id,
      actorUserId: context.user.id,
      actorRole: context.businessContext.role,
      actorName: context.user.name,
      actorEmail: context.user.email,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not reset the pack." };
  }

  revalidatePath(getBusinessSettingsPath(context.businessContext.business.slug, "workflow"));

  return { success: "Behavior pack reset to defaults." };
}

/** Manager+: draft a new recipe version (Pro-gated, depth). */
export async function createRecipeVersionAction(
  _prevState: PackActionState,
  formData: FormData,
): Promise<PackActionState> {
  const context = await getBusinessActionContext({
    minimumRole: "manager",
    unauthorizedMessage: "Only an owner or manager can edit recipes.",
  });

  if (!context.ok) {
    return { error: context.error };
  }

  const kind = formData.get("kind");
  const pack = formData.get("pack");
  const configRaw = formData.get("config");

  if (!isRecipeKind(kind) || !isBehaviorPackKey(pack) || typeof configRaw !== "string") {
    return { error: "Invalid recipe edit." };
  }

  let config: unknown;

  try {
    config = JSON.parse(configRaw);
  } catch {
    return { error: "Recipe config must be valid JSON." };
  }

  try {
    await createRecipeVersionForBusiness({
      businessId: context.businessContext.business.id,
      pack,
      kind,
      config,
      actorRole: context.businessContext.role,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save the recipe version." };
  }

  revalidatePath(getBusinessSettingsPath(context.businessContext.business.slug, "workflow"));

  return { success: "New recipe version saved (inactive until activated)." };
}

/** Owner-only transactional activation (Pro-gated, depth). */
export async function activateRecipeVersionAction(
  _prevState: PackActionState,
  formData: FormData,
): Promise<PackActionState> {
  const context = await getBusinessActionContext({
    minimumRole: "owner",
    unauthorizedMessage: "Only the business owner can activate recipes.",
  });

  if (!context.ok) {
    return { error: context.error };
  }

  const kind = formData.get("kind");
  const version = Number(formData.get("version"));

  if (!isRecipeKind(kind) || !Number.isInteger(version) || version < 1) {
    return { error: "Invalid recipe activation." };
  }

  try {
    await activateRecipeVersionForBusiness({
      businessId: context.businessContext.business.id,
      kind,
      version,
      actorRole: context.businessContext.role,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not activate the recipe." };
  }

  revalidatePath(getBusinessSettingsPath(context.businessContext.business.slug, "workflow"));

  return { success: "Recipe version activated." };
}
