"use server";

import { revalidatePath, updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  businessMemberIdSchema,
  businessMemberInviteIdSchema,
  businessMemberInviteSchema,
  businessMemberInviteTokenSchema,
  businessMemberRoleUpdateSchema,
} from "@/features/business-members/schemas";
import type {
  BusinessMemberInviteAcceptActionState,
  BusinessMemberInviteActionState,
  BusinessMemberRemoveActionState,
  BusinessMemberRoleActionState,
} from "@/features/business-members/types";
import {
  acceptBusinessMemberInviteForUser,
  cancelBusinessMemberInviteForBusiness,
  createBusinessMemberInviteForBusiness,
  declineBusinessMemberInviteForUser,
  regenerateBusinessMemberInviteLinkForBusiness,
  removeBusinessMemberFromBusiness,
  updateBusinessMemberRoleForBusiness,
} from "@/features/business-members/mutations";
import {
  activeBusinessSlugCookieName,
  getBusinessDashboardPath,
  getBusinessMemberInvitePath,
  getBusinessSettingsPath,
} from "@/features/businesses/routes";
import { getValidationActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { getBusinessMembersCacheTags } from "@/lib/cache/business-tags";
import { getBusinessActionContext } from "@/lib/db/business-access";
import { sendBusinessMemberInviteEmail } from "@/lib/resend/client";
import { env } from "@/lib/env";
import { hasFeatureAccess, planMeta, getRequiredPlan } from "@/lib/plans";
import { workspacesHubPath } from "@/features/workspaces/routes";

function updateCacheTags(tags: string[]) {
  for (const tag of tags) {
    updateTag(tag);
  }
}

function revalidateMembersSettingsPath(businessSlug: string) {
  revalidatePath(getBusinessSettingsPath(businessSlug, "members"));
}

function getBusinessSlugFromFormData(formData: FormData) {
  const value = formData.get("businessSlug");

  return typeof value === "string" && value.trim().length
    ? value.trim()
    : undefined;
}

async function getOwnerBusinessAccessForFormData(formData: FormData) {
  return getBusinessActionContext({
    businessSlug: getBusinessSlugFromFormData(formData),
    minimumRole: "owner",
    unauthorizedMessage: "Only the business owner can do that.",
  });
}

export async function createBusinessMemberInviteAction(
  _prevState: BusinessMemberInviteActionState,
  formData: FormData,
): Promise<BusinessMemberInviteActionState> {
  const ownerAccess = await getOwnerBusinessAccessForFormData(formData);

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;

  if (!hasFeatureAccess(businessContext.business.workspacePlan, "members")) {
    const requiredPlan = getRequiredPlan("members");

    return {
      error: `Team members require the ${requiredPlan ? planMeta[requiredPlan].label : "Business"} plan. ${requiredPlan ? planMeta[requiredPlan].ctaLabel : "Contact us to upgrade"} to invite members.`,
    };
  }

  const validationResult = businessMemberInviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the member details and try again.",
    );
  }

  if (
    validationResult.data.email.toLowerCase() === user.email.trim().toLowerCase()
  ) {
    return {
      error: "You already have access to this business.",
      fieldErrors: {
        email: ["Use a different email address."],
      },
    };
  }

  try {
    const result = await createBusinessMemberInviteForBusiness({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      actorUserName: user.name,
      email: validationResult.data.email,
      role: validationResult.data.role,
    });

    if (!result.ok) {
      if (result.reason === "already-member") {
        return {
          error: "That email already has access to this business.",
          fieldErrors: {
            email: ["This person is already a member."],
          },
        };
      }

      return {
        error: "That business could not be found.",
      };
    }

    const inviteUrl = new URL(
      getBusinessMemberInvitePath(result.token),
      env.BETTER_AUTH_URL,
    ).toString();
    let emailSent = false;

    try {
      emailSent = await sendBusinessMemberInviteEmail({
        inviteId: result.inviteId,
        token: result.token,
        email: result.email,
        businessName: result.business.name,
        inviterName: user.name,
        role: result.role,
        inviteUrl,
      });
    } catch (error) {
      console.error("Failed to send business member invite email.", error);
    }

    updateCacheTags(getBusinessMembersCacheTags(businessContext.business.id));
    revalidateMembersSettingsPath(businessContext.business.slug);

    return {
      success: emailSent
        ? "Invite sent."
        : "Invite saved. Generate a fresh invite link from the pending invites list.",
    };
  } catch (error) {
    console.error("Failed to create business member invite.", error);

    return {
      error: "We couldn't save that invite right now.",
    };
  }
}

export async function updateBusinessMemberRoleAction(
  membershipId: string,
  _prevState: BusinessMemberRoleActionState,
  formData: FormData,
): Promise<BusinessMemberRoleActionState> {
  const parsedMembershipId = businessMemberIdSchema.safeParse(membershipId);

  if (!parsedMembershipId.success) {
    return {
      error: "That member could not be found.",
    };
  }

  const ownerAccess = await getOwnerBusinessAccessForFormData(formData);

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;
  const validationResult = businessMemberRoleUpdateSchema.safeParse({
    role: formData.get("role"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Choose a role and try again.",
    );
  }

  try {
    const result = await updateBusinessMemberRoleForBusiness({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      actorUserName: user.name,
      membershipId: parsedMembershipId.data,
      role: validationResult.data.role,
    });

    if (!result.ok) {
      if (result.reason === "self-change-blocked") {
        return {
          error: "Change your own role from a future ownership-transfer flow instead.",
        };
      }

      if (result.reason === "owner-protected") {
        return {
          error: "Owner access cannot be changed here.",
        };
      }

      return {
        error: "That member could not be found.",
      };
    }

    updateCacheTags(getBusinessMembersCacheTags(businessContext.business.id));
    revalidateMembersSettingsPath(businessContext.business.slug);

    return {
      success: "Member role updated.",
    };
  } catch (error) {
    console.error("Failed to update business member role.", error);

    return {
      error: "We couldn't update that member right now.",
    };
  }
}

export async function removeBusinessMemberAction(
  membershipId: string,
  _prevState: BusinessMemberRemoveActionState,
  _formData: FormData,
): Promise<BusinessMemberRemoveActionState> {
  void _prevState;
  const parsedMembershipId = businessMemberIdSchema.safeParse(membershipId);

  if (!parsedMembershipId.success) {
    return {
      error: "That member could not be found.",
    };
  }

  const ownerAccess = await getOwnerBusinessAccessForFormData(_formData);

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;

  try {
    const result = await removeBusinessMemberFromBusiness({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      actorUserName: user.name,
      membershipId: parsedMembershipId.data,
    });

    if (!result.ok) {
      if (result.reason === "self-remove-blocked") {
        return {
          error: "You can't remove yourself here.",
        };
      }

      if (result.reason === "owner-protected") {
        return {
          error: "Owners can't be removed from this screen.",
        };
      }

      return {
        error: "That member could not be found.",
      };
    }

    updateCacheTags(getBusinessMembersCacheTags(businessContext.business.id));
    revalidateMembersSettingsPath(businessContext.business.slug);

    return {
      success: "Member removed.",
    };
  } catch (error) {
    console.error("Failed to remove business member.", error);

    return {
      error: "We couldn't remove that member right now.",
    };
  }
}

export async function cancelBusinessMemberInviteAction(
  inviteId: string,
  _prevState: BusinessMemberRemoveActionState,
  _formData: FormData,
): Promise<BusinessMemberRemoveActionState> {
  void _prevState;
  const parsedInviteId = businessMemberInviteIdSchema.safeParse(inviteId);

  if (!parsedInviteId.success) {
    return {
      error: "That invite could not be found.",
    };
  }

  const ownerAccess = await getOwnerBusinessAccessForFormData(_formData);

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;

  try {
    const result = await cancelBusinessMemberInviteForBusiness({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      actorUserName: user.name,
      inviteId: parsedInviteId.data,
    });

    if (!result.ok) {
      return {
        error: "That invite could not be found.",
      };
    }

    updateCacheTags(getBusinessMembersCacheTags(businessContext.business.id));
    revalidateMembersSettingsPath(businessContext.business.slug);

    return {
      success: "Invite canceled.",
    };
  } catch (error) {
    console.error("Failed to cancel business member invite.", error);

    return {
      error: "We couldn't cancel that invite right now.",
    };
  }
}

export async function copyBusinessMemberInviteLinkAction(
  inviteId: string,
  businessSlug: string,
) {
  const parsedInviteId = businessMemberInviteIdSchema.safeParse(inviteId);

  if (!parsedInviteId.success) {
    return {
      error: "That invite could not be found.",
    };
  }

  const ownerAccess = await getBusinessActionContext({
    businessSlug,
    minimumRole: "owner",
    unauthorizedMessage: "Only the business owner can do that.",
  });

  if (!ownerAccess.ok) {
    return {
      error: ownerAccess.error,
    };
  }

  const { user, businessContext } = ownerAccess;

  try {
    const result = await regenerateBusinessMemberInviteLinkForBusiness({
      businessId: businessContext.business.id,
      actorUserId: user.id,
      actorUserName: user.name,
      inviteId: parsedInviteId.data,
    });

    if (!result.ok) {
      return {
        error: "That invite could not be found.",
      };
    }

    updateCacheTags(getBusinessMembersCacheTags(businessContext.business.id));
    revalidateMembersSettingsPath(businessContext.business.slug);

    return {
      inviteUrl: new URL(
        getBusinessMemberInvitePath(result.token),
        env.BETTER_AUTH_URL,
      ).toString(),
    };
  } catch (error) {
    console.error("Failed to regenerate business member invite link.", error);

    return {
      error: "We couldn't create a fresh invite link right now.",
    };
  }
}

export async function acceptBusinessMemberInviteAction(
  token: string,
  _prevState: BusinessMemberInviteAcceptActionState,
  _formData: FormData,
): Promise<BusinessMemberInviteAcceptActionState> {
  void _prevState;
  void _formData;
  const parsedToken = businessMemberInviteTokenSchema.safeParse(token);
  const invitePath = getBusinessMemberInvitePath(token);
  const loginPath = `/login?next=${encodeURIComponent(invitePath)}`;

  if (!parsedToken.success) {
    return {
      error: "That invite link is not valid.",
    };
  }

  const user = await requireUser(loginPath);
  let result: Awaited<ReturnType<typeof acceptBusinessMemberInviteForUser>>;

  try {
    result = await acceptBusinessMemberInviteForUser({
      token: parsedToken.data,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
    });
  } catch (error) {
    console.error("Failed to accept business member invite.", error);

    return {
      error: "We couldn't accept that invite right now.",
    };
  }

  if (!result.ok) {
    if (result.reason === "email-mismatch") {
      return {
        error: `Sign in with ${result.invitedEmail} to accept this invite.`,
      };
    }

    return {
      error:
        result.reason === "expired"
          ? "This invite has expired."
          : "That invite link is not valid.",
    };
  }

  const cookieStore = await cookies();

  cookieStore.set(activeBusinessSlugCookieName, result.businessSlug);
  updateCacheTags(getBusinessMembersCacheTags(result.businessId));
  revalidateMembersSettingsPath(result.businessSlug);
  revalidatePath(workspacesHubPath);
  redirect(getBusinessDashboardPath(result.businessSlug));
}

export async function declineBusinessMemberInviteAction(
  token: string,
  _prevState: BusinessMemberInviteAcceptActionState,
  _formData: FormData,
): Promise<BusinessMemberInviteAcceptActionState> {
  void _prevState;
  void _formData;
  const parsedToken = businessMemberInviteTokenSchema.safeParse(token);
  const invitePath = getBusinessMemberInvitePath(token);
  const loginPath = `/login?next=${encodeURIComponent(invitePath)}`;

  if (!parsedToken.success) {
    return {
      error: "That invite link is not valid.",
    };
  }

  const user = await requireUser(loginPath);
  let result: Awaited<ReturnType<typeof declineBusinessMemberInviteForUser>>;

  try {
    result = await declineBusinessMemberInviteForUser({
      token: parsedToken.data,
      userEmail: user.email,
      userName: user.name,
    });
  } catch (error) {
    console.error("Failed to decline business member invite.", error);

    return {
      error: "We couldn't decline that invite right now.",
    };
  }

  if (!result.ok) {
    if (result.reason === "email-mismatch") {
      return {
        error: `Sign in with ${result.invitedEmail} to decline this invite.`,
      };
    }

    return {
      error:
        result.reason === "expired"
          ? "This invite has expired."
          : "That invite link is not valid.",
    };
  }

  updateCacheTags(getBusinessMembersCacheTags(result.businessId));
  redirect(workspacesHubPath);
}
