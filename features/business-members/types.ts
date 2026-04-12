import type {
  BusinessMemberAssignableRole,
  BusinessMemberRole,
} from "@/lib/business-members";

export type BusinessMemberView = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: BusinessMemberRole;
  joinedAt: Date;
  isCurrentUser: boolean;
};

export type BusinessMemberInviteView = {
  inviteId: string;
  email: string;
  role: BusinessMemberAssignableRole;
  inviteUrl: string;
  inviterName: string;
  createdAt: Date;
  expiresAt: Date;
};

export type BusinessMembersSettingsView = {
  businessId: string;
  businessName: string;
  businessSlug: string;
  currentUserId: string;
  members: BusinessMemberView[];
  invites: BusinessMemberInviteView[];
};

export type BusinessMemberInviteAcceptanceView = {
  inviteId: string;
  token: string;
  email: string;
  role: BusinessMemberAssignableRole;
  business: {
    id: string;
    name: string;
    slug: string;
  };
  inviter: {
    name: string;
    email: string;
  };
  expiresAt: Date;
  currentMembershipRole: BusinessMemberRole | null;
};

export type BusinessMemberInviteFieldErrors = Partial<
  Record<"email" | "role", string[] | undefined>
>;

export type BusinessMemberRoleFieldErrors = Partial<
  Record<"role", string[] | undefined>
>;

export type BusinessMemberInviteActionState = {
  error?: string;
  success?: string;
  fieldErrors?: BusinessMemberInviteFieldErrors;
};

export type BusinessMemberRoleActionState = {
  error?: string;
  success?: string;
  fieldErrors?: BusinessMemberRoleFieldErrors;
};

export type BusinessMemberRemoveActionState = {
  error?: string;
  success?: string;
};

export type BusinessMemberInviteAcceptActionState = {
  error?: string;
  success?: string;
};
