"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { getValidationActionState } from "@/lib/action-state";
import { uniqueCacheTags, getBusinessMembersCacheTags } from "@/lib/cache/business-tags";
import { getOwnerBusinessActionContext } from "@/lib/db/business-access";
import { requireSession } from "@/lib/auth/session";
import { activeBusinessSlugCookieName, getBusinessDashboardPath, getBusinessMemberInvitePath, getBusinessMembersPath } from "@/features/businesses/routes";
import {
  businessMemberInviteIdSchema,
  businessMemberInviteSchema,
  businessMemberRoleUpdateSchema,
  businessMembershipIdSchema,
} from "@/features/business-members/schemas";
import {
  acceptBusinessMemberInvite,
  cancelBusinessMemberInvite,
  createBusinessMemberInvite,
  removeBusinessMember,
  updateBusinessMemberRole,
} from "@/features/business-members/mutations";
import type { BusinessMemberInviteActionState } from "@/features/business-members/action-types";

const initialInviteState: BusinessMemberInviteActionState = {};

function updateCacheTags(tags: string[]) {
  for (const tag of uniqueCacheTags(tags)) {
    updateTag(tag);
  }
}

export async function createBusinessMemberInviteAction(
  prevState: BusinessMemberInviteActionState = initialInviteState,
  formData: FormData,
): Promise<BusinessMemberInviteActionState> {
  void prevState;
  const ownerAccess = await getOwnerBusinessActionContext();

  if (!ownerAccess.ok) {
    return { error: ownerAccess.error };
  }

  const { user, businessContext } = ownerAccess;
  const validationResult = businessMemberInviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the invite details and try again.",
    );
  }

  const inviteToken = randomUUID();

  try {
    await createBusinessMemberInvite({
      businessId: businessContext.business.id,
      inviterUserId: user.id,
      email: validationResult.data.email,
      role: validationResult.data.role === "manager" ? "manager" : "staff",
      token: inviteToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    updateCacheTags(getBusinessMembersCacheTags(businessContext.business.id));
    revalidatePath(getBusinessMembersPath(businessContext.business.slug));

    return {
      success: "Invite created.",
      inviteLink: getBusinessMemberInvitePath(inviteToken),
    };
  } catch (error) {
    console.error("Failed to create business member invite.", error);
    return { error: "We couldn't create that invite right now." };
  }
}

export async function cancelBusinessMemberInviteAction(
  prevState: BusinessMemberInviteActionState = initialInviteState,
  formData: FormData,
): Promise<BusinessMemberInviteActionState> {
  void prevState;
  const parsedId = businessMemberInviteIdSchema.safeParse(formData.get("inviteId"));

  if (!parsedId.success) {
    return { error: "That invite could not be found." };
  }

  const ownerAccess = await getOwnerBusinessActionContext();

  if (!ownerAccess.ok) {
    return { error: ownerAccess.error };
  }

  const { businessContext } = ownerAccess;

  try {
    await cancelBusinessMemberInvite({
      businessId: businessContext.business.id,
      inviteId: parsedId.data,
    });

    updateCacheTags(getBusinessMembersCacheTags(businessContext.business.id));
    revalidatePath(getBusinessMembersPath(businessContext.business.slug));

    return { success: "Invite canceled." };
  } catch (error) {
    console.error("Failed to cancel member invite.", error);
    return { error: "We couldn't cancel that invite right now." };
  }
}

export async function updateBusinessMemberRoleAction(
  prevState: BusinessMemberInviteActionState = initialInviteState,
  formData: FormData,
): Promise<BusinessMemberInviteActionState> {
  void prevState;
  const ownerAccess = await getOwnerBusinessActionContext();

  if (!ownerAccess.ok) {
    return { error: ownerAccess.error };
  }

  const { businessContext, user } = ownerAccess;
  const validationResult = businessMemberRoleUpdateSchema.safeParse({
    membershipId: formData.get("membershipId"),
    role: formData.get("role"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check that role and try again.",
    );
  }

  // Prevent owner from changing their own role.
  const isSelf = formData.get("userId") === user.id;
  if (isSelf) {
    return { error: "Owner access stays unchanged here." };
  }

  try {
    await updateBusinessMemberRole({
      businessId: businessContext.business.id,
      membershipId: validationResult.data.membershipId,
      role: validationResult.data.role,
    });

    updateCacheTags(getBusinessMembersCacheTags(businessContext.business.id));
    revalidatePath(getBusinessMembersPath(businessContext.business.slug));

    return { success: "Member updated." };
  } catch (error) {
    console.error("Failed to update member role.", error);
    return { error: "We couldn't update that member right now." };
  }
}

export async function removeBusinessMemberAction(
  prevState: BusinessMemberInviteActionState = initialInviteState,
  formData: FormData,
): Promise<BusinessMemberInviteActionState> {
  void prevState;
  const parsedMembershipId = businessMembershipIdSchema.safeParse(
    formData.get("membershipId"),
  );

  if (!parsedMembershipId.success) {
    return { error: "That member could not be found." };
  }

  const ownerAccess = await getOwnerBusinessActionContext();

  if (!ownerAccess.ok) {
    return { error: ownerAccess.error };
  }

  const { businessContext, user } = ownerAccess;
  const isSelf = formData.get("userId") === user.id;

  if (isSelf) {
    return { error: "You can't remove the business owner." };
  }

  try {
    await removeBusinessMember({
      businessId: businessContext.business.id,
      membershipId: parsedMembershipId.data,
    });

    updateCacheTags(getBusinessMembersCacheTags(businessContext.business.id));
    revalidatePath(getBusinessMembersPath(businessContext.business.slug));

    return { success: "Member removed." };
  } catch (error) {
    console.error("Failed to remove member.", error);
    return { error: "We couldn't remove that member right now." };
  }
}

export async function acceptBusinessMemberInviteAction(inviteToken: string) {
  const session = await requireSession();
  const result = await acceptBusinessMemberInvite({
    inviteToken,
    userId: session.user.id,
    userEmail: session.user.email,
  });

  if (!result.ok) {
    redirect(`/invite/${inviteToken}?error=1`);
  }

  // Persist active business in the shell cookie.
  const cookieStore = await cookies();
  cookieStore.set(activeBusinessSlugCookieName, result.businessSlug, {
    path: "/",
    sameSite: "lax",
  });

  redirect(getBusinessDashboardPath(result.businessSlug));
}

