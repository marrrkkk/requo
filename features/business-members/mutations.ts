"use server";

import { randomUUID } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  businessMemberInvites,
  businessMembers,
  businesses,
} from "@/lib/db/schema";
import { hashOpaqueToken } from "@/lib/security/tokens";

export async function createBusinessMemberInvite({
  businessId,
  inviterUserId,
  email,
  role,
  token,
  expiresAt,
}: {
  businessId: string;
  inviterUserId: string;
  email: string;
  role: "manager" | "staff";
  token: string;
  expiresAt: Date;
}) {
  const tokenHash = hashOpaqueToken(token);

  await db
    .insert(businessMemberInvites)
    .values({
      id: randomUUID(),
      businessId,
      inviterUserId,
      email,
      role,
      token,
      tokenHash,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: [businessMemberInvites.businessId, businessMemberInvites.email],
      set: {
        inviterUserId,
        role,
        token,
        tokenHash,
        expiresAt,
        updatedAt: new Date(),
      },
    });
}

export async function cancelBusinessMemberInvite({
  businessId,
  inviteId,
}: {
  businessId: string;
  inviteId: string;
}) {
  await db
    .delete(businessMemberInvites)
    .where(
      and(
        eq(businessMemberInvites.businessId, businessId),
        eq(businessMemberInvites.id, inviteId),
      ),
    );
}

export async function acceptBusinessMemberInvite({
  inviteToken,
  userId,
  userEmail,
}: {
  inviteToken: string;
  userId: string;
  userEmail: string;
}): Promise<
  | { ok: true; businessSlug: string }
  | { ok: false; error: string }
> {
  const tokenHash = hashOpaqueToken(inviteToken);

  const rows = await db
    .select({
      inviteId: businessMemberInvites.id,
      businessId: businessMemberInvites.businessId,
      role: businessMemberInvites.role,
      email: businessMemberInvites.email,
      expiresAt: businessMemberInvites.expiresAt,
      businessSlug: businesses.slug,
    })
    .from(businessMemberInvites)
    .innerJoin(businesses, eq(businessMemberInvites.businessId, businesses.id))
    .where(
      and(
        eq(businessMemberInvites.tokenHash, tokenHash),
        gt(businessMemberInvites.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const invite = rows[0];

  if (!invite) {
    return { ok: false, error: "That invite is invalid or expired." };
  }

  if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
    return {
      ok: false,
      error: "This invite was sent to a different email address.",
    };
  }

  // Create membership if it doesn't exist.
  await db
    .insert(businessMembers)
    .values({
      id: randomUUID(),
      businessId: invite.businessId,
      userId,
      role: invite.role,
    })
    .onConflictDoNothing();

  // Consume invite
  await db.delete(businessMemberInvites).where(eq(businessMemberInvites.id, invite.inviteId));

  return { ok: true, businessSlug: invite.businessSlug };
}

export async function updateBusinessMemberRole({
  businessId,
  membershipId,
  role,
}: {
  businessId: string;
  membershipId: string;
  role: "owner" | "manager" | "staff";
}) {
  await db
    .update(businessMembers)
    .set({
      role,
      updatedAt: new Date(),
    })
    .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.id, membershipId)));
}

export async function removeBusinessMember({
  businessId,
  membershipId,
}: {
  businessId: string;
  membershipId: string;
}) {
  await db
    .delete(businessMembers)
    .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.id, membershipId)));
}

