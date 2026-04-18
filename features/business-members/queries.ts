import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import type {
  BusinessMemberInviteAcceptanceView,
  BusinessMembersSettingsView,
} from "@/features/business-members/types";
import { getBusinessMemberInviteLookupCondition } from "@/features/business-members/invite-tokens";
import { isBusinessMemberAssignableRole } from "@/lib/business-members";
import {
  getBusinessMembersCacheTags,
  settingsBusinessCacheLife,
} from "@/lib/cache/business-tags";
import { db } from "@/lib/db/client";
import {
  businessMemberInvites,
  businessMembers,
  businesses,
  user,
} from "@/lib/db/schema";

function getMemberRoleSortExpression() {
  return sql`case
    when ${businessMembers.role} = 'owner' then 0
    when ${businessMembers.role} = 'manager' then 1
    else 2
  end`;
}

function getInviteRoleSortExpression() {
  return sql`case
    when ${businessMemberInvites.role} = 'manager' then 0
    else 1
  end`;
}

function hasAssignableInviteRole<T extends { role: unknown }>(
  value: T,
): value is T & { role: "manager" | "staff" } {
  return isBusinessMemberAssignableRole(value.role);
}

export async function getBusinessMembersSettingsForBusiness(
  businessId: string,
  currentUserId: string,
): Promise<BusinessMembersSettingsView | null> {
  "use cache";

  cacheLife(settingsBusinessCacheLife);
  cacheTag(...getBusinessMembersCacheTags(businessId));

  const [businessRow, memberRows, inviteRows] = await Promise.all([
    db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
      })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1),
    db
      .select({
        membershipId: businessMembers.id,
        userId: businessMembers.userId,
        role: businessMembers.role,
        joinedAt: businessMembers.createdAt,
        name: user.name,
        email: user.email,
        image: user.image,
      })
      .from(businessMembers)
      .innerJoin(user, eq(businessMembers.userId, user.id))
      .where(eq(businessMembers.businessId, businessId))
      .orderBy(
        getMemberRoleSortExpression(),
        asc(user.name),
        asc(user.email),
        asc(businessMembers.createdAt),
      ),
    db
      .select({
        inviteId: businessMemberInvites.id,
        inviterUserId: businessMemberInvites.inviterUserId,
        email: businessMemberInvites.email,
        role: businessMemberInvites.role,
        createdAt: businessMemberInvites.createdAt,
        expiresAt: businessMemberInvites.expiresAt,
      })
      .from(businessMemberInvites)
      .where(eq(businessMemberInvites.businessId, businessId))
      .orderBy(
        getInviteRoleSortExpression(),
        desc(businessMemberInvites.createdAt),
      ),
  ]);

  const business = businessRow[0];

  if (!business) {
    return null;
  }

  const inviterIds = Array.from(
    new Set(inviteRows.map((invite) => invite.inviterUserId)),
  );
  const inviterRows = inviterIds.length
    ? await db
        .select({
          id: user.id,
          name: user.name,
        })
        .from(user)
        .where(inArray(user.id, inviterIds))
    : [];
  const inviterNames = new Map(inviterRows.map((row) => [row.id, row.name]));

  return {
    businessId: business.id,
    businessName: business.name,
    businessSlug: business.slug,
    currentUserId,
    members: memberRows.map((member) => ({
      membershipId: member.membershipId,
      userId: member.userId,
      name: member.name,
      email: member.email,
      image: member.image ?? null,
      role: member.role,
      joinedAt: member.joinedAt,
      isCurrentUser: member.userId === currentUserId,
    })),
    invites: inviteRows
      .filter(hasAssignableInviteRole)
      .map((invite) => ({
        inviteId: invite.inviteId,
        email: invite.email,
        role: invite.role,
        inviterName: inviterNames.get(invite.inviterUserId) ?? "Business owner",
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
      })),
  };
}

export async function getBusinessMemberInviteByToken(
  token: string,
  currentUserId?: string | null,
): Promise<BusinessMemberInviteAcceptanceView | null> {
  const [invite] = await db
    .select({
      inviteId: businessMemberInvites.id,
      inviterUserId: businessMemberInvites.inviterUserId,
      email: businessMemberInvites.email,
      role: businessMemberInvites.role,
      expiresAt: businessMemberInvites.expiresAt,
      businessId: businesses.id,
      businessName: businesses.name,
      businessSlug: businesses.slug,
    })
    .from(businessMemberInvites)
    .innerJoin(businesses, eq(businessMemberInvites.businessId, businesses.id))
    .where(getBusinessMemberInviteLookupCondition(token))
    .limit(1);

  if (!invite) {
    return null;
  }

  if (!isBusinessMemberAssignableRole(invite.role)) {
    return null;
  }

  const [[inviter], membership] = await Promise.all([
    db
      .select({
        name: user.name,
        email: user.email,
      })
      .from(user)
      .where(eq(user.id, invite.inviterUserId))
      .limit(1),
    currentUserId
      ? db
          .select({
            role: businessMembers.role,
          })
          .from(businessMembers)
          .where(
            and(
              eq(businessMembers.businessId, invite.businessId),
              eq(businessMembers.userId, currentUserId),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
  ]);

  return {
    inviteId: invite.inviteId,
    token,
    email: invite.email,
    role: invite.role,
    business: {
      id: invite.businessId,
      name: invite.businessName,
      slug: invite.businessSlug,
    },
    inviter: {
      name: inviter?.name ?? "Business owner",
      email: inviter?.email ?? "",
    },
    expiresAt: invite.expiresAt,
    currentMembershipRole: membership[0]?.role ?? null,
  };
}
