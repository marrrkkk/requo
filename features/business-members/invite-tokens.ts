import "server-only";

import { eq, or } from "drizzle-orm";

import { businessMemberInvites } from "@/lib/db/schema";
import { hashOpaqueToken } from "@/lib/security/tokens";

export function createBusinessMemberInviteToken() {
  const rawToken = `bmit_${crypto.randomUUID().replace(/-/g, "")}`;

  return {
    rawToken,
    tokenHash: hashOpaqueToken(rawToken),
  };
}

export function getBusinessMemberInviteLookupCondition(token: string) {
  return or(
    eq(businessMemberInvites.tokenHash, hashOpaqueToken(token)),
    eq(businessMemberInvites.token, token),
  )!;
}
