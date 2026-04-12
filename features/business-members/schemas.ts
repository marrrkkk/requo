import { z } from "zod";

import { businessMemberAssignableRoles } from "@/lib/business-members";

function normalizeEmailAddress(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : value;
}

export const businessMemberInviteSchema = z.object({
  email: z.preprocess(
    normalizeEmailAddress,
    z.email("Enter a valid email address."),
  ),
  role: z.enum(businessMemberAssignableRoles, {
    error: "Choose a member role.",
  }),
});

export const businessMemberRoleUpdateSchema = z.object({
  role: z.enum(businessMemberAssignableRoles, {
    error: "Choose a member role.",
  }),
});

export const businessMemberIdSchema = z.string().trim().min(1);
export const businessMemberInviteIdSchema = z.string().trim().min(1);
export const businessMemberInviteTokenSchema = z.string().trim().min(1).max(512);
