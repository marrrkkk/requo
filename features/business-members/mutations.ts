import { and, eq, sql } from "drizzle-orm";
import { insertBusinessNotification } from "@/features/notifications/mutations";

import {
  businessMemberInviteDurationDays,
  type BusinessMemberAssignableRole,
  type BusinessMemberRole,
} from "@/lib/business-members";
import {
  createBusinessMemberInviteToken,
  getBusinessMemberInviteLookupCondition,
} from "@/features/business-members/invite-tokens";
import { db } from "@/lib/db/client";
import {
  activityLogs,
  businessMemberInvites,
  businessMembers,
  businesses,
  user,
} from "@/lib/db/schema";

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function normalizeEmailAddress(email: string) {
  return email.trim().toLowerCase();
}

function getInviteExpirationDate() {
  return new Date(
    Date.now() + businessMemberInviteDurationDays * 24 * 60 * 60 * 1000,
  );
}

export async function createBusinessMemberInviteForBusiness({
  businessId,
  actorUserId,
  actorUserName,
  email,
  role,
}: {
  businessId: string;
  actorUserId: string;
  actorUserName: string;
  email: string;
  role: BusinessMemberAssignableRole;
}) {
  const normalizedEmail = normalizeEmailAddress(email);

  return db.transaction(async (tx) => {
    const [business] = await tx
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
      })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!business) {
      return {
        ok: false as const,
        reason: "business-not-found" as const,
      };
    }

    const [existingMember] = await tx
      .select({
        membershipId: businessMembers.id,
      })
      .from(businessMembers)
      .innerJoin(user, eq(businessMembers.userId, user.id))
      .where(
        and(
          eq(businessMembers.businessId, businessId),
          sql`lower(${user.email}) = ${normalizedEmail}`,
        ),
      )
      .limit(1);

    if (existingMember) {
      return {
        ok: false as const,
        reason: "already-member" as const,
      };
    }

    const [existingInvite] = await tx
      .select({
        id: businessMemberInvites.id,
      })
      .from(businessMemberInvites)
      .where(
        and(
          eq(businessMemberInvites.businessId, businessId),
          eq(businessMemberInvites.email, normalizedEmail),
        ),
      )
      .limit(1);

    const inviteId = existingInvite?.id ?? createId("bmi");
    const { rawToken, tokenHash } = createBusinessMemberInviteToken();
    const expiresAt = getInviteExpirationDate();
    const now = new Date();

    if (existingInvite) {
      await tx
        .update(businessMemberInvites)
        .set({
          inviterUserId: actorUserId,
          role,
          token: null,
          tokenHash,
          expiresAt,
          updatedAt: now,
        })
        .where(eq(businessMemberInvites.id, existingInvite.id));
    } else {
      await tx.insert(businessMemberInvites).values({
        id: inviteId,
        businessId,
        inviterUserId: actorUserId,
        email: normalizedEmail,
        role,
        token: null,
        tokenHash,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      });
    }

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      inquiryId: null,
      quoteId: null,
      actorUserId,
      type: "business.member_invited",
      summary: `${actorUserName} invited ${normalizedEmail} as ${role}.`,
      metadata: {
        inviteId,
        email: normalizedEmail,
        role,
      },
      createdAt: now,
      updatedAt: now,
    });

    return {
      ok: true as const,
      inviteId,
      token: rawToken,
      role,
      email: normalizedEmail,
      expiresAt,
      business,
    };
  });
}

export async function regenerateBusinessMemberInviteLinkForBusiness({
  businessId,
  actorUserId,
  actorUserName,
  inviteId,
}: {
  businessId: string;
  actorUserId: string;
  actorUserName: string;
  inviteId: string;
}) {
  const now = new Date();
  const expiresAt = getInviteExpirationDate();
  const { rawToken, tokenHash } = createBusinessMemberInviteToken();

  return db.transaction(async (tx) => {
    const [invite] = await tx
      .select({
        id: businessMemberInvites.id,
        email: businessMemberInvites.email,
        role: businessMemberInvites.role,
      })
      .from(businessMemberInvites)
      .where(
        and(
          eq(businessMemberInvites.businessId, businessId),
          eq(businessMemberInvites.id, inviteId),
        ),
      )
      .limit(1);

    if (!invite) {
      return {
        ok: false as const,
        reason: "not-found" as const,
      };
    }

    await tx
      .update(businessMemberInvites)
      .set({
        inviterUserId: actorUserId,
        token: null,
        tokenHash,
        expiresAt,
        updatedAt: now,
      })
      .where(eq(businessMemberInvites.id, invite.id));

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      inquiryId: null,
      quoteId: null,
      actorUserId,
      type: "business.member_invite_link_regenerated",
      summary: `${actorUserName} regenerated the invite link for ${invite.email}.`,
      metadata: {
        inviteId: invite.id,
        role: invite.role,
      },
      createdAt: now,
      updatedAt: now,
    });

    return {
      ok: true as const,
      email: invite.email,
      expiresAt,
      inviteId: invite.id,
      role: invite.role,
      token: rawToken,
    };
  });
}

export async function updateBusinessMemberRoleForBusiness({
  businessId,
  actorUserId,
  actorUserName,
  membershipId,
  role,
}: {
  businessId: string;
  actorUserId: string;
  actorUserName: string;
  membershipId: string;
  role: BusinessMemberAssignableRole;
}) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [targetMember] = await tx
      .select({
        membershipId: businessMembers.id,
        userId: businessMembers.userId,
        role: businessMembers.role,
        memberEmail: user.email,
      })
      .from(businessMembers)
      .innerJoin(user, eq(businessMembers.userId, user.id))
      .where(
        and(
          eq(businessMembers.businessId, businessId),
          eq(businessMembers.id, membershipId),
        ),
      )
      .limit(1);

    if (!targetMember) {
      return {
        ok: false as const,
        reason: "not-found" as const,
      };
    }

    if (targetMember.userId === actorUserId) {
      return {
        ok: false as const,
        reason: "self-change-blocked" as const,
      };
    }

    if (targetMember.role === "owner") {
      return {
        ok: false as const,
        reason: "owner-protected" as const,
      };
    }

    await tx
      .update(businessMembers)
      .set({
        role,
        updatedAt: now,
      })
      .where(eq(businessMembers.id, membershipId));

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      inquiryId: null,
      quoteId: null,
      actorUserId,
      type: "business.member_role_updated",
      summary: `${actorUserName} changed ${targetMember.memberEmail} to ${role}.`,
      metadata: {
        membershipId,
        previousRole: targetMember.role,
        nextRole: role,
      },
      createdAt: now,
      updatedAt: now,
    });

    return {
      ok: true as const,
      previousRole: targetMember.role,
      nextRole: role,
    };
  });
}

export async function removeBusinessMemberFromBusiness({
  businessId,
  actorUserId,
  actorUserName,
  membershipId,
}: {
  businessId: string;
  actorUserId: string;
  actorUserName: string;
  membershipId: string;
}) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [targetMember] = await tx
      .select({
        membershipId: businessMembers.id,
        userId: businessMembers.userId,
        role: businessMembers.role,
        memberEmail: user.email,
      })
      .from(businessMembers)
      .innerJoin(user, eq(businessMembers.userId, user.id))
      .where(
        and(
          eq(businessMembers.businessId, businessId),
          eq(businessMembers.id, membershipId),
        ),
      )
      .limit(1);

    if (!targetMember) {
      return {
        ok: false as const,
        reason: "not-found" as const,
      };
    }

    if (targetMember.userId === actorUserId) {
      return {
        ok: false as const,
        reason: "self-remove-blocked" as const,
      };
    }

    if (targetMember.role === "owner") {
      return {
        ok: false as const,
        reason: "owner-protected" as const,
      };
    }

    await tx.delete(businessMembers).where(eq(businessMembers.id, membershipId));

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      inquiryId: null,
      quoteId: null,
      actorUserId,
      type: "business.member_removed",
      summary: `${actorUserName} removed ${targetMember.memberEmail} from the business.`,
      metadata: {
        membershipId,
        removedRole: targetMember.role,
      },
      createdAt: now,
      updatedAt: now,
    });

    return {
      ok: true as const,
    };
  });
}

export async function cancelBusinessMemberInviteForBusiness({
  businessId,
  actorUserId,
  actorUserName,
  inviteId,
}: {
  businessId: string;
  actorUserId: string;
  actorUserName: string;
  inviteId: string;
}) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [invite] = await tx
      .select({
        id: businessMemberInvites.id,
        email: businessMemberInvites.email,
        role: businessMemberInvites.role,
      })
      .from(businessMemberInvites)
      .where(
        and(
          eq(businessMemberInvites.businessId, businessId),
          eq(businessMemberInvites.id, inviteId),
        ),
      )
      .limit(1);

    if (!invite) {
      return {
        ok: false as const,
        reason: "not-found" as const,
      };
    }

    await tx
      .delete(businessMemberInvites)
      .where(eq(businessMemberInvites.id, invite.id));

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      inquiryId: null,
      quoteId: null,
      actorUserId,
      type: "business.member_invite_canceled",
      summary: `${actorUserName} canceled the invite for ${invite.email}.`,
      metadata: {
        inviteId: invite.id,
        role: invite.role,
      },
      createdAt: now,
      updatedAt: now,
    });

    return {
      ok: true as const,
    };
  });
}

export async function acceptBusinessMemberInviteForUser({
  token,
  userId,
  userEmail,
  userName,
}: {
  token: string;
  userId: string;
  userEmail: string;
  userName: string;
}) {
  const normalizedUserEmail = normalizeEmailAddress(userEmail);
  const now = new Date();

  return db.transaction(async (tx) => {
    const [invite] = await tx
      .select({
        inviteId: businessMemberInvites.id,
        businessId: businessMemberInvites.businessId,
        email: businessMemberInvites.email,
        role: businessMemberInvites.role,
        expiresAt: businessMemberInvites.expiresAt,
        businessSlug: businesses.slug,
        notifyInAppOnMemberInviteResponse: businesses.notifyInAppOnMemberInviteResponse,
      })
      .from(businessMemberInvites)
      .innerJoin(businesses, eq(businessMemberInvites.businessId, businesses.id))
      .where(getBusinessMemberInviteLookupCondition(token))
      .limit(1);

    if (!invite) {
      return {
        ok: false as const,
        reason: "invalid" as const,
      };
    }

    if (invite.expiresAt <= now) {
      await tx
        .delete(businessMemberInvites)
        .where(eq(businessMemberInvites.id, invite.inviteId));

      return {
        ok: false as const,
        reason: "expired" as const,
      };
    }

    if (normalizeEmailAddress(invite.email) !== normalizedUserEmail) {
      return {
        ok: false as const,
        reason: "email-mismatch" as const,
        invitedEmail: invite.email,
      };
    }

    const [existingMembership] = await tx
      .select({
        role: businessMembers.role,
      })
      .from(businessMembers)
      .where(
        and(
          eq(businessMembers.businessId, invite.businessId),
          eq(businessMembers.userId, userId),
        ),
      )
      .limit(1);

    if (!existingMembership) {
      await tx.insert(businessMembers).values({
        id: createId("bm"),
        businessId: invite.businessId,
        userId,
        role: invite.role,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(activityLogs).values({
        id: createId("act"),
        businessId: invite.businessId,
        inquiryId: null,
        quoteId: null,
        actorUserId: userId,
        type: "business.member_joined",
        summary: `${userName} joined the business as ${invite.role}.`,
        metadata: {
          inviteId: invite.inviteId,
          role: invite.role,
        },
        createdAt: now,
        updatedAt: now,
      });

      if (invite.notifyInAppOnMemberInviteResponse) {
        await insertBusinessNotification(tx, {
          businessId: invite.businessId,
          type: "business_member_invite_accepted",
          title: "Invite accepted",
          summary: `${userName} (${invite.email}) joined as ${invite.role}.`,
          now,
        });
      }
    }

    await tx
      .delete(businessMemberInvites)
      .where(eq(businessMemberInvites.id, invite.inviteId));

    return {
      ok: true as const,
      businessSlug: invite.businessSlug,
      businessId: invite.businessId,
      alreadyMember: Boolean(existingMembership),
      role: (existingMembership?.role ?? invite.role) as BusinessMemberRole,
    };
  });
}

export async function declineBusinessMemberInviteForUser({
  token,
  userEmail,
  userName,
}: {
  token: string;
  userEmail: string;
  userName: string;
}) {
  const normalizedUserEmail = normalizeEmailAddress(userEmail);
  const now = new Date();

  return db.transaction(async (tx) => {
    const [invite] = await tx
      .select({
        inviteId: businessMemberInvites.id,
        businessId: businessMemberInvites.businessId,
        email: businessMemberInvites.email,
        role: businessMemberInvites.role,
        expiresAt: businessMemberInvites.expiresAt,
        notifyInAppOnMemberInviteResponse: businesses.notifyInAppOnMemberInviteResponse,
      })
      .from(businessMemberInvites)
      .innerJoin(businesses, eq(businessMemberInvites.businessId, businesses.id))
      .where(getBusinessMemberInviteLookupCondition(token))
      .limit(1);

    if (!invite) {
      return {
        ok: false as const,
        reason: "invalid" as const,
      };
    }

    if (invite.expiresAt <= now) {
      await tx
        .delete(businessMemberInvites)
        .where(eq(businessMemberInvites.id, invite.inviteId));

      return {
        ok: false as const,
        reason: "expired" as const,
      };
    }

    if (normalizeEmailAddress(invite.email) !== normalizedUserEmail) {
      return {
        ok: false as const,
        reason: "email-mismatch" as const,
        invitedEmail: invite.email,
      };
    }

    if (invite.notifyInAppOnMemberInviteResponse) {
      await insertBusinessNotification(tx, {
        businessId: invite.businessId,
        type: "business_member_invite_declined",
        title: "Invite declined",
        summary: `${userName} (${invite.email}) declined your invite.`,
        now,
      });
    }

    await tx
      .delete(businessMemberInvites)
      .where(eq(businessMemberInvites.id, invite.inviteId));

    return {
      ok: true as const,
      businessId: invite.businessId,
    };
  });
}
